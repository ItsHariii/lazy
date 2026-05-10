import type { Assignment } from "../../types/assignment";
import type { Course } from "../../types/course";
import { formatDueDate, isSameDay } from "../../utils/formatDueDate";

type WeekViewProps = {
  weekDate: Date;
  assignments: Assignment[];
  courses: Course[];
  onOpenAssignment: (assignmentId: string) => void;
};

function startOfWeek(date: Date) {
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay());
  start.setHours(0, 0, 0, 0);
  return start;
}

export function WeekView({
  weekDate,
  assignments,
  courses,
  onOpenAssignment,
}: WeekViewProps) {
  const courseById = new Map(courses.map((course) => [course.id, course]));
  const start = startOfWeek(weekDate);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });

  return (
    <div className="week-view" aria-label="Weekly assignment calendar">
      {days.map((day) => {
        const dayAssignments = assignments.filter((assignment) =>
          isSameDay(new Date(assignment.dueAt), day),
        );

        return (
          <section className="week-day" key={day.toISOString()}>
            <div className="week-day__heading">
              <span>
                {new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(day)}
              </span>
              <strong>{day.getDate()}</strong>
            </div>
            {dayAssignments.length === 0 ? (
              <p className="week-day__empty">No assignments due</p>
            ) : (
              <div className="week-day__items">
                {dayAssignments.map((assignment) => {
                  const course = courseById.get(assignment.courseId);
                  return (
                    <button
                      className="week-assignment"
                      key={assignment.id}
                      onClick={() => onOpenAssignment(assignment.id)}
                      type="button"
                    >
                      <span
                        className={`course-dot course-dot--${course?.color ?? "graphite"}`}
                      />
                      <span>
                        <strong>{assignment.title}</strong>
                        <em>
                          {course?.code ?? "Course"} - {formatDueDate(assignment.dueAt)}
                        </em>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
