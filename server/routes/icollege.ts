import { Hono } from "hono";
import ical from "node-ical";
import { env, assertIcollege } from "../lib/env";
import { perHour } from "../lib/rateLimit";
import { pickColor, deriveStatus, type NormalizedAssignment, type NormalizedCourse } from "../lib/normalize";

export const icollegeRoute = new Hono();

function extractCourseFromLocation(location: string): { code: string; title: string } {
  const cleaned = location
    .replace(/\bSection\s+\w+/i, "")
    .replace(/\b(Spring|Summer|Fall|Winter)\s+Semester\s+\d{4}\b/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  const codeMatch = cleaned.match(/\b([A-Z]{2,5}\s?\d{3,4}[A-Z]?)\b/);
  if (codeMatch) return { code: codeMatch[1].replace(/\s+/g, " ").trim(), title: cleaned };
  return { code: cleaned.slice(0, 24) || "iCollege", title: cleaned || "iCollege" };
}

icollegeRoute.get("/sync", async c => {
  try {
    assertIcollege();
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
  const ip = c.req.header("x-forwarded-for") ?? "local";
  const rl = perHour("icollege-sync", ip, env.MAX_ICOLLEGE_SYNC_PER_HOUR);
  if (!rl.ok) return c.json({ error: "Rate limited", retryAfterSec: rl.retryAfterSec }, 429);

  try {
    const url = env.ICOLLEGE_ICS_URL.replace(/^webcal:/, "https:");
    const res = await fetch(url);
    if (!res.ok) return c.json({ error: `iCollege fetch ${res.status}` }, 502);
    const text = await res.text();
    if (text.length > 5 * 1024 * 1024) return c.json({ error: "ICS feed too large" }, 502);

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
      const location: string = (ev.location as string) || "";
      const { code, title: courseTitle } = extractCourseFromLocation(location);
      const courseId = `icollege-${code.replace(/\s+/g, "-").toLowerCase() || "unknown"}`;
      if (!courseMap.has(courseId)) {
        courseMap.set(courseId, {
          id: courseId,
          code,
          title: courseTitle,
          color: pickColor(code),
        });
      }

      const lowConfidence = /^Review this page/i.test(summary) || /Course Update/i.test(ev.description || "");

      assignments.push({
        id: `icollege-${ev.uid || key}`,
        title: summary.replace(/\s*-\s*Due$/i, "").trim() || summary,
        courseId,
        dueAt,
        source: "brightspace",
        status: deriveStatus(dueAt),
        confidence: lowConfidence ? "probable" : "confirmed",
        confidenceReason: lowConfidence
          ? "iCollege calendar item flagged as a course-admin/housekeeping checklist, not a graded task."
          : "iCollege/Brightspace calendar feed (read-only ICS).",
        notes: (ev.description as string) || undefined,
      });
    }

    return c.json({
      courses: Array.from(courseMap.values()),
      assignments,
      fetchedAt: new Date().toISOString(),
    });
  } catch (e: any) {
    return c.json({ error: e.message || String(e) }, 502);
  }
});
