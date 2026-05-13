import { Hono } from "hono";
import ical from "node-ical";
import { env, assertCanvas } from "../lib/env.js";
import { perHour } from "../lib/rateLimit.js";
import { pickColor, deriveStatus, type NormalizedAssignment, type NormalizedCourse } from "../lib/normalize.js";

export const canvasRoute = new Hono();

type CanvasCourse = { id: number; name: string; course_code: string; enrollment_term_id?: number };
type CanvasAssignment = {
  id: number;
  name: string;
  due_at: string | null;
  course_id: number;
  html_url: string;
  has_submitted_submissions?: boolean;
  submission?: { workflow_state?: string };
};

async function canvasFetch(path: string): Promise<Response> {
  const url = `${env.CANVAS_BASE_URL.replace(/\/$/, "")}${path}`;
  return fetch(url, {
    headers: { Authorization: `Bearer ${env.CANVAS_PAT}`, Accept: "application/json" },
  });
}

async function paginated<T>(path: string, max = 5): Promise<T[]> {
  const out: T[] = [];
  let next: string | null = path;
  let pages = 0;
  while (next && pages < max) {
    const res: Response = await canvasFetch(next);
    if (!res.ok) throw new Error(`Canvas ${res.status} on ${next}: ${await res.text()}`);
    const batch = (await res.json()) as T[];
    out.push(...batch);
    const link = res.headers.get("Link") || "";
    const match = link.split(",").find(s => s.includes('rel="next"'));
    next = match ? (match.match(/<([^>]+)>/)?.[1]?.replace(env.CANVAS_BASE_URL.replace(/\/$/, ""), "") ?? null) : null;
    pages++;
  }
  return out;
}

function extractCourseFromSummary(summary: string): { titleClean: string; code: string; courseTitle: string } {
  // Canvas ICS summary: "Assignment Title [COURSE_CODE]" or "... (COURSE_CODE)"
  const bracket = summary.match(/^(.*?)\s*[\[\(]([^\]\)]+)[\]\)]\s*$/);
  if (bracket) {
    const titleClean = bracket[1].trim();
    const tag = bracket[2].trim();
    const codeMatch = tag.match(/\b([A-Z]{2,5}\s?\d{3,4}[A-Z]?)\b/);
    const code = codeMatch ? codeMatch[1].replace(/\s+/g, " ") : tag.slice(0, 24);
    return { titleClean, code, courseTitle: tag };
  }
  return { titleClean: summary.trim(), code: "Canvas", courseTitle: "Canvas" };
}

async function syncViaIcs() {
  const url = env.CANVAS_ICS_URL.replace(/^webcal:/, "https:");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Canvas ICS fetch ${res.status}`);
  const text = await res.text();
  if (text.length > 5 * 1024 * 1024) throw new Error("Canvas ICS feed too large");

  const parsed = ical.sync.parseICS(text);
  const courseMap = new Map<string, NormalizedCourse>();
  const assignments: NormalizedAssignment[] = [];
  const cutoffMs = Date.now() - 30 * 86400000;

  for (const key of Object.keys(parsed)) {
    const ev = parsed[key] as any;
    if (!ev || ev.type !== "VEVENT") continue;

    const endIso = ev.end instanceof Date ? ev.end.toISOString() : undefined;
    const startIso = ev.start instanceof Date ? ev.start.toISOString() : undefined;
    const dueAt = endIso || startIso || new Date().toISOString();
    const dueMs = Date.parse(dueAt);
    if (Number.isFinite(dueMs) && dueMs < cutoffMs) continue;

    const summary: string = (ev.summary as string) || "(Untitled)";
    const { titleClean, code, courseTitle } = extractCourseFromSummary(summary);
    const courseId = `canvas-${code.replace(/\s+/g, "-").toLowerCase() || "unknown"}`;
    if (!courseMap.has(courseId)) {
      courseMap.set(courseId, { id: courseId, code, title: courseTitle, color: pickColor(code) });
    }

    const sourceUrl = typeof ev.url === "string" ? ev.url : undefined;

    assignments.push({
      id: `canvas-${ev.uid || key}`,
      title: titleClean || summary,
      courseId,
      dueAt,
      source: "canvas",
      status: deriveStatus(dueAt),
      confidence: "confirmed",
      confidenceReason: "Canvas calendar feed (read-only ICS).",
      sourceUrl,
      notes: (ev.description as string) || undefined,
    });
  }

  return { courses: Array.from(courseMap.values()), assignments };
}

async function syncViaPat() {
  const rawCourses = await paginated<CanvasCourse>("/api/v1/courses?enrollment_state=active&per_page=50");
  const courses: NormalizedCourse[] = rawCourses.map(rc => ({
    id: `canvas-${rc.id}`,
    code: rc.course_code || rc.name.slice(0, 12),
    title: rc.name,
    color: pickColor(rc.course_code || String(rc.id)),
  }));

  const assignments: NormalizedAssignment[] = [];
  for (const rc of rawCourses) {
    try {
      const rawAssigns = await paginated<CanvasAssignment>(
        `/api/v1/courses/${rc.id}/assignments?per_page=50&order_by=due_at&include[]=submission`,
        3,
      );
      for (const ra of rawAssigns) {
        const submitted = ra.submission?.workflow_state === "submitted" || ra.submission?.workflow_state === "graded";
        assignments.push({
          id: `canvas-${ra.id}`,
          title: ra.name,
          courseId: `canvas-${rc.id}`,
          dueAt: ra.due_at || new Date(Date.now() + 7 * 86400000).toISOString(),
          source: "canvas",
          status: submitted ? "completed" : deriveStatus(ra.due_at ?? undefined),
          confidence: "confirmed",
          confidenceReason: "Official Canvas assignment via personal access token.",
          sourceUrl: ra.html_url,
        });
      }
    } catch (e) {
      console.warn(`Canvas assignments fetch failed for course ${rc.id}:`, e);
    }
  }
  return { courses, assignments };
}

canvasRoute.get("/sync", async c => {
  try {
    assertCanvas();
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
  const ip = c.req.header("x-forwarded-for") ?? "local";
  const rl = perHour("canvas-sync", ip, env.MAX_CANVAS_SYNC_PER_HOUR);
  if (!rl.ok) return c.json({ error: "Rate limited", retryAfterSec: rl.retryAfterSec }, 429);

  try {
    const { courses, assignments } = env.CANVAS_ICS_URL ? await syncViaIcs() : await syncViaPat();
    return c.json({ courses, assignments, fetchedAt: new Date().toISOString() });
  } catch (e: any) {
    return c.json({ error: e.message || String(e) }, 502);
  }
});
