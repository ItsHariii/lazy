import {
  BellRing,
  CalendarClock,
  RotateCw,
} from "lucide-react";
import type { Assignment } from "../../types/assignment";
import type { Course } from "../../types/course";
import type { SourceConnection } from "../../types/source";
import { sourceLabel, sourceStatusLabel } from "../../utils/confidence";
import {
  formatDueDate,
  formatRelativeSync,
  getDaysUntil,
  sortByDueDate,
} from "../../utils/formatDueDate";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

type RightRailProps = {
  assignments: Assignment[];
  courses: Course[];
  sources: SourceConnection[];
  reviewCount: number;
  onNavigateReview: () => void;
  onNavigateSources: () => void;
};

export function RightRail({
  assignments,
  courses,
  sources,
  reviewCount,
  onNavigateReview,
  onNavigateSources,
}: RightRailProps) {
  const courseById = new Map(courses.map((course) => [course.id, course]));
  const nextDeadlines = sortByDueDate(
    assignments.filter((assignment) => assignment.status !== "completed"),
  ).slice(0, 4);
  const sourceErrors = sources.filter((source) => source.status === "error");
  const syncing = sources.filter((source) => source.status === "syncing");
  const reminderCoverage = assignments.filter((assignment) =>
    assignment.reminders.some((reminder) => reminder.enabled),
  ).length;
  const confirmed = assignments.filter((assignment) => assignment.confidence === "confirmed").length;
  const probable = assignments.filter((assignment) => assignment.confidence === "probable").length;
  const needsReview = assignments.filter((assignment) => assignment.confidence === "needs_review").length;
  const confidenceTotal = assignments.length || 1;
  const today = new Date("2026-05-10T12:00:00-04:00");
  const workloadDays = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() + index);
    const count = assignments.filter(
      (assignment) =>
        assignment.status !== "completed" && getDaysUntil(assignment.dueAt, day) === 0,
    ).length;
    return {
      count,
      label: new Intl.DateTimeFormat("en-US", { weekday: "narrow" }).format(day),
    };
  });

  return (
    <aside className="right-rail" aria-label="Academic status summary">
      <Card className="rail-panel rail-panel--workload" as="section">
        <div className="rail-panel__header">
          <div>
            <h2>Workload · 7 Days</h2>
            <p>{workloadDays.reduce((total, day) => total + day.count, 0)} due</p>
          </div>
          <Badge tone="neutral">
            {workloadDays.reduce((total, day) => total + day.count, 0)} due
          </Badge>
        </div>
        <div className="rail-workload-bars" aria-hidden="true">
          {workloadDays.map((day, index) => (
            <div key={`${day.label}-${index}`}>
              <i style={{ height: `${Math.max(10, day.count * 22)}px` }} />
              <span>{day.label}</span>
            </div>
          ))}
        </div>
        <p className="rail-note">Lightest: clear days · Heaviest: deadline clusters</p>
      </Card>

      <Card className="rail-panel" as="section">
        <div className="rail-panel__header">
          <div>
            <h2>Sync Status</h2>
            <p>{syncing.length > 0 ? "Sync in progress" : "Sources are stable"}</p>
          </div>
          <RotateCw aria-hidden="true" size={18} />
        </div>
        <div className="sync-list">
          {sources.slice(0, 5).map((source) => (
            <div className="sync-list__item" key={source.id}>
              <span
                className={
                  source.status === "connected" || source.status === "syncing"
                    ? "source-status-dot is-ok"
                    : source.status === "error"
                      ? "source-status-dot is-error"
                      : "source-status-dot"
                }
              />
              <div>
                <strong>{source.name}</strong>
                <span>
                  {source.status === "disabled"
                    ? "Disabled"
                    : source.errorMessage ?? `${sourceStatusLabel(source.status)} · ${formatRelativeSync(source.lastSyncedAt)}`}
                </span>
              </div>
              <em>{sourceLabel(source.type).slice(0, 1)}</em>
            </div>
          ))}
        </div>
        <Button onClick={onNavigateSources} size="sm" variant="ghost">
          Manage sources
        </Button>
      </Card>

      <Card className="rail-panel" as="section">
        <div className="rail-panel__header">
          <div>
            <h2>Next Deadlines</h2>
            <p>{nextDeadlines.length} active items</p>
          </div>
          <CalendarClock aria-hidden="true" size={18} />
        </div>
        <ol className="deadline-list">
          {nextDeadlines.map((assignment) => {
            const course = courseById.get(assignment.courseId);
            const dueDate = new Date(assignment.dueAt);
            return (
              <li key={assignment.id}>
                <span className="deadline-date">
                  <em>{new Intl.DateTimeFormat("en-US", { month: "short" }).format(dueDate)}</em>
                  <strong>{dueDate.getDate()}</strong>
                </span>
                <div>
                  <strong>{assignment.title}</strong>
                  <span>
                    {course?.code ?? "Course"} - {formatDueDate(assignment.dueAt)}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </Card>

      <Card className="rail-panel rail-panel--confidence" as="section">
        <div className="rail-panel__header">
          <div>
            <h2>Confidence</h2>
            <p>{Math.round((confirmed / confidenceTotal) * 100)}% confirmed</p>
          </div>
          <Badge tone={reviewCount > 0 ? "review" : "success"}>
            {reviewCount} review
          </Badge>
        </div>
        <div className="confidence-bar" aria-hidden="true">
          <i style={{ flexGrow: confirmed }} />
          <i style={{ flexGrow: probable }} />
          <i style={{ flexGrow: needsReview }} />
        </div>
        <div className="confidence-list">
          <span><i />Confirmed <strong>{confirmed}</strong></span>
          <span><i />Probable <strong>{probable}</strong></span>
          <span><i />Needs review <strong>{needsReview}</strong></span>
        </div>
        <Button onClick={onNavigateReview} size="sm" variant="secondary">Open Review</Button>
      </Card>

      <Card className="rail-panel rail-panel--reminders" as="section">
        <div className="rail-panel__header">
          <div>
            <h2>Reminder Health</h2>
            <p>{reminderCoverage}/{assignments.length} covered</p>
          </div>
          <BellRing aria-hidden="true" size={18} />
        </div>
        <div className="rail-panel__metric">
          <div>
            <strong>Email reminders</strong>
            <span>On</span>
          </div>
          <Badge tone="success">On</Badge>
        </div>
        <div className="rail-panel__metric">
          <div>
            <strong>Push reminders</strong>
            <span>On</span>
          </div>
          <Badge tone="success">On</Badge>
        </div>
        <div className="rail-panel__metric">
          <div>
            <strong>Calendar export</strong>
            <span>Daily 6 AM</span>
          </div>
          <Badge tone={sourceErrors.length === 0 ? "neutral" : "danger"}>
            {sourceErrors.length === 0 ? "Daily" : "Check"}
          </Badge>
        </div>
      </Card>
    </aside>
  );
}
