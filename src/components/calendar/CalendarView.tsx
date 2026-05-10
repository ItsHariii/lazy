import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { Assignment } from "../../types/assignment";
import type { Course } from "../../types/course";
import { Button } from "../ui/Button";
import { SegmentedControl } from "../ui/SegmentedControl";
import { MonthView } from "./MonthView";
import { WeekView } from "./WeekView";

type CalendarMode = "month" | "week";

type CalendarViewProps = {
  assignments: Assignment[];
  courses: Course[];
  onOpenAssignment: (assignmentId: string) => void;
};

export function CalendarView({
  assignments,
  courses,
  onOpenAssignment,
}: CalendarViewProps) {
  const [mode, setMode] = useState<CalendarMode>("month");
  const [cursorDate, setCursorDate] = useState(new Date("2026-05-09T12:00:00-04:00"));

  function shiftCursor(direction: -1 | 1) {
    const next = new Date(cursorDate);
    if (mode === "month") {
      next.setMonth(cursorDate.getMonth() + direction);
    } else {
      next.setDate(cursorDate.getDate() + direction * 7);
    }
    setCursorDate(next);
  }

  const heading = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(cursorDate);

  return (
    <section className="calendar-page" aria-labelledby="calendar-heading">
      <div className="calendar-toolbar">
        <div>
          <p className="eyebrow">Calendar</p>
          <h2 id="calendar-heading">{heading}</h2>
          <p>Read due-date density by course color without losing detail.</p>
        </div>
        <div className="calendar-toolbar__actions">
          <Button
            aria-label={`Previous ${mode}`}
            icon={<ChevronLeft size={16} />}
            onClick={() => shiftCursor(-1)}
          >
            Previous
          </Button>
          <SegmentedControl
            label="Calendar view"
            onChange={setMode}
            options={[
              { label: "Month", value: "month" },
              { label: "Week", value: "week" },
            ]}
            value={mode}
          />
          <Button
            aria-label={`Next ${mode}`}
            icon={<ChevronRight size={16} />}
            onClick={() => shiftCursor(1)}
          >
            Next
          </Button>
        </div>
      </div>

      {mode === "month" ? (
        <MonthView
          assignments={assignments}
          courses={courses}
          monthDate={cursorDate}
          onOpenAssignment={onOpenAssignment}
        />
      ) : (
        <WeekView
          assignments={assignments}
          courses={courses}
          onOpenAssignment={onOpenAssignment}
          weekDate={cursorDate}
        />
      )}
    </section>
  );
}
