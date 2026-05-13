import { Hono } from "hono";
import Anthropic from "@anthropic-ai/sdk";
import mammoth from "mammoth";
import { createRequire } from "node:module";
import { env, assertAnthropic } from "../lib/env";
import { perHour } from "../lib/rateLimit";
import { preflightBudget, recordUsage, estimateTokens } from "../lib/costGuard";
import { pickColor, type NormalizedAssignment, type NormalizedCourse } from "../lib/normalize";

const require = createRequire(import.meta.url);
let pdfParseImpl: ((buf: Buffer) => Promise<{ text: string }>) | null = null;
function getPdfParse() {
  if (!pdfParseImpl) {
    pdfParseImpl = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
  }
  return pdfParseImpl;
}

export const syllabusRoute = new Hono();

const EXTRACT_TOOL = {
  name: "record_assignments",
  description: "Record every distinct due-date item found in the syllabus.",
  input_schema: {
    type: "object" as const,
    required: ["course", "assignments"],
    properties: {
      course: {
        type: "object",
        required: ["code", "title"],
        properties: {
          code: { type: "string", description: "Course code, e.g. CS 7641. Best guess if not explicit." },
          title: { type: "string", description: "Course title." },
          instructor: { type: "string" },
          term: { type: "string", description: "e.g. Fall 2026" },
        },
      },
      assignments: {
        type: "array",
        items: {
          type: "object",
          required: ["title", "dueDate", "confidence", "syllabusTextMatch"],
          properties: {
            title: { type: "string" },
            dueDate: { type: "string", description: "ISO 8601, or YYYY-MM-DD if time unspecified. Use the current academic term context if year missing." },
            confidence: { type: "string", enum: ["confirmed", "probable", "needs_review"] },
            confidenceReason: { type: "string" },
            syllabusTextMatch: { type: "string", description: "Exact phrase or sentence from syllabus containing the due date." },
            kind: { type: "string", description: "e.g. quiz, exam, reading, problem set, paper" },
          },
        },
      },
    },
  },
};

async function extractText(file: File): Promise<string> {
  const buf = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) {
    const out = await getPdfParse()(buf);
    return out.text;
  }
  if (name.endsWith(".docx")) {
    const out = await mammoth.extractRawText({ buffer: buf });
    return out.value;
  }
  if (name.endsWith(".txt") || name.endsWith(".md")) {
    return buf.toString("utf8");
  }
  throw new Error(`Unsupported file type: ${name}. Use .pdf, .docx, .txt, or .md.`);
}

