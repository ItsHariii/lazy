/* global React */
// Mock data + utility functions for Homework Tracker

const COURSES = [
  { id: "cs-7641",   code: "CS 7641",   title: "Machine Learning",          instructor: "Dr. R. Banerjee",   color: "cobalt",    term: "Fall 2026" },
  { id: "hist-2110", code: "HIST 2110", title: "United States History",     instructor: "Prof. M. Okafor",   color: "brick",     term: "Fall 2026" },
  { id: "math-2551", code: "MATH 2551", title: "Multivariable Calculus",    instructor: "Dr. L. Petrov",     color: "forest",    term: "Fall 2026" },
  { id: "biol-1107", code: "BIOL 1107", title: "Principles of Biology",     instructor: "Dr. S. Iyer",       color: "teal",      term: "Fall 2026" },
  { id: "engl-1102", code: "ENGL 1102", title: "Composition II",            instructor: "Prof. A. Whelan",   color: "plum",      term: "Fall 2026" },
  { id: "phil-2030", code: "PHIL 2030", title: "Ethics & Society",          instructor: "Dr. J. Marsden",    color: "gold",      term: "Fall 2026" },
];

// Anchor "today" so the prototype always feels live
const TODAY = new Date(2026, 4, 9, 10, 14); // May 9, 2026 10:14 AM

function d(daysFromToday, hour = 23, minute = 59) {
  const dt = new Date(TODAY);
  dt.setDate(dt.getDate() + daysFromToday);
  dt.setHours(hour, minute, 0, 0);
  return dt.toISOString();
}

const ASSIGNMENTS = [
  // OVERDUE
  { id: "a1", title: "Midterm Study Guide Questions", courseId: "hist-2110", dueAt: d(-2, 23, 59), source: "syllabus", status: "overdue", confidence: "probable",
    confidenceReason: "Syllabus wording matched a due phrase but no submission link was found.",
    syllabusTextMatch: "Week 12: Midterm study guide questions due Thursday." },
  { id: "a2", title: "Reading Quiz: Chapter 14", courseId: "biol-1107", dueAt: d(-1, 22, 0), source: "mcgraw_hill", status: "overdue", confidence: "confirmed",
    confidenceReason: "McGraw Hill Connect item visible in the Brightspace module.",
    sourceUrl: "icollege.example.edu/biol-1107/connect/ch14" },

  // TODAY
  { id: "a3", title: "Lab Report 7 — Enzyme Kinetics", courseId: "biol-1107", dueAt: d(0, 21, 0), source: "canvas", status: "in_progress", confidence: "confirmed",
    confidenceReason: "Official Canvas assignment with stable due date.",
    sourceUrl: "canvas.example.edu/biol-1107/assignments/7",
    notes: "Attach figure captions before submitting. Verify Table 2 SE values." },
  { id: "a4", title: "Discussion: Reconstruction Era Letters", courseId: "hist-2110", dueAt: d(0, 23, 59), source: "brightspace", status: "not_started", confidence: "confirmed",
    confidenceReason: "Brightspace scheduled item imported through OAuth." },
  { id: "a5", title: "Problem Set 9 — Vector Fields", courseId: "math-2551", dueAt: d(0, 18, 0), source: "canvas", status: "not_started", confidence: "confirmed",
    confidenceReason: "Official Canvas assignment with source URL." },

  // THIS WEEK
  { id: "a6", title: "Primary Source Response: Decolonization", courseId: "hist-2110", dueAt: d(1, 23, 59), source: "brightspace", status: "not_started", confidence: "confirmed" },
  { id: "a7", title: "Problem Set 10 — Line Integrals", courseId: "math-2551", dueAt: d(2, 18, 0), source: "canvas", status: "not_started", confidence: "confirmed" },
  { id: "a8", title: "Connect Homework: Equilibrium & Buffers", courseId: "biol-1107", dueAt: d(3, 22, 0), source: "mcgraw_hill", status: "not_started", confidence: "confirmed" },
  { id: "a9", title: "Revision Conference Notes", courseId: "engl-1102", dueAt: d(4, 12, 0), source: "manual", status: "in_progress", confidence: "confirmed",
    notes: "Bring three possible thesis revisions." },
  { id: "a10", title: "ML Assignment 3 — Decision Trees", courseId: "cs-7641", dueAt: d(5, 23, 59), source: "canvas", status: "not_started", confidence: "confirmed" },

  // UPCOMING
  { id: "a11", title: "Reading Response: Mill on Liberty", courseId: "phil-2030", dueAt: d(7, 23, 59), source: "canvas", status: "not_started", confidence: "confirmed" },
  { id: "a12", title: "Final Paper Draft — Outline", courseId: "engl-1102", dueAt: d(9, 23, 59), source: "syllabus", status: "not_started", confidence: "probable",
    confidenceReason: "Syllabus mentions outline near the final paper section.",
    syllabusTextMatch: "Outline of final paper due in week 14." },
  { id: "a13", title: "Midterm Exam — In Class", courseId: "math-2551", dueAt: d(11, 9, 30), source: "canvas", status: "not_started", confidence: "confirmed" },
  { id: "a14", title: "Project Proposal", courseId: "cs-7641", dueAt: d(12, 23, 59), source: "canvas", status: "not_started", confidence: "confirmed" },

  // NEEDS REVIEW
  { id: "a15", title: "Enzyme Kinetics Lab Report", courseId: "biol-1107", dueAt: d(0, 23, 59), source: "syllabus", status: "not_started", confidence: "needs_review", duplicateOf: "a3",
    confidenceReason: "Potential duplicate of the Canvas lab report with a slightly different due time.",
    syllabusTextMatch: "May 9 — Enzyme kinetics lab report due by end of day." },
  { id: "a16", title: "Essay 3 Reflection Post", courseId: "engl-1102", dueAt: d(6, 17, 0), source: "browser_helper", status: "not_started", confidence: "needs_review",
    confidenceReason: "Browser helper found task-like text without an official assignment endpoint.",
    syllabusTextMatch: "Reflection post appears under Week 14 resources. Due Friday by 5 PM." },
  { id: "a17", title: "Reading: Federalist No. 10", courseId: "hist-2110", dueAt: d(2, 8, 0), source: "browser_helper", status: "not_started", confidence: "needs_review",
    confidenceReason: "Helper saw a 'before class' phrase but no official task." },

  // COMPLETED
  { id: "a18", title: "Problem Set 8 — Surface Integrals", courseId: "math-2551", dueAt: d(-3, 18, 0), source: "canvas", status: "completed", confidence: "confirmed" },
  { id: "a19", title: "Lab Report 6 — Photosynthesis", courseId: "biol-1107", dueAt: d(-5, 21, 0), source: "canvas", status: "completed", confidence: "confirmed" },
];

