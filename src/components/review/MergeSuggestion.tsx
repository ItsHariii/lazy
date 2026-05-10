import { GitMerge } from "lucide-react";
import type { Assignment, DuplicateSuggestion } from "../../types/assignment";
import { formatDueDate } from "../../utils/formatDueDate";
import { Button } from "../ui/Button";

type MergeSuggestionProps = {
  assignment: Assignment;
  suggestion: DuplicateSuggestion;
  allAssignments: Assignment[];
  onMerge: (assignmentId: string, duplicateAssignmentId: string) => void;
};

export function MergeSuggestion({
  assignment,
  suggestion,
  allAssignments,
  onMerge,
}: MergeSuggestionProps) {
  const otherId =
    suggestion.assignmentId === assignment.id
      ? suggestion.duplicateAssignmentId
      : suggestion.assignmentId;
  const other = allAssignments.find((candidate) => candidate.id === otherId);

  if (!other) {
    return null;
  }

  return (
    <div className="merge-suggestion">
      <GitMerge aria-hidden="true" size={18} />
      <div>
        <strong>{other.title}</strong>
        <span>
          {suggestion.score}% match - {formatDueDate(other.dueAt)}
        </span>
        <p>{suggestion.reasons.join(", ")}</p>
      </div>
      <Button
        onClick={() => onMerge(assignment.id, other.id)}
        size="sm"
        variant="secondary"
      >
        Merge
      </Button>
    </div>
  );
}
