import {
  Check,
  Clock3,
  ExternalLink,
  FilePenLine,
  GitMerge,
  RotateCcw,
} from "lucide-react";
import type { Assignment, DuplicateSuggestion } from "../../types/assignment";
import type { Course } from "../../types/course";
import {
  formatDueDate,
  formatRelativeSync,
  getDaysUntil,
  isOverdue,
} from "../../utils/formatDueDate";
import { statusLabel } from "../../utils/confidence";
import { CourseSwatch } from "../courses/CourseSwatch";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { IconButton } from "../ui/IconButton";
import { Menu } from "../ui/Menu";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { SourceBadge } from "./SourceBadge";

type AssignmentRowProps = {
  assignment: Assignment;
  course?: Course;
  duplicateSuggestion?: DuplicateSuggestion;
  onComplete: (assignmentId: string) => void;
  onEdit: (assignmentId: string) => void;
  onOpenSource: (assignment: Assignment) => void;
};

export function AssignmentRow({
  assignment,
  course,
  duplicateSuggestion,
  onComplete,
  onEdit,
  onOpenSource,
}: AssignmentRowProps) {
  const overdue = isOverdue(assignment);
  const statusTone =
    assignment.status === "completed"
      ? "success"
      : overdue || assignment.status === "overdue"
        ? "danger"
        : assignment.status === "in_progress"
          ? "info"
          : "neutral";
  const dueDate = new Date(assignment.dueAt);
  const dueDay = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(dueDate);
  const dueTime = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(dueDate);
  const daysUntil = getDaysUntil(assignment.dueAt);
  const urgencyLabel =
    assignment.status === "completed"
      ? "Completed"
      : overdue
        ? "Past due"
        : daysUntil === 0
          ? "Due today"
          : daysUntil === 1
            ? "Tomorrow"
          : `In ${daysUntil} days`;
  const provenance = assignment.lastSyncedAt
    ? `Synced ${formatRelativeSync(assignment.lastSyncedAt)}`
    : `Created ${formatRelativeSync(assignment.createdAt)}`;

  return (
    <article className="assignment-row" tabIndex={0}>
      <div className="assignment-row__leading">
        <CourseSwatch color={course?.color ?? "graphite"} label={course?.code ?? "Unknown"} />
      </div>
      <div className="assignment-row__body">
        <div className="assignment-row__title-line">
          <h3>{assignment.title}</h3>
          {duplicateSuggestion ? (
            <Badge icon={<GitMerge aria-hidden="true" size={14} />} tone="review">
              Possible Duplicate
            </Badge>
          ) : null}
        </div>
        <div className="assignment-row__meta">
          <span>{course ? `${course.code} - ${course.name}` : "Unassigned course"}</span>
          <span>{provenance}</span>
        </div>
        <div className="assignment-row__badges">
          <SourceBadge source={assignment.source} />
          <ConfidenceBadge confidence={assignment.confidence} />
          <Badge tone={statusTone}>{overdue ? "Overdue" : statusLabel(assignment.status)}</Badge>
        </div>
      </div>
      <div className="assignment-row__due" aria-label={`Due ${formatDueDate(assignment.dueAt)}`}>
        <span>
          <Clock3 aria-hidden="true" size={14} />
          {urgencyLabel}
        </span>
        <strong>{dueDay}</strong>
        <em>{dueTime}</em>
      </div>
      <div className="assignment-row__actions" aria-label={`Actions for ${assignment.title}`}>
        <Button
          icon={assignment.status === "completed" ? <RotateCcw size={16} /> : <Check size={16} />}
          onClick={() => onComplete(assignment.id)}
          size="sm"
          variant={assignment.status === "completed" ? "ghost" : "secondary"}
        >
          {assignment.status === "completed" ? "Reopen" : "Complete"}
        </Button>
        <IconButton
          icon={<FilePenLine size={17} />}
          label={`Edit ${assignment.title}`}
          onClick={() => onEdit(assignment.id)}
        />
        <IconButton
          disabled={!assignment.sourceUrl}
          icon={<ExternalLink size={17} />}
          label={`Open source for ${assignment.title}`}
          onClick={() => onOpenSource(assignment)}
        />
        <Menu
          items={[
            {
              label: "Open Detail",
              icon: <FilePenLine aria-hidden="true" size={15} />,
              onSelect: () => onEdit(assignment.id),
            },
            {
              label:
                assignment.status === "completed"
                  ? "Mark Not Started"
                  : "Mark Complete",
              icon: <Check aria-hidden="true" size={15} />,
              onSelect: () => onComplete(assignment.id),
            },
          ]}
          label={`More actions for ${assignment.title}`}
        />
      </div>
    </article>
  );
}
