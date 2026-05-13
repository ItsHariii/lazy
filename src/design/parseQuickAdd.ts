// @ts-nocheck
// Pure parser for quick-add bar input.
// (input, courses, now) -> { title, courseId?, courseCode?, dueAt?, missing[] }
// Loaded as global side-effect — exposes window.parseQuickAdd.

const DAY_MS = 86400000;

const DAY_NAMES = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, weds: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};

const MONTH_NAMES = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function nextDayOfWeek(now, target, force = false) {
  const cur = now.getDay();
  let diff = (target - cur + 7) % 7;
  if (diff === 0 && force) diff = 7;
  const d = startOfDay(now);
  d.setDate(d.getDate() + diff);
  return d;
}

function findCourse(tokens, courses) {
  const compact = tokens.join(" ").toUpperCase();
  // Try multi-token: "MKT 3010"
  const re1 = /\b([A-Z]{2,5})\s?(\d{3,4})\b/g;
  let m;
  while ((m = re1.exec(compact)) !== null) {
    const code = `${m[1]} ${m[2]}`;
    const codeNoSpace = `${m[1]}${m[2]}`;
    const course = courses.find(c => {
      const cc = c.code.replace(/\s+/g, "").toUpperCase();
      return cc === codeNoSpace;
    });
    if (course) {
      return { course, raw: m[0], code };
    }
    // Course code given but unknown — return as new courseCode hint
    return { course: null, raw: m[0], code };
  }
  return null;
}

// Try to parse a date from a token sequence starting at index `i`.
// Returns { date: Date, consumed: number } or null.
function parseDateAt(tokens, i, now) {
  const tok = (tokens[i] || "").toLowerCase();
  const next = (tokens[i + 1] || "").toLowerCase();
  const nowDay = startOfDay(now);

  if (tok === "today") return { date: new Date(nowDay), consumed: 1 };
  if (tok === "tonight") return { date: new Date(nowDay), consumed: 1, defaultTime: { h: 21, m: 0 } };
  if (tok === "tomorrow" || tok === "tmrw" || tok === "tmr") {
    const d = new Date(nowDay);
    d.setDate(d.getDate() + 1);
    return { date: d, consumed: 1 };
  }

  // "next mon", "this fri"
  if ((tok === "next" || tok === "this") && next in DAY_NAMES) {
    const force = tok === "next";
    return { date: nextDayOfWeek(now, DAY_NAMES[next], force), consumed: 2 };
  }

  // bare day name
  if (tok in DAY_NAMES) {
    return { date: nextDayOfWeek(now, DAY_NAMES[tok], false), consumed: 1 };
  }

  // M/D or MM/DD (optional /YY or /YYYY)
  const slash = tok.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (slash) {
    const month = parseInt(slash[1], 10) - 1;
    const day = parseInt(slash[2], 10);
    let year = now.getFullYear();
    if (slash[3]) {
      year = parseInt(slash[3], 10);
      if (year < 100) year += 2000;
    }
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const d = new Date(year, month, day, 0, 0, 0, 0);
      // If past in current year, roll to next year (only when no explicit year)
      if (!slash[3] && d < startOfDay(now)) d.setFullYear(year + 1);
      return { date: d, consumed: 1 };
    }
  }

  // "Nov 14" / "November 14"
  if (tok in MONTH_NAMES) {
    const dayMatch = (next || "").match(/^(\d{1,2})$/);
    if (dayMatch) {
      const month = MONTH_NAMES[tok];
      const day = parseInt(dayMatch[1], 10);
      const year = now.getFullYear();
      const d = new Date(year, month, day, 0, 0, 0, 0);
      if (d < startOfDay(now)) d.setFullYear(year + 1);
      return { date: d, consumed: 2 };
    }
  }

  return null;
}

