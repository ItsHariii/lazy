export type NormalizedAssignment = {
  id: string;
  title: string;
  courseId: string;
  dueAt: string;
  source: "canvas" | "brightspace" | "syllabus" | "manual" | "mcgraw_hill" | "browser_helper";
  status: "not_started" | "in_progress" | "overdue" | "completed";
  confidence: "confirmed" | "probable" | "needs_review";
  confidenceReason?: string;
  sourceUrl?: string;
  syllabusTextMatch?: string;
  notes?: string;
};

export type NormalizedCourse = {
  id: string;
  code: string;
  title: string;
  instructor?: string;
  color: string;
  term?: string;
};

const COURSE_COLORS = ["cobalt", "brick", "forest", "teal", "plum", "gold", "graphite"];

export function pickColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return COURSE_COLORS[h % COURSE_COLORS.length];
}

export function deriveStatus(dueAt: string | undefined): NormalizedAssignment["status"] {
  if (!dueAt) return "not_started";
  const due = new Date(dueAt).getTime();
  if (Number.isNaN(due)) return "not_started";
  return due < Date.now() ? "overdue" : "not_started";
}
