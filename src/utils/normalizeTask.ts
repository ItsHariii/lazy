import type { Assignment, AssignmentDraft } from "../types/assignment";

export function normalizeTask(draft: AssignmentDraft): Assignment {
  const now = new Date().toISOString();
  const source = draft.source ?? "manual";
  const confidence = draft.confidence ?? "confirmed";

  return {
    id: `asgn-${source}-${crypto.randomUUID()}`,
    title: draft.title.trim(),
    courseId: draft.courseId,
    dueAt: draft.dueAt,
    source,
    sourceUrl: draft.sourceUrl,
    status: draft.status ?? "not_started",
    confidence,
    createdAt: now,
    updatedAt: now,
    sourceHistory: [
      {
        id: `hist-${crypto.randomUUID()}`,
        source,
        label:
          source === "manual"
            ? "Manual entry"
            : "Imported task normalized for review",
        capturedAt: now,
        rawText: draft.syllabusTextMatch,
        url: draft.sourceUrl,
      },
    ],
    reminders: [
      {
        id: `reminder-${crypto.randomUUID()}`,
        offsetMinutes: 1440,
        channel: "email",
        enabled: true,
      },
      {
        id: `reminder-${crypto.randomUUID()}`,
        offsetMinutes: 120,
        channel: "push",
        enabled: true,
      },
    ],
    notes: draft.notes,
    confidenceReason: draft.confidenceReason,
    lmsId: draft.lmsId,
    syllabusTextMatch: draft.syllabusTextMatch,
  };
}
