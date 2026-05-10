export type AssignmentConfidence = "confirmed" | "probable" | "needs_review";

export type AssignmentStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "overdue";

export type AssignmentSource =
  | "canvas"
  | "brightspace"
  | "mcgraw_hill"
  | "syllabus"
  | "browser_helper"
  | "manual";

export type SourceHistoryItem = {
  id: string;
  source: AssignmentSource;
  label: string;
  capturedAt: string;
  rawText?: string;
  url?: string;
};

export type Reminder = {
  id: string;
  offsetMinutes: number;
  channel: "email" | "push" | "calendar";
  enabled: boolean;
};

export type Assignment = {
  id: string;
  title: string;
  courseId: string;
  dueAt: string;
  source: AssignmentSource;
  sourceUrl?: string;
  status: AssignmentStatus;
  confidence: AssignmentConfidence;
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
  duplicateOf?: string;
  sourceHistory: SourceHistoryItem[];
  reminders: Reminder[];
  notes?: string;
  confidenceReason?: string;
  lmsId?: string;
  syllabusTextMatch?: string;
};

export type DuplicateSuggestion = {
  id: string;
  assignmentId: string;
  duplicateAssignmentId: string;
  score: number;
  reasons: string[];
};

export type AssignmentDraft = Pick<Assignment, "title" | "courseId" | "dueAt"> &
  Partial<
    Pick<
      Assignment,
      | "source"
      | "sourceUrl"
      | "status"
      | "confidence"
      | "notes"
      | "confidenceReason"
      | "lmsId"
      | "syllabusTextMatch"
    >
  >;