const SOURCES = [
  { id: "canvas", name: "Canvas",      type: "Learning Management System", status: "ok",      lastSync: "2 min ago",  items: 38, error: null,
    permissions: ["Assignments", "Due dates", "Course list"],
    notes: ["Read-only OAuth", "Refreshes every 15 minutes"] },
  { id: "brightspace", name: "Brightspace · iCollege", type: "Learning Management System", status: "ok", lastSync: "8 min ago", items: 21, error: null,
    permissions: ["Calendar items", "Module content list"],
    notes: ["Read-only OAuth"] },
  { id: "mcgraw_hill", name: "McGraw Hill Connect",   type: "Visible through LMS",        status: "ok", lastSync: "12 min ago", items: 9, error: null,
    permissions: ["Items embedded in Brightspace modules only"],
    notes: ["Never reads from Connect directly"] },
  { id: "syllabus",    name: "Syllabus Uploads",       type: "PDF / DOCX extraction",      status: "warn", lastSync: "Today, 8:14 AM", items: 6, error: "1 syllabus needs re-parse",
    permissions: ["Files you uploaded only"],
    notes: ["Uncertain items go to Review"] },
  { id: "browser_helper", name: "Browser Helper",      type: "Opt-in browser session",      status: "ok", lastSync: "26 min ago", items: 4, error: null,
    permissions: ["Page text on whitelisted course pages"],
    notes: ["Never stores passwords, MFA, cookies, or unrelated history", "All imports start as Probable or Needs Review"] },
  { id: "manual",      name: "Manual Entries",         type: "You",                          status: "ok", lastSync: "—", items: 3, error: null,
    permissions: ["What you enter"],
    notes: ["Always Confirmed"] },
];

// ---------- Utilities ----------
function getCourse(id) { return COURSES.find(c => c.id === id); }
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
  canvas: "Canvas", brightspace: "Brightspace", mcgraw_hill: "McGraw Hill",
  syllabus: "Syllabus", browser_helper: "Browser helper", manual: "Manual",
};

// Confidence presentation
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
