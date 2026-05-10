import {
  AlertTriangle,
  CalendarCheck2,
  Clock3,
  ShieldAlert,
} from "lucide-react";
import type { Assignment, DuplicateSuggestion } from "../../types/assignment";
import type { Course } from "../../types/course";
import { getDaysUntil, isOverdue, sortByDueDate } from "../../utils/formatDueDate";
import { AssignmentList } from "../assignments/AssignmentList";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

type DashboardProps = {
  assignments: Assignment[];
  courses: Course[];
  duplicateSuggestions: DuplicateSuggestion[];
  onComplete: (assignmentId: string) => void;
  onEdit: (assignmentId: string) => void;
  onOpenSource: (assignment: Assignment) => void;
};

export function Dashboard({
  assignments,
  courses,
  duplicateSuggestions,
  onComplete,
  onEdit,
  onOpenSource,
}: DashboardProps) {
  const today = new Date("2026-05-10T12:00:00-04:00");
  const activeAssignments = assignments.filter(
    (assignment) => assignment.status !== "completed",
  );

  const overdue = sortByDueDate(
    activeAssignments.filter((assignment) => isOverdue(assignment, today)),
  );
  const todayItems = sortByDueDate(
    activeAssignments.filter((assignment) => getDaysUntil(assignment.dueAt, today) === 0),
  );
  const thisWeek = sortByDueDate(
    activeAssignments.filter((assignment) => {
      const daysUntil = getDaysUntil(assignment.dueAt, today);
      return daysUntil > 0 && daysUntil <= 7;
    }),
  );
  const upcoming = sortByDueDate(
    activeAssignments.filter((assignment) => getDaysUntil(assignment.dueAt, today) > 7),
  );
  const needsReview = sortByDueDate(
    assignments.filter(
      (assignment) =>
        assignment.confidence === "needs_review" || assignment.confidence === "probable",
    ),
  );
  const courseById = new Map(courses.map((course) => [course.id, course]));
  const nextDeadline = todayItems[0] ?? thisWeek[0] ?? overdue[0] ?? upcoming[0];
  const nextCourse = nextDeadline ? courseById.get(nextDeadline.courseId) : undefined;
  const workloadDays = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() + index);
    const count = activeAssignments.filter(
      (assignment) => getDaysUntil(assignment.dueAt, day) === 0,
    ).length;
    return {
      day,
      count,
      label: new Intl.DateTimeFormat("en-US", { weekday: "narrow" }).format(day),
    };
  });

  return (
    <div className="dashboard">
      <section className="dashboard-opening" aria-labelledby="dashboard-opening-heading">
        <Card className="up-next-card" as="section">
          <div className="up-next-card__course-mark" aria-hidden="true">
            {nextCourse?.code.slice(0, 2) ?? "LA"}
          </div>
          <div className="up-next-card__copy">
            <p className="eyebrow">Up next</p>
            <h2 id="dashboard-opening-heading">
              {nextDeadline ? nextDeadline.title : "No active deadlines"}
            </h2>
            <p>
              {nextDeadline && nextCourse
                ? `${nextCourse.code} · ${nextCourse.name}`
                : "Connected coursework will appear here after sync."}
            </p>
            {nextDeadline ? (
              <div className="up-next-card__meta">
                <span>
                  {new Intl.DateTimeFormat("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  }).format(new Date(nextDeadline.dueAt))}
                </span>
                <span>{nextDeadline.source.replace("_", " ")}</span>
              </div>
            ) : null}
          </div>
          {nextDeadline ? (
            <div className="up-next-card__actions">
              <Button onClick={() => onEdit(nextDeadline.id)}>Open details</Button>
              <Button onClick={() => onComplete(nextDeadline.id)} variant="primary">
                Mark complete
              </Button>
            </div>
          ) : null}
        </Card>

        <Card className="numbers-board" as="section">
          <div className="ledger-heading">
            <h2>By The Numbers</h2>
            <p>A snapshot of the term, drawn from your timeline.</p>
          </div>
          <div className="number-grid">
            <div className="number-tile">
              <span>Completion rate</span>
              <strong>87<em>%</em></strong>
              <div className="mini-bars" aria-hidden="true">
                {[44, 52, 48, 58, 62, 68, 78].map((height) => (
                  <i key={height} style={{ height: `${height}%` }} />
                ))}
              </div>
              <p>5 pts vs. last term</p>
            </div>
            <div className="number-tile">
              <span>Current streak</span>
              <strong>12<em>days</em></strong>
              <div className="streak-dots" aria-hidden="true">
                {Array.from({ length: 12 }, (_, index) => (
                  <i className={index < 2 ? "is-muted" : undefined} key={index} />
                ))}
              </div>
              <p>Last miss · Apr 27</p>
            </div>
            <div className="number-tile">
              <span>On-time rate</span>
              <strong>94<em>%</em></strong>
              <div className="rate-ring" aria-hidden="true">94</div>
              <p>3 late · 2 within grace</p>
            </div>
            <div className="number-tile">
              <span>Est. hours remaining</span>
              <strong>23<em>hr</em></strong>
              <div className="stacked-hours" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
              </div>
              <p>Reading · Writing · Sets · Lab</p>
            </div>
          </div>
        </Card>
      </section>

      <section className="fortnight-board" aria-label="Seven day workload outlook">
        <div className="ledger-heading">
          <h2>The Fortnight · 14-Day Outlook</h2>
          <p>
            {courses.map((course) => (
              <span className="course-legend" key={course.id}>
                <span className={`course-dot course-dot--${course.color}`} />
                {course.code}
              </span>
            ))}
          </p>
        </div>
        <div className="workload-days">
          {workloadDays.map(({ day, count, label }) => (
            <button
              className={count > 0 ? "workload-day has-work" : "workload-day"}
              key={day.toISOString()}
              type="button"
            >
              <span>{label}</span>
              <strong>{day.getDate()}</strong>
              <i style={{ height: `${Math.max(8, count * 18)}px` }} />
            </button>
          ))}
        </div>
        <div className="course-filter-row" aria-label="Course filters">
          <button className="is-active" type="button">
            All courses <span>{assignments.length}</span>
          </button>
          {courses.map((course) => (
            <button key={course.id} type="button">
              <span className={`course-dot course-dot--${course.color}`} />
              {course.code}
            </button>
          ))}
        </div>
      </section>

      <section className="dashboard-summary" aria-label="Dashboard summary">
        <Card className="summary-card">
          <CalendarCheck2 aria-hidden="true" size={20} />
          <div>
            <span>Due Today</span>
            <strong>{todayItems.length}</strong>
          </div>
          <Badge tone="info">Focused</Badge>
        </Card>
        <Card className="summary-card">
          <Clock3 aria-hidden="true" size={20} />
          <div>
            <span>This Week</span>
            <strong>{thisWeek.length}</strong>
          </div>
          <Badge tone="neutral">Planned</Badge>
        </Card>
        <Card className="summary-card">
          <AlertTriangle aria-hidden="true" size={20} />
          <div>
            <span>Overdue</span>
            <strong>{overdue.length}</strong>
          </div>
          <Badge tone={overdue.length > 0 ? "danger" : "success"}>
            {overdue.length > 0 ? "Act Now" : "Clear"}
          </Badge>
        </Card>
        <Card className="summary-card">
          <ShieldAlert aria-hidden="true" size={20} />
          <div>
            <span>Needs Review</span>
            <strong>{needsReview.length}</strong>
          </div>
          <Badge tone={needsReview.length > 0 ? "review" : "success"}>
            {needsReview.length > 0 ? "Verify" : "Clear"}
          </Badge>
        </Card>
      </section>

      <AssignmentList
        assignments={todayItems}
        courses={courses}
        description="High-confidence work and review items due before the day ends."
        duplicateSuggestions={duplicateSuggestions}
        emptyDescription="No assignments are due today."
        emptyTitle="Today is clear"
        onComplete={onComplete}
        onEdit={onEdit}
        onOpenSource={onOpenSource}
        title="§ ii. Today"
      />

      <AssignmentList
        assignments={thisWeek}
        courses={courses}
        description="Work that needs planning across the next seven days."
        duplicateSuggestions={duplicateSuggestions}
        emptyDescription="New imports and manual tasks for this week will appear here."
        emptyTitle="No assignments this week"
        onComplete={onComplete}
        onEdit={onEdit}
        onOpenSource={onOpenSource}
        title="§ iii. This Week"
      />

      <AssignmentList
        assignments={upcoming}
        courses={courses}
        description="Future assignments worth keeping visible before they become urgent."
        duplicateSuggestions={duplicateSuggestions}
        emptyDescription="Longer-range work will appear after sources sync."
        emptyTitle="No upcoming assignments"
        onComplete={onComplete}
        onEdit={onEdit}
        onOpenSource={onOpenSource}
        title="§ iv. Upcoming"
      />

      <AssignmentList
        assignments={overdue}
        courses={courses}
        description="Items past their due time and still not completed."
        duplicateSuggestions={duplicateSuggestions}
        emptyDescription="Overdue assignments will move here when they miss their due time."
        emptyTitle="No overdue assignments"
        onComplete={onComplete}
        onEdit={onEdit}
        onOpenSource={onOpenSource}
        title="§ i. Overdue"
      />

      <AssignmentList
        assignments={needsReview}
        courses={courses}
        description="Probable or uncertain tasks that should be confirmed before trust."
        duplicateSuggestions={duplicateSuggestions}
        emptyDescription="Syllabus and browser-helper imports will appear here for confirmation."
        emptyTitle="No assignments need review"
        onComplete={onComplete}
        onEdit={onEdit}
        onOpenSource={onOpenSource}
        title="§ v. Needs Review"
      />
    </div>
  );
}
