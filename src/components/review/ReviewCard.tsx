import { Check, ExternalLink, FilePenLine, Trash2 } from "lucide-react";
import type { Assignment, DuplicateSuggestion } from "../../types/assignment";
import type { Course } from "../../types/course";
import { sourceLabel } from "../../utils/confidence";
import { formatDueDate } from "../../utils/formatDueDate";
import { CourseSwatch } from "../courses/CourseSwatch";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { ConfidenceBadge } from "../assignments/ConfidenceBadge";
import { SourceBadge } from "../assignments/SourceBadge";
import { MergeSuggestion } from "./MergeSuggestion";

type ReviewCardProps = {
  assignment: Assignment;
  course?: Course;
  allAssignments: Assignment[];
  duplicateSuggestions: DuplicateSuggestion[];
  onApprove: (assignmentId: string) => void;
  onEdit: (assignmentId: string) => void;
  onReject: (assignmentId: string) => void;
  onMerge: (assignmentId: string, duplicateAssignmentId: string) => void;
  onOpenSource: (assignment: Assignment) => void;
};

export function ReviewCard({
  assignment,
  course,
  allAssignments,
  duplicateSuggestions,
  onApprove,
  onEdit,
  onReject,
  onMerge,
  onOpenSource,
}: ReviewCardProps) {
  const matches = duplicateSuggestions.filter(
    (suggestion) =>
      suggestion.assignmentId === assignment.id ||
      suggestion.duplicateAssignmentId === assignment.id,
  );

  return (
    <article className="review-card">
      <div className="review-card__header">
        <CourseSwatch color={course?.color ?? "graphite"} label={course?.code ?? "Course"} />
        <div>
          <p className="eyebrow">{course?.code ?? "Unassigned"}</p>
          <h3>{assignment.title}</h3>
          <p>{course?.name ?? "No course detected"}</p>
        </div>
      </div>

      <div className="review-card__facts">
        <div>
          <span>Extracted due date</span>
          <strong>{formatDueDate(assignment.dueAt)}</strong>
        </div>
        <div>
          <span>Source</span>
          <strong>{sourceLabel(assignment.source)}</strong>
        </div>
        <div>
          <span>Detected course</span>
          <strong>{course?.code ?? "Needs course"}</strong>
        </div>
      </div>

      <div className="review-card__badges">
        <SourceBadge source={assignment.source} />
        <ConfidenceBadge confidence={assignment.confidence} />
        {matches.length > 0 ? <Badge tone="review">Duplicate Candidate</Badge> : null}
      </div>

      <section className="review-card__section" aria-label="Confidence reason">
        <h4>Confidence Reason</h4>
        <p>{assignment.confidenceReason ?? "This import needs student confirmation."}</p>
      </section>

      {assignment.syllabusTextMatch || assignment.sourceHistory[0]?.rawText ? (
        <section className="review-card__section" aria-label="Original source snippet">
          <h4>Original Text</h4>
          <blockquote>
            {assignment.syllabusTextMatch ?? assignment.sourceHistory[0]?.rawText}
          </blockquote>
        </section>
      ) : null}

      {matches.length > 0 ? (
        <section className="review-card__section" aria-label="Possible duplicates">
          <h4>Possible Duplicates</h4>
          <div className="merge-list">
            {matches.map((suggestion) => (
              <MergeSuggestion
                allAssignments={allAssignments}
                assignment={assignment}
                key={suggestion.id}
                onMerge={onMerge}
                suggestion={suggestion}
              />
            ))}
          </div>
        </section>
      ) : null}

      <div className="review-card__actions">
        <Button icon={<Check size={16} />} onClick={() => onApprove(assignment.id)} variant="primary">
          Approve
        </Button>
        <Button icon={<FilePenLine size={16} />} onClick={() => onEdit(assignment.id)}>
          Edit
        </Button>
        <Button
          disabled={!assignment.sourceUrl}
          icon={<ExternalLink size={16} />}
          onClick={() => onOpenSource(assignment)}
        >
          Open Source
        </Button>
        <Button icon={<Trash2 size={16} />} onClick={() => onReject(assignment.id)} variant="danger">
          Reject
        </Button>
      </div>
    </article>
  );
}
