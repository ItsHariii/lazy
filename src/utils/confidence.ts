import type {
  AssignmentConfidence,
  AssignmentSource,
  AssignmentStatus,
} from "../types/assignment";
import type { SourceConnectionStatus } from "../types/source";

export function confidenceLabel(confidence: AssignmentConfidence) {
  const labels: Record<AssignmentConfidence, string> = {
    confirmed: "Confirmed",
    probable: "Probable",
    needs_review: "Needs Review",
  };

  return labels[confidence];
}

export function statusLabel(status: AssignmentStatus) {
  const labels: Record<AssignmentStatus, string> = {
    not_started: "Not Started",
    in_progress: "In Progress",
    completed: "Completed",
    overdue: "Overdue",
  };

  return labels[status];
}

export function sourceLabel(source: AssignmentSource) {
  const labels: Record<AssignmentSource, string> = {
    canvas: "Canvas",
    brightspace: "Brightspace",
    mcgraw_hill: "McGraw Hill",
    syllabus: "Syllabus",
    browser_helper: "Browser Helper",
    manual: "Manual",
  };

  return labels[source];
}

export function sourceStatusLabel(status: SourceConnectionStatus) {
  const labels: Record<SourceConnectionStatus, string> = {
    connected: "Connected",
    syncing: "Syncing",
    error: "Needs Attention",
    disabled: "Disabled",
  };

  return labels[status];
}
