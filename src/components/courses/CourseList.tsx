import { BookOpen, ChevronRight, ClipboardList } from "lucide-react";
import type { Assignment } from "../../types/assignment";
import type { Course } from "../../types/course";
import type { SourceConnection } from "../../types/source";
import { sourceStatusLabel } from "../../utils/confidence";
import { isOverdue } from "../../utils/formatDueDate";
import { Badge } from "../ui/Badge";
import { Card } from "../ui/Card";
import { EmptyState } from "../ui/EmptyState";
import { CourseSwatch } from "./CourseSwatch";

type CourseListProps = {
  courses: Course[];
  assignments: Assignment[];
  sources: SourceConnection[];
  onOpenCourse: (courseId: string) => void;
};

export function CourseList({
  courses,
  assignments,
  sources,
  onOpenCourse,
}: CourseListProps) {
  if (courses.length === 0) {
    return (
      <EmptyState
        description="Connect an LMS source or add a course manually to start organizing deadlines."
        icon={<BookOpen size={26} />}
        title="No courses connected yet"
      />
    );
  }

  return (
    <section className="course-list" aria-labelledby="courses-heading">
      <div className="page-section-heading">
        <div>
          <p className="eyebrow">Courses</p>
          <h2 id="courses-heading">Manage each class independently</h2>
          <p>Review platform status, syllabus files, and active assignment load.</p>
        </div>
      </div>

      <div className="course-grid">
        {courses.map((course) => {
          const courseAssignments = assignments.filter(
            (assignment) => assignment.courseId === course.id,
          );
          const openAssignments = courseAssignments.filter(
            (assignment) => assignment.status !== "completed",
          );
          const overdueAssignments = courseAssignments.filter((assignment) =>
            isOverdue(assignment),
          );
          const source = sources.find((candidate) => candidate.type === course.platform);

          return (
            <Card className="course-card" key={course.id}>
              <button
                className="course-card__button"
                onClick={() => onOpenCourse(course.id)}
                type="button"
              >
                <span className="course-card__topline">
                  <CourseSwatch color={course.color} label={course.code} />
                  <span>{course.code}</span>
                  <ChevronRight aria-hidden="true" size={18} />
                </span>
                <strong>{course.name}</strong>
                <span>{course.instructor ?? "Instructor not listed"}</span>
              </button>
              <div className="course-card__meta">
                <Badge tone={overdueAssignments.length > 0 ? "danger" : "success"}>
                  {overdueAssignments.length} overdue
                </Badge>
                <Badge tone="neutral">{openAssignments.length} active</Badge>
                <Badge tone={source?.status === "connected" ? "success" : "info"}>
                  {source ? sourceStatusLabel(source.status) : "Manual"}
                </Badge>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
