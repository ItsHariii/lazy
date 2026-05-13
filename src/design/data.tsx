// @ts-nocheck
import React from "react";
const g = globalThis as any;
g.React = React;

const COURSES: any[] = [];
const ASSIGNMENTS: any[] = [];
const TODAY = new Date();

const SOURCES = [
  { id: "canvas", name: "Canvas", type: "iCalendar feed", status: "off", lastSync: "Not connected", items: 0, error: null,
    permissions: ["Calendar items only"],
    notes: ["Read-only ICS subscription URL", "Canvas → Calendar → Calendar Feed (bottom right)", "No grades, no submissions"] },
  { id: "brightspace", name: "iCollege · Brightspace", type: "iCalendar feed", status: "off", lastSync: "—", items: 0, error: null,
    permissions: ["Calendar items only"],
    notes: ["Read-only ICS subscription URL", "No grades, no submissions"] },
  { id: "syllabus", name: "Syllabus Uploads", type: "PDF / DOCX / TXT extraction", status: "ok", lastSync: "Ready", items: 0, error: null,
    permissions: ["Files you upload"],
    notes: ["Parsed by Claude Haiku 4.5", "Uncertain items go to Review"] },
  { id: "manual", name: "Manual Entries", type: "You", status: "ok", lastSync: "—", items: 0, error: null,
    permissions: ["What you enter"],
    notes: ["Always Confirmed"] },
];

function getCourse(id) {
  return COURSES.find(c => c.id === id) || { id, code: "?", title: "Unknown", color: "graphite" };
}
function getAssignment(id) { return ASSIGNMENTS.find(a => a.id === id); }

function formatDueRelative(iso) {
  const due = new Date(iso);
  const ms = due - TODAY;
  const day = 86400000;
  const startOfToday = new Date(TODAY); startOfToday.setHours(0,0,0,0);
  const dueDay = new Date(due); dueDay.setHours(0,0,0,0);
  const dayDiff = Math.round((dueDay - startOfToday) / day);

  if (ms < 0 && dayDiff === 0) {
    const hoursAgo = Math.round(Math.abs(ms) / 3600000);
    return { rel: hoursAgo < 1 ? "Just now" : `${hoursAgo}h ago`, soon: "now" };
  }
  if (dayDiff < 0) return { rel: `${Math.abs(dayDiff)}d overdue`, soon: "now" };
  if (dayDiff === 0) {
    const h = Math.round(ms / 3600000);
    return { rel: h <= 0 ? "now" : `in ${h}h`, soon: h <= 12 ? "soon" : "" };
  }
  if (dayDiff === 1) return { rel: "Tomorrow", soon: "" };
  if (dayDiff < 7)   return { rel: `In ${dayDiff} days`, soon: "" };
  return { rel: due.toLocaleDateString("en-US", { month: "short", day: "numeric" }), soon: "" };
}

const DOW = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function formatDay(iso) {
  const dt = new Date(iso);
  return `${MONTHS[dt.getMonth()].slice(0,3)} ${dt.getDate()}`;
}
function formatTime(iso) {
  const dt = new Date(iso);
  let h = dt.getHours();
  const m = dt.getMinutes();
  const ampm = h >= 12 ? "p" : "a";
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2,"0")}${ampm}`;
}
function formatLong(iso) {
  const dt = new Date(iso);
  return `${DOW[dt.getDay()]}, ${MONTHS[dt.getMonth()]} ${dt.getDate()} · ${formatTime(iso)}`;
}

function bucketize(assignments) {
  const startOfToday = new Date(TODAY); startOfToday.setHours(0,0,0,0);
  const today = [], thisWeek = [], upcoming = [], overdue = [], review = [], completed = [];
  for (const a of assignments) {
    if (a.confidence === "needs_review") { review.push(a); continue; }
    if (a.status === "completed") { completed.push(a); continue; }
    const due = new Date(a.dueAt);
    const dueDay = new Date(due); dueDay.setHours(0,0,0,0);
    const diff = Math.round((dueDay - startOfToday) / 86400000);
    if (diff < 0) overdue.push(a);
    else if (diff === 0) today.push(a);
    else if (diff < 7) thisWeek.push(a);
    else upcoming.push(a);
  }
  const bySoon = (a, b) => new Date(a.dueAt) - new Date(b.dueAt);
  return {
    today: today.sort(bySoon),
    thisWeek: thisWeek.sort(bySoon),
    upcoming: upcoming.sort(bySoon),
    overdue: overdue.sort(bySoon),
    review: review.sort(bySoon),
    completed: completed.sort(bySoon),
  };
}

const SOURCE_LABEL = {
  canvas: "Canvas", brightspace: "iCollege", mcgraw_hill: "McGraw Hill",
  syllabus: "Syllabus", browser_helper: "Browser helper", manual: "Manual",
};

const CONFIDENCE_PRESENT = {
  confirmed:    { label: "Confirmed",    cls: "badge--success" },
  probable:     { label: "Probable",     cls: "badge--warning" },
  needs_review: { label: "Needs review", cls: "badge--review" },
};

Object.assign(window, {
  COURSES, ASSIGNMENTS, SOURCES, TODAY,
  getCourse, getAssignment,
  formatDueRelative, formatDay, formatTime, formatLong, bucketize,
  SOURCE_LABEL, CONFIDENCE_PRESENT, DOW, MONTHS,
});