syllabusRoute.post("/parse", async c => {
  try {
    assertAnthropic();
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
  const ip = c.req.header("x-forwarded-for") ?? "local";
  const rl = perHour("syllabus-parse", ip, env.MAX_SYLLABUS_PARSES_PER_HOUR);
  if (!rl.ok) return c.json({ error: "Rate limited", retryAfterSec: rl.retryAfterSec }, 429);

  const contentLength = Number(c.req.header("content-length") || 0);
  if (contentLength > env.MAX_UPLOAD_BYTES) {
    return c.json({ error: `Upload too large. Max ${env.MAX_UPLOAD_BYTES} bytes.` }, 413);
  }

  const contentType = c.req.header("content-type") || "";
  let text: string;
  let sourceLabel: string;

  if (contentType.includes("application/json")) {
    let body: any;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Could not parse JSON body." }, 400);
    }
    if (typeof body?.text !== "string" || body.text.trim().length === 0) {
      return c.json({ error: "Missing 'text' string in JSON body." }, 400);
    }
    if (body.text.length > env.MAX_UPLOAD_BYTES) {
      return c.json({ error: `Text too large. Max ${env.MAX_UPLOAD_BYTES} chars.` }, 413);
    }
    text = body.text;
    sourceLabel = body.filename || "pasted-text";
  } else {
    let body: Record<string, unknown>;
    try {
      body = await c.req.parseBody();
    } catch {
      return c.json({ error: "Could not parse multipart body." }, 400);
    }
    const file = body.file;
    if (!(file instanceof File)) return c.json({ error: "Missing 'file' field (or send JSON with {text})." }, 400);
    if (file.size > env.MAX_UPLOAD_BYTES) {
      return c.json({ error: `File too large. Max ${env.MAX_UPLOAD_BYTES} bytes.` }, 413);
    }
    try {
      text = await extractText(file);
    } catch (e: any) {
      return c.json({ error: `Text extraction failed: ${e.message}` }, 422);
    }
    sourceLabel = file.name;
  }

  text = text.replace(/\s+\n/g, "\n").replace(/[ \t]{2,}/g, " ").trim();

  const maxChars = env.SYLLABUS_MAX_INPUT_TOKENS * 4;
  let truncated = false;
  if (text.length > maxChars) {
    text = text.slice(0, maxChars);
    truncated = true;
  }
  if (text.length < 80) {
    return c.json({ error: "Extracted text too short. File may be scanned (image-only PDF) or empty." }, 422);
  }

  const estIn = estimateTokens(text.length) + 600;
  const budget = preflightBudget(estIn, 1500);
  if (!budget.ok) return c.json({ error: budget.reason, remainingUsd: budget.remainingUsd }, 402);

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  let toolUse: any;
  let usage: { input_tokens: number; output_tokens: number };
  try {
    const today = new Date().toISOString().slice(0, 10);
    const resp = await client.messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 2000,
      tools: [EXTRACT_TOOL],
      tool_choice: { type: "tool", name: "record_assignments" },
      messages: [
        {
          role: "user",
          content: `Today is ${today}. Below is the full text of a course syllabus. Extract every assignment, quiz, exam, paper, reading, problem set, lab, or other graded item with a due date. Use the record_assignments tool to return them.

Rules:
- One entry per distinct due item. Do not merge.
- If a date appears without a year, infer the academic year from the term/dates context. Default to the nearest future year.
- "confirmed" = explicit date + explicit task. "probable" = date is clear but task is vague. "needs_review" = ambiguous or implied.
- syllabusTextMatch must be a verbatim phrase from the syllabus that contains the due-date evidence.
- Course code: pull from the document. Best guess if implicit.

SYLLABUS:
${text}`,
        },
      ],
    });
    usage = resp.usage;
    toolUse = resp.content.find(b => b.type === "tool_use");
    if (!toolUse) return c.json({ error: "Model did not return structured output." }, 502);
  } catch (e: any) {
    return c.json({ error: `Anthropic call failed: ${e.message || String(e)}` }, 502);
  }

  const cost = recordUsage(usage.input_tokens, usage.output_tokens);

  const parsed = toolUse.input as {
    course: { code: string; title: string; instructor?: string; term?: string };
    assignments: Array<{
      title: string;
      dueDate: string;
      confidence: "confirmed" | "probable" | "needs_review";
      confidenceReason?: string;
      syllabusTextMatch: string;
      kind?: string;
    }>;
  };

  const courseId = `syllabus-${parsed.course.code.replace(/\s+/g, "-").toLowerCase() || Date.now()}`;
  const course: NormalizedCourse = {
    id: courseId,
    code: parsed.course.code || "Syllabus",
    title: parsed.course.title || parsed.course.code || "Course",
    instructor: parsed.course.instructor,
    term: parsed.course.term,
    color: pickColor(parsed.course.code || courseId),
  };

  const assignments: NormalizedAssignment[] = parsed.assignments.map((a, i) => {
    const dueIso = normalizeDate(a.dueDate);
    return {
      id: `${courseId}-a${i}`,
      title: a.title,
      courseId,
      dueAt: dueIso,
      source: "syllabus" as const,
      status: "not_started" as const,
      confidence: a.confidence,
      confidenceReason: a.confidenceReason || `Extracted from syllabus by ${env.ANTHROPIC_MODEL}.`,
      syllabusTextMatch: a.syllabusTextMatch,
    };
  });

  return c.json({
    course,
    assignments,
    meta: {
      model: env.ANTHROPIC_MODEL,
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      callCostUsd: cost.callCostUsd,
      todayCostUsd: cost.todayCostUsd,
      truncated,
      extractedChars: text.length,
      source: sourceLabel,
    },
  });
});

function normalizeDate(s: string): string {
  if (!s) return new Date().toISOString();
  const direct = Date.parse(s);
  if (!Number.isNaN(direct)) return new Date(direct).toISOString();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return new Date(`${s}T23:59:00`).toISOString();
  return new Date().toISOString();
}
