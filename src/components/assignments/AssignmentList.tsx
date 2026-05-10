import { ClipboardList } from "lucide-react";
import type { Assignment, DuplicateSuggestion } from "../../types/assignment";
import type { Course } from "../../types/course";
import { EmptyState } from "../ui/EmptyState";
import { AssignmentRow } from "./AssignmentRow";

type AssignmentListProps = {
  title: string;
  description: string;
  assignments: Assignment[];
  courses: Course[];
  duplicateSuggestions: DuplicateSuggestion[];
  emptyTitle: string;
  emptyDescription: string;
  onComplete: (assignmentId: string) => void;
  onEdit: (assignmentId: string) => void;
  onOpenSource: (assignment: Assignment) => void;
};

export function AssignmentList({
  title,
  description,
  assignments,
  courses,
  duplicateSuggestions,
  emptyTitle,
  emptyDescription,
  onComplete,
  onEdit,
  onOpenSource,
}: AssignmentListProps) {
  const courseById = new Map(courses.map((course) => [course.id, course]));
  const headingId = `${title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}-heading`;

  return (
    <section className="assignment-section" aria-labelledby={headingId}>
      <div className="section-heading">
        <div>
          <h2 id={headingId}>{title}</h2>
          <p>{description}</p>
        </div>
        <span>{assignments.length}</span>
      </div>

      {assignments.length === 0 ? (
        <EmptyState
          description={emptyDescription}
          icon={<ClipboardList size={24} />}
          title={emptyTitle}
        />
      ) : (
        <div className="assignment-list">
          {assignments.map((assignment) => (
            <AssignmentRow
              assignment={assignment}
              course={courseById.get(assignment.courseId)}
              duplicateSuggestion={duplicateSuggestions.find(
                (suggestion) =>
                  suggestion.assignmentId === assignment.id ||
                  suggestion.duplicateAssignmentId === assignment.id,
              )}
              key={assignment.id}
              onComplete={onComplete}
              onEdit={onEdit}
              onOpenSource={onOpenSource}
            />
          ))}
        </div>
      )}
    </section>
  );
}
