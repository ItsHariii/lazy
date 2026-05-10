import type { Assignment } from "../../types/assignment";
import type { Course } from "../../types/course";
import { formatDueDate, isSameDay } from "../../utils/formatDueDate";

type MonthViewProps = {
  monthDate: Date;
  assignments: Assignment[];
  courses: Course[];
  onOpenAssignment: (assignmentId: string) => void;
};

function buildMonthDays(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const firstWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<Date | null> = [];

  for (let index = 0; index < firstWeekday; index += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

export function MonthView({
  monthDate,
  assignments,
  courses,
  onOpenAssignment,
}: MonthViewProps) {
  const courseById = new Map(courses.map((course) => [course.id, course]));
  const cells = buildMonthDays(monthDate);
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="month-view" role="grid" aria-label="Monthly assignment calendar">
      {weekdays.map((weekday) => (
        <div className="month-view__weekday" key={weekday} role="columnheader">
          {weekday}
        </div>
      ))}
      {cells.map((date, index) => {
        const dayAssignments = date
          ? assignments.filter((assignment) => isSameDay(new Date(assignment.dueAt), date))
          : [];

        return (
          <div
            aria-label={date ? date.toDateString() : "Empty calendar cell"}
            className="month-view__cell"
            key={`${date?.toISOString() ?? "empty"}-${index}`}
            role="gridcell"
          >
            {date ? (
              <>
                <div className="month-view__date">
                  <span>{date.getDate()}</span>
                  {dayAssignments.length > 0 ? (
                    <strong>{dayAssignments.length} due</strong>
                  ) : (
                    <em>Clear</em>
                  )}
                </div>
                <div className="calendar-marker-list">
                  {dayAssignments.slice(0, 3).map((assignment) => {
                    const course = courseById.get(assignment.courseId);
                    return (
                      <button
                        className="calendar-marker"
                        key={assignment.id}
                        onClick={() => onOpenAssignment(assignment.id)}
                        type="button"
                      >
                        <span
                          className={`course-dot course-dot--${course?.color ?? "graphite"}`}
                        />
                        <span>{assignment.title}</span>
                        <span>{formatDueDate(assignment.dueAt).split(" at ")[1]}</span>
                      </button>
                    );
                  })}
                  {dayAssignments.length > 3 ? (
                    <span className="calendar-more">+{dayAssignments.length - 3} more</span>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
