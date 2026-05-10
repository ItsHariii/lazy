import { BookOpen, FileText, GraduationCap, HeartPulse } from "lucide-react";
import type { Assignment, DuplicateSuggestion } from "../../types/assignment";
import type { Course } from "../../types/course";
import type { SourceConnection } from "../../types/source";
import { sourceStatusLabel } from "../../utils/confidence";
import { sortByDueDate } from "../../utils/formatDueDate";
import { AssignmentRow } from "../assignments/AssignmentRow";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { EmptyState } from "../ui/EmptyState";
import { CourseSwatch } from "./CourseSwatch";

type CoursePageProps = {
  course: Course;
  assignments: Assignment[];
  sources: SourceConnection[];
  duplicateSuggestions: DuplicateSuggestion[];
  onBack: () => void;
  onComplete: (assignmentId: string) => void;
  onEdit: (assignmentId: string) => void;
  onOpenSource: (assignment: Assignment) => void;
};

export function CoursePage({
  course,
  assignments,
  sources,
  duplicateSuggestions,
  onBack,
  onComplete,
  onEdit,
  onOpenSource,
}: CoursePageProps) {
  const courseAssignments = sortByDueDate(
    assignments.filter((assignment) => assignment.courseId === course.id),
  );
  const upcoming = courseAssignments.filter(
    (assignment) => assignment.status !== "completed",
  );
  const completed = courseAssignments.filter(
    (assignment) => assignment.status === "completed",
  );
  const source = sources.find((candidate) => candidate.type === course.platform);

  return (
    <section className="course-page" aria-labelledby="course-heading">
      <Button onClick={onBack} variant="ghost">
        Back to Courses
      </Button>

      <div className="course-hero">
        <CourseSwatch color={course.color} label={course.code} />
        <div>
          <p className="eyebrow">{course.code}</p>
          <h2 id="course-heading">{course.name}</h2>
          <p>{course.instructor ?? "Instructor not listed"}</p>
        </div>
      </div>

      <div className="course-page__overview">
        <Card className="course-fact">
          <GraduationCap aria-hidden="true" size={20} />
          <div>
            <span>Connected platform</span>
            <strong>{course.platform ?? "Manual"}</strong>
          </div>
        </Card>
        <Card className="course-fact">
          <FileText aria-hidden="true" size={20} />
          <div>
            <span>Syllabus file</span>
            <strong>{course.syllabusFile ?? "No syllabus uploaded"}</strong>
          </div>
        </Card>
        <Card className="course-fact">
          <HeartPulse aria-hidden="true" size={20} />
          <div>
            <span>Source health</span>
            <strong>{source ? sourceStatusLabel(source.status) : "Manual only"}</strong>
          </div>
        </Card>
      </div>

      <section className="course-notes" aria-labelledby="grading-notes-heading">
        <h3 id="grading-notes-heading">Grading Notes</h3>
        <p>{course.gradingNotes ?? "No grading notes have been added for this course."}</p>
        <div className="course-notes__badges">
          <Badge tone="neutral">{upcoming.length} upcoming</Badge>
          <Badge tone="success">{completed.length} completed</Badge>
          <Badge tone={source?.status === "connected" ? "success" : "info"}>
            {source ? sourceStatusLabel(source.status) : "Manual"}
          </Badge>
        </div>
      </section>

      <section className="assignment-section" aria-labelledby="course-upcoming-heading">
        <div className="section-heading">
          <div>
            <h3 id="course-upcoming-heading">Upcoming Assignments</h3>
            <p>Active work for this course.</p>
          </div>
          <span>{upcoming.length}</span>
        </div>
        {upcoming.length === 0 ? (
          <EmptyState
            description="Completed or future imported assignments will appear here."
            icon={<BookOpen size={24} />}
            title="No upcoming assignments"
          />
        ) : (
          <div className="assignment-list">
            {upcoming.map((assignment) => (
              <AssignmentRow
                assignment={assignment}
                course={course}
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

      <section className="assignment-section" aria-labelledby="course-completed-heading">
        <div className="section-heading">
          <div>
            <h3 id="course-completed-heading">Completed Assignments</h3>
            <p>Recently finished work stays visible for context.</p>
          </div>
          <span>{completed.length}</span>
        </div>
        {completed.length === 0 ? (
          <EmptyState
            description="Assignments you mark complete will move into this section."
            icon={<BookOpen size={24} />}
            title="No completed assignments"
          />
        ) : (
          <div className="assignment-list">
            {completed.map((assignment) => (
              <AssignmentRow
                assignment={assignment}
                course={course}
                key={assignment.id}
                onComplete={onComplete}
                onEdit={onEdit}
                onOpenSource={onOpenSource}
              />
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
