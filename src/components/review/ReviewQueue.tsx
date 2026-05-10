import { ShieldCheck } from "lucide-react";
import type { Assignment, DuplicateSuggestion } from "../../types/assignment";
import type { Course } from "../../types/course";
import { EmptyState } from "../ui/EmptyState";
import { ReviewCard } from "./ReviewCard";

type ReviewQueueProps = {
  assignments: Assignment[];
  courses: Course[];
  duplicateSuggestions: DuplicateSuggestion[];
  onApprove: (assignmentId: string) => void;
  onEdit: (assignmentId: string) => void;
  onReject: (assignmentId: string) => void;
  onMerge: (assignmentId: string, duplicateAssignmentId: string) => void;
  onOpenSource: (assignment: Assignment) => void;
  onUploadSyllabus: () => void;
};

export function ReviewQueue({
  assignments,
  courses,
  duplicateSuggestions,
  onApprove,
  onEdit,
  onReject,
  onMerge,
  onOpenSource,
  onUploadSyllabus,
}: ReviewQueueProps) {
  const courseById = new Map(courses.map((course) => [course.id, course]));
  const reviewItems = assignments.filter(
    (assignment) =>
      assignment.confidence === "needs_review" ||
      (assignment.confidence === "probable" &&
        (assignment.source === "syllabus" || assignment.source === "browser_helper")),
  );

  return (
    <section className="review-queue" aria-labelledby="review-heading">
      <div className="page-section-heading">
        <div>
          <p className="eyebrow">Review Queue</p>
          <h2 id="review-heading">Confirm uncertain imported work</h2>
          <p>
            Syllabus and browser-helper imports stay here until a student approves,
            edits, merges, or rejects them.
          </p>
        </div>
      </div>

      {reviewItems.length === 0 ? (
        <EmptyState
          actionLabel="Upload Syllabus"
          description="New uncertain tasks from syllabi and browser-helper scans will appear here."
          icon={<ShieldCheck size={26} />}
          onAction={onUploadSyllabus}
          title="No review items"
        />
      ) : (
        <div className="review-grid">
          {reviewItems.map((assignment) => (
            <ReviewCard
              allAssignments={assignments}
              assignment={assignment}
              course={courseById.get(assignment.courseId)}
              duplicateSuggestions={duplicateSuggestions}
              key={assignment.id}
              onApprove={onApprove}
              onEdit={onEdit}
              onMerge={onMerge}
              onOpenSource={onOpenSource}
              onReject={onReject}
            />
          ))}
        </div>
      )}
    </section>
  );
}
