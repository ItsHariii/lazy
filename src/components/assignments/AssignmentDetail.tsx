import { CalendarClock, GitMerge, History, Link2, NotebookText } from "lucide-react";
import { useMemo, useState } from "react";
import type {
  Assignment,
  AssignmentConfidence,
  AssignmentStatus,
  DuplicateSuggestion,
} from "../../types/assignment";
import type { Course } from "../../types/course";
import {
  confidenceLabel,
  sourceLabel,
  statusLabel,
} from "../../utils/confidence";
import { formatDueDate, formatRelativeSync } from "../../utils/formatDueDate";
import { CourseSwatch } from "../courses/CourseSwatch";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Input, TextArea } from "../ui/Input";
import { Select } from "../ui/Select";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { SourceBadge } from "./SourceBadge";

type AssignmentDetailProps = {
  assignment: Assignment;
  course?: Course;
  allAssignments: Assignment[];
  duplicateSuggestions: DuplicateSuggestion[];
  onUpdate: (assignment: Assignment) => void;
  onClose: () => void;
  onMergeDuplicate: (assignmentId: string, duplicateAssignmentId: string) => void;
};

export function AssignmentDetail({
  assignment,
  course,
  allAssignments,
  duplicateSuggestions,
  onUpdate,
  onClose,
  onMergeDuplicate,
}: AssignmentDetailProps) {
  const [draft, setDraft] = useState(assignment);
  const matchingDuplicates = useMemo(
    () =>
      duplicateSuggestions.filter(
        (suggestion) =>
          suggestion.assignmentId === assignment.id ||
          suggestion.duplicateAssignmentId === assignment.id,
      ),
    [assignment.id, duplicateSuggestions],
  );

  function getOtherAssignment(suggestion: DuplicateSuggestion) {
    const otherId =
      suggestion.assignmentId === assignment.id
        ? suggestion.duplicateAssignmentId
        : suggestion.assignmentId;
    return allAssignments.find((candidate) => candidate.id === otherId);
  }

  return (
    <div className="assignment-detail">
      <div className="assignment-detail__summary">
        <CourseSwatch color={course?.color ?? "graphite"} label={course?.code ?? "Course"} />
        <div>
          <p className="eyebrow">{course?.code ?? "Course"}</p>
          <h2>{assignment.title}</h2>
          <p>{course?.name ?? "Unassigned course"}</p>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-item">
          <CalendarClock aria-hidden="true" size={18} />
          <div>
            <span>Due date</span>
            <strong>{formatDueDate(assignment.dueAt, "long")}</strong>
          </div>
        </div>
        <div className="detail-item">
          <Link2 aria-hidden="true" size={18} />
          <div>
            <span>Source</span>
            <strong>{sourceLabel(assignment.source)}</strong>
          </div>
        </div>
        <div className="detail-item">
          <History aria-hidden="true" size={18} />
          <div>
            <span>Last synced</span>
            <strong>{formatRelativeSync(assignment.lastSyncedAt)}</strong>
          </div>
        </div>
      </div>

      <div className="assignment-detail__badges">
        <SourceBadge source={assignment.source} />
        <ConfidenceBadge confidence={assignment.confidence} />
        <Badge tone={assignment.status === "completed" ? "success" : "neutral"}>
          {statusLabel(assignment.status)}
        </Badge>
      </div>

      <section className="detail-section" aria-labelledby="trust-heading">
        <h3 id="trust-heading">Why This Assignment Is Trusted</h3>
        <p>
          {assignment.confidenceReason ??
            "This item has enough metadata to be shown on the dashboard."}
        </p>
        {assignment.sourceUrl ? (
          <a className="detail-link" href={assignment.sourceUrl} rel="noreferrer" target="_blank">
            Open original source
          </a>
        ) : null}
      </section>

      <section className="detail-section" aria-labelledby="manual-edits-heading">
        <h3 id="manual-edits-heading">Manual Edits</h3>
        <div className="form-grid">
          <Input
            label="Title"
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            value={draft.title}
          />
          <Input
            label="Due date and time"
            onChange={(event) => setDraft({ ...draft, dueAt: event.target.value })}
            type="datetime-local"
            value={draft.dueAt.slice(0, 16)}
          />
          <Select
            label="Status"
            onChange={(event) =>
              setDraft({
                ...draft,
                status: event.target.value as AssignmentStatus,
              })
            }
            options={[
              { label: "Not Started", value: "not_started" },
              { label: "In Progress", value: "in_progress" },
              { label: "Completed", value: "completed" },
              { label: "Overdue", value: "overdue" },
            ]}
            value={draft.status}
          />
          <Select
            label="Confidence"
            onChange={(event) =>
              setDraft({
                ...draft,
                confidence: event.target.value as AssignmentConfidence,
              })
            }
            options={[
              { label: confidenceLabel("confirmed"), value: "confirmed" },
              { label: confidenceLabel("probable"), value: "probable" },
              { label: confidenceLabel("needs_review"), value: "needs_review" },
            ]}
            value={draft.confidence}
          />
        </div>
        <TextArea
          label="Notes"
          onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
          rows={3}
          value={draft.notes ?? ""}
        />
        <div className="detail-actions">
          <Button onClick={onClose} variant="ghost">
            Close
          </Button>
          <Button
            onClick={() =>
              onUpdate({
                ...draft,
                updatedAt: new Date().toISOString(),
              })
            }
            variant="primary"
          >
            Save Changes
          </Button>
        </div>
      </section>

      <section className="detail-section" aria-labelledby="duplicates-heading">
        <h3 id="duplicates-heading">Duplicate Matches</h3>
        {matchingDuplicates.length === 0 ? (
          <p>No duplicate matches are currently detected.</p>
        ) : (
          <div className="duplicate-list">
            {matchingDuplicates.map((suggestion) => {
              const other = getOtherAssignment(suggestion);
              return (
                <div className="duplicate-list__item" key={suggestion.id}>
                  <GitMerge aria-hidden="true" size={18} />
                  <div>
                    <strong>{other?.title ?? "Unknown assignment"}</strong>
                    <span>
                      {suggestion.score}% match based on {suggestion.reasons.join(", ")}
                    </span>
                  </div>
                  {other ? (
                    <Button
                      onClick={() => onMergeDuplicate(assignment.id, other.id)}
                      size="sm"
                      variant="secondary"
                    >
                      Merge
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="detail-section" aria-labelledby="reminders-heading">
        <h3 id="reminders-heading">Reminders</h3>
        <div className="reminder-list">
          {assignment.reminders.map((reminder) => (
            <div className="reminder-list__item" key={reminder.id}>
              <NotebookText aria-hidden="true" size={17} />
              <span>
                {reminder.channel} reminder {reminder.offsetMinutes / 60} hours before due time
              </span>
              <Badge tone={reminder.enabled ? "success" : "neutral"}>
                {reminder.enabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>
          ))}
        </div>
      </section>

      <section className="detail-section" aria-labelledby="history-heading">
        <h3 id="history-heading">Source History</h3>
        <ol className="source-history">
          {assignment.sourceHistory.map((historyItem) => (
            <li key={historyItem.id}>
              <strong>{historyItem.label}</strong>
              <span>
                {sourceLabel(historyItem.source)} - {formatRelativeSync(historyItem.capturedAt)}
              </span>
              {historyItem.rawText ? <p>{historyItem.rawText}</p> : null}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