// Returns { h, m, consumed } or null
function parseTimeAt(tokens, i) {
  const tok = (tokens[i] || "").toLowerCase();
  // 11pm, 11:30pm, 23:00, 23, 9a
  const m = tok.match(/^(\d{1,2})(?::(\d{2}))?(am|pm|a|p)?$/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const ampm = m[3];
  if (h > 23 || min > 59) return null;
  if (ampm === "pm" || ampm === "p") {
    if (h < 12) h += 12;
  } else if (ampm === "am" || ampm === "a") {
    if (h === 12) h = 0;
  } else {
    // No am/pm: only accept as time if value forms a plausible clock or combined "11:30"
    if (!m[2] && (h < 1 || h > 23)) return null;
    if (!m[2] && h <= 12) {
      // bare "11" is ambiguous — treat as not a time unless explicit
      return null;
    }
  }
  return { h, m: min, consumed: 1 };
}

function parseQuickAdd(input, courses, now) {
  const result = {
    title: "",
    courseId: undefined,
    courseCode: undefined,
    dueAt: undefined,
    missing: [],
    raw: input,
  };
  if (!input || !input.trim()) {
    result.missing = ["title", "course", "due"];
    return result;
  }
  const _now = now || new Date();
  const tokens = input.trim().split(/\s+/);
  const consumed = new Array(tokens.length).fill(false);

  // Course (greedy: scan once, find first matching code)
  const courseHit = findCourse(tokens, courses);
  if (courseHit) {
    // Mark indices that contain the code parts
    const code = courseHit.code.toUpperCase();
    const codeParts = code.split(/\s+/);
    let scanFrom = 0;
    for (const part of codeParts) {
      for (let j = scanFrom; j < tokens.length; j++) {
        if (consumed[j]) continue;
        if (tokens[j].toUpperCase() === part || tokens[j].toUpperCase() === code.replace(/\s+/g, "")) {
          consumed[j] = true;
          // If matched single-token compound, also break out of outer loop
          if (tokens[j].toUpperCase() === code.replace(/\s+/g, "")) {
            scanFrom = tokens.length;
            break;
          }
          scanFrom = j + 1;
          break;
        }
      }
    }
    if (courseHit.course) {
      result.courseId = courseHit.course.id;
    } else {
      result.courseCode = courseHit.code;
    }
  }

  // Date — scan tokens left to right
  let dateHit = null;
  let dateIdx = -1;
  for (let i = 0; i < tokens.length; i++) {
    if (consumed[i]) continue;
    const hit = parseDateAt(tokens, i, _now);
    if (hit) {
      dateHit = hit;
      dateIdx = i;
      for (let k = 0; k < hit.consumed; k++) consumed[i + k] = true;
      break;
    }
  }

  // Time — prefer token immediately after date
  let timeHit = null;
  if (dateHit) {
    for (let i = dateIdx + dateHit.consumed; i < tokens.length; i++) {
      if (consumed[i]) continue;
      const hit = parseTimeAt(tokens, i);
      if (hit) {
        timeHit = hit;
        consumed[i] = true;
        break;
      }
      // Allow one unrelated token between date and time
      if (i > dateIdx + dateHit.consumed + 1) break;
    }
  }
  if (!timeHit) {
    // Scan whole token list for any time
    for (let i = 0; i < tokens.length; i++) {
      if (consumed[i]) continue;
      const hit = parseTimeAt(tokens, i);
      if (hit) {
        timeHit = hit;
        consumed[i] = true;
        break;
      }
    }
  }

  if (dateHit) {
    const d = new Date(dateHit.date);
    if (timeHit) {
      d.setHours(timeHit.h, timeHit.m, 0, 0);
    } else if (dateHit.defaultTime) {
      d.setHours(dateHit.defaultTime.h, dateHit.defaultTime.m, 0, 0);
    } else {
      d.setHours(23, 59, 0, 0);
    }
    result.dueAt = d.toISOString();
  }

  // Title = remaining tokens, in order
  const titleTokens = tokens.filter((_, i) => !consumed[i]);
  result.title = titleTokens.join(" ").trim();

  // Missing fields
  if (!result.title) result.missing.push("title");
  if (!result.courseId && !result.courseCode) result.missing.push("course");
  if (!result.dueAt) result.missing.push("due");

  return result;
}

(globalThis as any).parseQuickAdd = parseQuickAdd;
export {};
