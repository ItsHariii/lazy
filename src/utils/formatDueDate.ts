import type { Assignment } from "../types/assignment";

export function formatDueDate(dueAt: string, style: "short" | "long" = "short") {
  const date = new Date(dueAt);
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    month: style === "long" ? "long" : "short",
    day: "numeric",
    weekday: style === "long" ? "long" : undefined,
  });
  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return `${dateFormatter.format(date)} at ${timeFormatter.format(date)}`;
}

export function formatRelativeSync(dateTime?: string) {
  if (!dateTime) {
    return "Not synced";
  }

  const date = new Date(dateTime);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function isSameDay(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

export function getDaysUntil(dateTime: string, from = new Date()) {
  const target = new Date(dateTime);
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

export function isOverdue(assignment: Assignment, now = new Date()) {
  return (
    assignment.status !== "completed" &&
    new Date(assignment.dueAt).getTime() < now.getTime()
  );
}

export function sortByDueDate(assignments: Assignment[]) {
  return [...assignments].sort(
    (first, second) =>
      new Date(first.dueAt).getTime() - new Date(second.dueAt).getTime(),
  );
}
