// @ts-nocheck
import React from "react";
const g = globalThis as any;
g.React = React;
const { Icon, Button, Badge, ConfidenceBadge, SourceBadge, CourseSwatch, Tabs, Toggle, EmptyState, Menu, MenuItem, AssignmentRow, COURSES, ASSIGNMENTS, SOURCES, TODAY, getCourse, getAssignment, formatDueRelative, formatDay, formatTime, formatLong, bucketize, SOURCE_LABEL, SOURCE_ICON, DOW, MONTHS, parseQuickAdd } = g;

/* global React, Icon, Button, Badge, ConfidenceBadge, SourceBadge, CourseSwatch, Tabs, Toggle, EmptyState, Menu, MenuItem, AssignmentRow,
   COURSES, ASSIGNMENTS, SOURCES, TODAY, getCourse, getAssignment, formatDueRelative, formatDay, formatTime, formatLong, bucketize, SOURCE_LABEL, SOURCE_ICON, DOW, MONTHS, parseQuickAdd */

const { useState: useStateS, useMemo, useEffect: useEffectS, Fragment } = React;

// Course monogram — derives 1-2 letters from course code
function Monogram({ course, size = "" }) {
  const m = course.code.match(/[A-Z]+/);
  const letters = m ? m[0].slice(0, 2) : course.code.slice(0, 2);
  const cls = `monogram ${size === "lg" ? "monogram--lg " : ""}monogram--${course.color}`;
  return <span className={cls} aria-hidden="true">{letters}</span>;
}

// 14-day deadline strip — every assignment as a course-colored bar
function DeadlineStrip({ assignments, onOpen }) {
  const days = useMemo(() => {
    const arr = [];
    const start = new Date(TODAY); start.setHours(0,0,0,0);
    for (let i = 0; i < 14; i++) {
      const dt = new Date(start);
      dt.setDate(start.getDate() + i);
      arr.push(dt);
    }
    return arr;
  }, []);
  const todayKey = new Date(TODAY).toDateString();

  return (
    <section className="dstrip" aria-label="Two-week deadline timeline">
      <div className="dstrip__head">
        <span className="dstrip__title">The Fortnight · 14-day outlook</span>
        <div className="dstrip__legend">
          {COURSES.slice(0, 6).map(c => (
            <span key={c.id}><CourseSwatch color={c.color} kind="dot" /> {c.code}</span>
          ))}
        </div>
      </div>
      <div className="dstrip__rail">
        {days.map((dt, i) => {
          const items = assignments
            .filter(a => new Date(a.dueAt).toDateString() === dt.toDateString() && a.status !== "completed" && a.status !== "archived")
            .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));
          const isToday = dt.toDateString() === todayKey;
          return (
            <div key={i} className={`dstrip__col ${isToday ? "dstrip__col--today" : ""}`}>
              <span className="dstrip__dow">{DOW[dt.getDay()].slice(0,1)}</span>
              <div className="dstrip__bars">
                {items.map(a => {
                  const c = getCourse(a.courseId);
                  return (
                    <button
                      key={a.id}
                      className={`dstrip__bar ${a.confidence === "needs_review" ? "dstrip__bar--review" : ""}`}
                      style={{ background: `var(--${c.color})` }}
                      title={`${a.title} · ${c.code} · ${formatTime(a.dueAt)}`}
                      onClick={() => onOpen(a)}
                      aria-label={`${a.title}, ${c.code}, due ${formatTime(a.dueAt)}`}
                    />
                  );
                })}
              </div>
              <span className="dstrip__day-num">{dt.getDate()}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ============================================================
// Quick-add bar — single-line natural-language entry
// ============================================================
function QuickAddBar({ onSubmit, onOpenDialog }) {
  const [value, setValue] = useStateS("");
  const [parsed, setParsed] = useStateS(null);
  const inputRef = React.useRef(null);
  const debounceRef = React.useRef(null);

  useEffectS(() => {
    function focus() { inputRef.current?.focus(); }
    (window as any)._focusQuickAdd = focus;
    return () => { if ((window as any)._focusQuickAdd === focus) delete (window as any)._focusQuickAdd; };
  }, []);

  useEffectS(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) { setParsed(null); return; }
    debounceRef.current = setTimeout(() => {
      try {
        const p = parseQuickAdd(value, COURSES, new Date());
        setParsed(p);
      } catch (e) {
        setParsed(null);
      }
    }, 150);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [value]);

  const canSubmitDirect = parsed && parsed.title && (parsed.courseId || parsed.courseCode) && parsed.dueAt;

  function handleSubmit(e) {
    e?.preventDefault?.();
    if (!value.trim()) return;
    if (canSubmitDirect) {
      onSubmit({
        title: parsed.title,
        courseId: parsed.courseId,
        courseCode: parsed.courseCode,
        courseTitle: parsed.courseCode,
        dueAt: parsed.dueAt,
        notes: "",
      });
      setValue("");
      setParsed(null);
    } else {
      openDialog();
    }
  }

  function openDialog() {
    onOpenDialog({
      title: parsed?.title || value.trim(),
      courseId: parsed?.courseId,
      courseCode: parsed?.courseCode,
      dueAt: parsed?.dueAt,
    });
    setValue("");
    setParsed(null);
  }

  function summary() {
    if (!parsed) return null;
    const bits = [];
    if (parsed.courseId) {
      const c = getCourse(parsed.courseId);
      bits.push({ label: `${c.code}`, kind: "ok" });
    } else if (parsed.courseCode) {
      bits.push({ label: `+ new course: ${parsed.courseCode}`, kind: "ok" });
    }
    if (parsed.dueAt) {
      bits.push({ label: formatLong(parsed.dueAt), kind: "ok" });
    }
    if (parsed.title) {
      bits.push({ label: `"${parsed.title}"`, kind: "ok" });
    }
    return bits;
  }

  const summaryBits = summary();
  const missing = parsed ? parsed.missing : [];

  return (
    <section className="quickadd" aria-label="Quick add assignment">
      <form className="quickadd__form" onSubmit={handleSubmit}>
        <span className="quickadd__icon" aria-hidden="true"><Icon name="plus" size={14} /></span>
        <label className="sr-only" htmlFor="quickadd-input">Add an assignment</label>
        <input
          ref={inputRef}
          id="quickadd-input"
          className="quickadd__input"
          type="text"
          autoComplete="off"
          spellCheck={false}
          placeholder="PSet 11 MKT 3010 fri 11pm"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") { setValue(""); setParsed(null); (e.target as HTMLInputElement).blur(); }
          }}
        />
        <kbd className="quickadd__hint" aria-hidden="true">N</kbd>
        <Button variant="primary" size="sm" type="submit" icon={canSubmitDirect ? "plus" : "chevronRight"} disabled={!value.trim()}>
          {canSubmitDirect ? "Add" : "Details"}
        </Button>
      </form>
      {summaryBits && summaryBits.length > 0 ? (
        <div className="quickadd__parsed" role="status" aria-live="polite">
          <span className="quickadd__parsed-arrow" aria-hidden="true">→</span>
          {summaryBits.map((b, i) => (
            <Fragment key={i}>
              {i > 0 ? <span className="quickadd__parsed-sep" aria-hidden="true">·</span> : null}
              <span className="quickadd__parsed-bit">{b.label}</span>
            </Fragment>
          ))}
          {missing.length > 0 ? (
            <span className="quickadd__missing">
              {" "}— missing {missing.map(m => m === "due" ? "date" : m).join(", ")}
            </span>
          ) : null}
          <button type="button" className="quickadd__edit" onClick={openDialog}>Edit details</button>
        </div>
      ) : value.trim() ? (
        <div className="quickadd__parsed quickadd__parsed--hint">
          <span className="quickadd__parsed-arrow" aria-hidden="true">→</span>
          <span>Press Enter to fill in details</span>
        </div>
      ) : (
        <div className="quickadd__parsed quickadd__parsed--hint">
          <span>Try: <em>Lab 4 PSY 2101 tomorrow 5pm</em>  ·  <em>Essay HIST 2110 fri</em>  ·  press <kbd>N</kbd> to focus</span>
        </div>
      )}
    </section>
  );
}

// ============================================================
// Dashboard Page (editorial)
// ============================================================
function DashboardPage({ assignments, onOpen, onToggle, onNav, onSetStatus, onSync, onArchive, onDelete, onOpenSource, onQuickAdd, onOpenDialogPrefilled, initialFilter, onFilterChange }) {
  const [filter, setFilter] = useStateS(initialFilter || "all");
  const [showAllUpcoming, setShowAllUpcoming] = useStateS(false);

  useEffectS(() => {
    if (initialFilter !== undefined && initialFilter !== filter) setFilter(initialFilter);
  }, [initialFilter]);

  useEffectS(() => {
    if (onFilterChange && filter !== initialFilter) onFilterChange(filter);
  }, [filter]);
  const buckets = useMemo(() => bucketize(assignments), [assignments]);
  const activeAssignments = assignments.filter(a => a.status !== "completed" && a.status !== "archived");

  const completedCount = assignments.filter(a => a.status === "completed").length;
  const totalCount = assignments.length || 1;
  const completionRate = Math.round((completedCount / totalCount) * 100);
  const overdueCount = buckets.overdue.length;
  const onTimeRate = completedCount === 0 ? 100 : Math.round(((completedCount - assignments.filter(a => a.status === "completed" && new Date(a.dueAt) < new Date(a.completedAt || Date.now())).length) / completedCount) * 100);
  const openCount = activeAssignments.length;
  const dueThisWeek = buckets.today.length + buckets.thisWeek.length;

  const filtered = (list) => list.filter(a => {
    if (filter !== "all" && a.courseId !== filter) return false;
    return true;
  });

  const nextDue = buckets.today[0] || buckets.thisWeek[0] || buckets.upcoming[0];
  const nextCourse = nextDue ? getCourse(nextDue.courseId) : null;

  const todayDt = new Date(TODAY);
  const dateLong = todayDt.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const issueNo = Math.abs(Math.ceil((todayDt - new Date(2026, 0, 12)) / (1000*60*60*24*7))) + 1;


  return (
    <div className="main">
      {/* Editorial Masthead — date-led */}
      <header className="masthead">
        <div className="masthead__topline">
          <div className="masthead__topline-left">
            <span>Vol. III · No. {issueNo}</span>
            <span>{SOURCES.filter(s => s.status === "ok").length} source{SOURCES.filter(s => s.status === "ok").length === 1 ? "" : "s"} active</span>
          </div>
          <div className="masthead__topline-right">
            <span style={{ color: SOURCES.every(s => s.status === "ok" || s.status === "off") ? "var(--success)" : "var(--warning)" }}>● {assignments.length} items tracked</span>
            <span>{COURSES.length} course{COURSES.length === 1 ? "" : "s"}</span>
          </div>
        </div>
        <div className="masthead__title-block">
          <div className="masthead__date">
            <span className="masthead__dow">{todayDt.toLocaleDateString("en-US", { weekday: "long" })}</span>
            <h1 className="masthead__headline">
              <span className="masthead__month">{todayDt.toLocaleDateString("en-US", { month: "long" })}</span>
              <span className="masthead__day">{todayDt.getDate()}</span>
            </h1>
            <span className="masthead__year">{todayDt.getFullYear()}</span>
          </div>
          <div className="masthead__byline">
            <p className="masthead__sub">
              {buckets.today.length === 0 ? "A clear day." : `${buckets.today.length} ${buckets.today.length === 1 ? "task" : "tasks"} due today.`} {buckets.thisWeek.length} more this week. {assignments.length > 0 ? `Sorted by what's next, filed from ${SOURCES.filter(s => s.status === "ok").length} active source${SOURCES.filter(s => s.status === "ok").length === 1 ? "" : "s"}.` : "No items yet — connect a source or upload a syllabus to begin."}
            </p>
          </div>
        </div>
      </header>

      {/* Quick add — single-line entry */}
      <QuickAddBar onSubmit={onQuickAdd} onOpenDialog={onOpenDialogPrefilled} />

      {/* By the Numbers — editorial stat band */}
      <section className="bynumbers" aria-label="By the numbers">
        <div className="bynumbers__head">
          <span className="bynumbers__rubric">By the numbers</span>
          <span className="bynumbers__sub">Live from your tracked assignments.</span>
        </div>
        <div className="bynumbers__row">
          <article className="stat">
            <span className="stat__label">Completion rate</span>
            <span className="stat__big stat__big--accent">{completionRate}<span className="stat__unit">%</span></span>
            <div className="stat__handprog" aria-hidden="true">
              <svg viewBox="0 0 200 14" preserveAspectRatio="none">
                <path d="M2,8 Q40,4 80,7 T160,6 T198,7" fill="none" stroke="var(--border-strong)" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M2,8 Q40,4 80,7 T160,6" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" pathLength="100" strokeDasharray={`${completionRate} 100`}/>
              </svg>
            </div>
            <span className="stat__caption">{completedCount} of {assignments.length} done</span>
          </article>
          <article className="stat">
            <span className="stat__label">Open items</span>
            <span className="stat__big">
              {openCount}<span className="stat__unit">{openCount === 1 ? "task" : "tasks"}</span>
            </span>
            <div className="stat__dots">
              {Array.from({ length: 14 }, (_, i) => (
                <span key={i} className={i < Math.min(14, openCount) ? "on" : ""} />
              ))}
            </div>
            <span className="stat__caption">{overdueCount} overdue · {buckets.today.length} today</span>
          </article>
          <article className="stat">
            <span className="stat__label">On-time rate</span>
            <span className="stat__big">{onTimeRate}<span className="stat__unit">%</span></span>
            <div className="stat__pie" style={{ "--p": `${onTimeRate}%` }} aria-hidden="true">
              <span className="stat__pie-num">{onTimeRate}</span>
            </div>
            <span className="stat__caption">{completedCount} completed</span>
          </article>
          <article className="stat">
            <span className="stat__label">Due this week</span>
            <span className="stat__big">{dueThisWeek}<span className="stat__unit">{dueThisWeek === 1 ? "task" : "tasks"}</span></span>
            <div className="stat__hourbar" aria-hidden="true">
              {COURSES.slice(0, 6).map((c, i) => {
                const n = assignments.filter(a => a.courseId === c.id && (buckets.today.includes(a) || buckets.thisWeek.includes(a))).length;
                if (n === 0) return null;
                return <span key={c.id} style={{ flex: n, background: `var(--${c.color})` }} title={`${c.code}: ${n}`} />;
              })}
              {dueThisWeek === 0 ? <span style={{ flex: 1, background: "var(--border)" }} /> : null}
            </div>
            <span className="stat__caption">{COURSES.length} course{COURSES.length === 1 ? "" : "s"} · sorted by load</span>
          </article>
        </div>
      </section>

      {/* Up next + summary tallies */}
      {nextDue ? (
        <section className="upnext">
          <span className="upnext__mono">{(() => {
            const m = nextCourse.code.match(/[A-Z]+/);
            return m ? m[0].slice(0, 2) : nextCourse.code.slice(0, 2);
          })()}</span>
          <div className="upnext__body">
            <span className="upnext__eyebrow">Up next · {formatDueRelative(nextDue.dueAt).rel}</span>
            <h2 className="upnext__title">{nextDue.title}</h2>
            <span className="upnext__meta">
              <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                <span className="swatch swatch--dot" style={{ background: "#fff", opacity: 0.7 }} />
                {nextCourse.code} · {nextCourse.title}
              </span>
              <span style={{ color: "rgba(255,255,255,0.3)" }}>·</span>
              <span>{formatLong(nextDue.dueAt)}</span>
              <span style={{ color: "rgba(255,255,255,0.3)" }}>·</span>
              <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}>
                <Icon name={SOURCE_ICON[nextDue.source]} size={12} />
                {SOURCE_LABEL[nextDue.source]}
              </span>
            </span>
          </div>
          <div className="upnext__cta">
            <Button size="sm" onClick={() => onOpen(nextDue)}>Open details</Button>
            <Button variant="primary" size="sm" onClick={() => onSetStatus && onSetStatus(nextDue, nextDue.status === "in_progress" ? "not_started" : "in_progress")}>
              {nextDue.status === "in_progress" ? "Pause" : "Mark in progress"}
            </Button>
          </div>
        </section>
      ) : null}

      {/* The Fortnight: 14-day strip */}
      <DeadlineStrip assignments={assignments} onOpen={onOpen} />

      {/* Course filter chips */}
      <div className="chipbar">
        <button className="chip" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
          All courses <span className="chip__count">{activeAssignments.length}</span>
        </button>
        {COURSES.map(c => {
          const count = activeAssignments.filter(a => a.courseId === c.id).length;
          return (
            <button key={c.id} className="chip" aria-pressed={filter === c.id} onClick={() => setFilter(c.id)}>
              <CourseSwatch color={c.color} kind="dot" />
              {c.code}
              <span className="chip__count">{count}</span>
            </button>
          );
        })}
      </div>

      {buckets.overdue.length > 0 ? (
        <Section num="i." title="Overdue" count={buckets.overdue.length} eyebrow="Past due" tone="warn">
          <List items={filtered(buckets.overdue)} onOpen={onOpen} onToggle={onToggle}
                onOpenSource={onOpenSource} onArchive={onArchive} onDelete={onDelete}
                empty="No overdue items." emptyIcon="check"/>
        </Section>
      ) : null}

      <Section num={buckets.overdue.length > 0 ? "ii." : "i."} title="Today" count={buckets.today.length} eyebrow={dateLong.split(",")[0]}>
        <List items={filtered(buckets.today)} onOpen={onOpen} onToggle={onToggle}
              onOpenSource={onOpenSource} onArchive={onArchive} onDelete={onDelete}
              empty="Nothing due today. Pick something from this week to get a head start."
              emptyIcon="check" />
      </Section>

      <Section num={buckets.overdue.length > 0 ? "iii." : "ii."} title="This Week" count={buckets.thisWeek.length} eyebrow="Next 7 days">
        <List items={filtered(buckets.thisWeek)} onOpen={onOpen} onToggle={onToggle}
              onOpenSource={onOpenSource} onArchive={onArchive} onDelete={onDelete}
              empty="Nothing this week — your week is clear." emptyIcon="calendar" />
      </Section>

      <Section num={buckets.overdue.length > 0 ? "iv." : "iii."} title="Upcoming" count={buckets.upcoming.length} eyebrow="Beyond this week">
        <List items={filtered(buckets.upcoming).slice(0, showAllUpcoming ? undefined : 4)} onOpen={onOpen} onToggle={onToggle}
              onOpenSource={onOpenSource} onArchive={onArchive} onDelete={onDelete}
              empty="Nothing further yet." emptyIcon="calendar" />
        {buckets.upcoming.length > 4 ? (
          <div style={{ textAlign: "center" }}>
            <Button variant="ghost" size="sm" iconRight={showAllUpcoming ? "chevronDown" : "chevronRight"} onClick={() => setShowAllUpcoming(v => !v)}>
              {showAllUpcoming ? "Show less" : `Show ${buckets.upcoming.length - 4} more`}
            </Button>
          </div>
        ) : null}
      </Section>

      <Section num={buckets.overdue.length > 0 ? "v." : "iv."} title="Needs Review" count={buckets.review.length} eyebrow="Uncertain imports">
        <div style={{ display: "grid", gap: 6 }}>
          {filtered(buckets.review).slice(0, 3).map(a => (
            <AssignmentRow key={a.id} a={a} course={getCourse(a.courseId)} onOpen={onOpen} onToggle={onToggle} />
          ))}
          {filtered(buckets.review).length > 3 ? (
            <div style={{ textAlign: "center", marginTop: 4 }}>
              <Button variant="ghost" size="sm" iconRight="chevronRight" onClick={() => onNav("review")}>Open the review queue</Button>
            </div>
          ) : null}
          {filtered(buckets.review).length === 0 ? (
            <EmptyState icon="shieldCheck" title="Nothing waiting for review" body="Anything uncertain from a syllabus or browser helper will land here first." />
          ) : null}
        </div>
      </Section>

      {/* Folio */}
      <div className="folio">
        <span>End of dashboard</span>
        <span>Lazy · {todayDt.getFullYear()} · Compiled from {SOURCES.filter(s => s.status === "ok").length} source{SOURCES.filter(s => s.status === "ok").length === 1 ? "" : "s"}</span>
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} style={{ background: "transparent", border: 0, cursor: "pointer", font: "inherit", color: "inherit" }}>↑ Back to top</button>
      </div>
    </div>
  );
}

function Section({ num, title, count, eyebrow, tone, children }) {
  return (
    <section className="section">
      <div className="section__head">
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          {num ? <span className="section__num">§ {num}</span> : null}
          <h2 className="serif">{title}</h2>
          <small>{count} {count === 1 ? "item" : "items"}</small>
        </div>
        <span className="ornament" />
        <div className="section__head-meta">
          {eyebrow ? <span style={{ fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", color: tone === "warn" ? "var(--brick)" : "var(--text-soft)", fontWeight: 700 }}>{eyebrow}</span> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function List({ items, onOpen, onToggle, onOpenSource, onArchive, onDelete, empty, emptyIcon }) {
  if (items.length === 0) {
    return <EmptyState icon={emptyIcon} title={empty} />;
  }
  return (
    <div className="alist">
      {items.map(a => (
        <AssignmentRow
          key={a.id}
          a={a}
          course={getCourse(a.courseId)}
          onOpen={onOpen}
          onToggle={onToggle}
          onOpenSource={onOpenSource}
          onArchive={onArchive}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

// ============================================================
// Right Rail (with workload chart)
// ============================================================
function reminderHealth(notificationSettings) {
  if (!notificationSettings?.preferences) {
    return {
      email: { label: "Loading", variant: undefined, icon: undefined },
      push: { label: "Loading", variant: undefined, icon: undefined },
    };
  }
  const prefs = notificationSettings?.preferences;
  const emailEnabled = Boolean(prefs?.email_enabled);
  const pushPreferenceEnabled = Boolean(prefs?.push_enabled);
  const pushReady = Boolean(
    notificationSettings?.pushConfigured &&
    notificationSettings?.pushSupported &&
    notificationSettings?.pushPermission === "granted" &&
    notificationSettings?.pushSubscriptionCount > 0,
  );
  return {
    email: {
      label: emailEnabled ? "Enabled" : "Off",
      variant: emailEnabled ? "success" : undefined,
      icon: emailEnabled ? "check" : undefined,
    },
    push: {
      label: !pushPreferenceEnabled
        ? "Off"
        : pushReady
          ? "Ready"
          : notificationSettings?.pushPermission === "denied"
            ? "Blocked"
            : "Needs device",
      variant: pushPreferenceEnabled && pushReady ? "success" : undefined,
      icon: pushPreferenceEnabled && pushReady ? "check" : undefined,
    },
  };
}

function RightRail({ assignments, onNav, onOpen, onSync, notificationSettings }) {
  const buckets = bucketize(assignments);
  const counts = {
    confirmed: assignments.filter(a => a.confidence === "confirmed" && a.status !== "completed").length,
    probable: assignments.filter(a => a.confidence === "probable" && a.status !== "completed").length,
    review: assignments.filter(a => a.confidence === "needs_review").length,
  };
  const total = counts.confirmed + counts.probable + counts.review || 1;

  // Workload by day (next 7)
  const workload = useMemo(() => {
    const start = new Date(TODAY); start.setHours(0,0,0,0);
    return Array.from({ length: 7 }, (_, i) => {
      const dt = new Date(start);
      dt.setDate(start.getDate() + i);
      const items = assignments.filter(a =>
        new Date(a.dueAt).toDateString() === dt.toDateString() && a.status !== "completed"
      );
      return { dt, count: items.length };
    });
  }, [assignments]);
  const maxLoad = Math.max(1, ...workload.map(w => w.count));

  const next3 = [...buckets.today, ...buckets.thisWeek, ...buckets.upcoming].slice(0, 4);
  const reminders = reminderHealth(notificationSettings);

  return (
    <aside className="right-rail" aria-label="Assistant panel">
      {/* Workload */}
      <div className="card rail-card">
        <div className="rail-card__head">
          <h3>Workload · 7 days</h3>
          <Badge>{workload.reduce((s,w) => s + w.count, 0)} due</Badge>
        </div>
        <div className="workload" aria-hidden="true">
          {workload.map((w, i) => {
            const today = i === 0;
            const cls = today ? "workload__col--today" : w.count === 0 ? "workload__col--zero" : w.count <= 1 ? "workload__col--low" : "";
            const h = w.count === 0 ? 2 : Math.max(8, Math.round((w.count / maxLoad) * 56));
            return (
              <div key={i} className={`workload__col ${cls}`}>
                <div className="workload__bar" style={{ height: h }} title={`${w.count} due`} />
                <span className="workload__day">{DOW[w.dt.getDay()].slice(0,1)}</span>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--text-muted)" }}>
          <span>Lightest: {(() => {
            const min = workload.filter(w => w.count > 0).sort((a,b) => a.count - b.count)[0];
            return min ? DOW[min.dt.getDay()] : "—";
          })()}</span>
          <span>Heaviest: {(() => {
            const max = [...workload].sort((a,b) => b.count - a.count)[0];
            return max ? `${DOW[max.dt.getDay()]} (${max.count})` : "—";
          })()}</span>
        </div>
      </div>

      {/* Sync status */}
      <div className="card rail-card">
        <div className="rail-card__head">
          <h3>Sync status</h3>
          <Button variant="ghost" size="sm" icon="refresh" aria-label="Refresh all" onClick={onSync} />
        </div>
        <div className="sync-list">
          {SOURCES.slice(0, 5).map(s => (
            <div className="sync-row" key={s.id}>
              <span className={`sync-dot ${s.status === "ok" ? "" : s.status === "warn" ? "sync-dot--warn" : "sync-dot--err"}`} aria-hidden="true" />
              <div style={{ display: "grid" }}>
                <span className="sync-row__name">{s.name}</span>
                <span className="sync-row__time">{s.error ? s.error : `Synced ${s.lastSync}`}</span>
              </div>
              <Icon name={SOURCE_ICON[s.id]} size={13} style={{ color: "var(--text-soft)" }} />
            </div>
          ))}
        </div>
        <Button variant="ghost" size="sm" iconRight="chevronRight" onClick={() => onNav("sources")} style={{ justifySelf: "start" }}>
          Manage sources
        </Button>
      </div>

      {/* Next deadlines */}
      <div className="card rail-card">
        <div className="rail-card__head">
          <h3>Next deadlines</h3>
        </div>
        <div className="deadlines">
          {next3.map(a => {
            const dt = new Date(a.dueAt);
            const c = getCourse(a.courseId);
            return (
              <button key={a.id} className="deadline" onClick={() => onOpen(a)}
                      style={{ background: "transparent", border: 0, padding: 0, font: "inherit", color: "inherit", textAlign: "left", cursor: "pointer" }}>
                <div className="deadline__date">
                  <span>{MONTHS[dt.getMonth()].slice(0,3).toUpperCase()}</span>
                  <b>{dt.getDate()}</b>
                </div>
                <div style={{ minWidth: 0 }}>
                  <p className="deadline__title">{a.title}</p>
                  <span className="deadline__sub">
                    <CourseSwatch color={c.color} kind="dot" />
                    {c.code} · {formatTime(a.dueAt)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Confidence health */}
      <div className="card rail-card">
        <div className="rail-card__head">
          <h3>Confidence</h3>
          <Badge>{Math.round(counts.confirmed / total * 100)}%</Badge>
        </div>
        <div className="health-bar" aria-hidden="true">
          <span className="h-confirmed" style={{ flex: counts.confirmed }} />
          <span className="h-probable"  style={{ flex: counts.probable }} />
          <span className="h-review"    style={{ flex: counts.review }} />
        </div>
        <div className="health-legend">
          <div className="health-legend__row">
            <span className="swatch swatch--dot" style={{ background: "var(--success)" }} />
            <b>Confirmed</b><span>{counts.confirmed}</span>
          </div>
          <div className="health-legend__row">
            <span className="swatch swatch--dot" style={{ background: "var(--warning)" }} />
            <b>Probable</b><span>{counts.probable}</span>
          </div>
          <div className="health-legend__row">
            <span className="swatch swatch--dot" style={{ background: "var(--brick)" }} />
            <b>Needs review</b><span>{counts.review}</span>
          </div>
        </div>
      </div>

      {/* Reminders */}
      <div className="card rail-card">
        <div className="rail-card__head">
          <h3>Reminder health</h3>
        </div>
        <div style={{ display: "grid", gap: 8, fontSize: 13 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "var(--text-muted)" }}>Email reminders</span>
            <Badge variant={reminders.email.variant} icon={reminders.email.icon}>{reminders.email.label}</Badge>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "var(--text-muted)" }}>Push reminders</span>
            <Badge variant={reminders.push.variant} icon={reminders.push.icon}>{reminders.push.label}</Badge>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "var(--text-muted)" }}>Active devices</span>
            <Badge>{notificationSettings?.pushSubscriptionCount || 0}</Badge>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ============================================================
// Assignment Detail Drawer
// ============================================================
function AssignmentDetail({ a, onClose, onToggle, onOpenSource, onArchive, onDelete, onSetStatus, onEdit, notificationSettings }) {
  if (!a) return null;
  const c = getCourse(a.courseId);
  const conf = CONFIDENCE_PRESENT[a.confidence];
  const due = formatDueRelative(a.dueAt);
  const reminders = reminderHealth(notificationSettings);

  return (
    <Fragment>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Assignment details">
        <header className="drawer__head">
          <div style={{ minWidth: 0, display: "grid", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Monogram course={c} />
              <div style={{ display: "grid" }}>
                <span style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-soft)", fontWeight: 700 }}>
                  {c.code} · {c.title}
                </span>
                {c.instructor ? (
                  <span style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic", fontFamily: '"Source Serif 4", Georgia, serif' }}>{c.instructor}</span>
                ) : null}
              </div>
            </div>
            <h2>{a.title}</h2>
            <div className="drawer__head-meta">
              <ConfidenceBadge confidence={a.confidence} />
              {a.status === "in_progress" ? <Badge variant="info" icon="clock">In progress</Badge> : null}
              {a.status === "overdue"     ? <Badge variant="danger" icon="alert">Overdue</Badge> : null}
              {a.status === "completed"   ? <Badge variant="success" icon="check">Complete</Badge> : null}
              {a.status === "archived"    ? <Badge icon="archive">Archived</Badge> : null}
            </div>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {onEdit ? (
              <Button variant="ghost" icon="edit" aria-label="Edit assignment" onClick={() => { onEdit(a); onClose && onClose(); }} title="Edit" />
            ) : null}
            <Button variant="ghost" icon="x" aria-label="Close" onClick={onClose} />
          </div>
        </header>

        <div className="drawer__body">
          {/* Trust panel */}
          <section className="detail-section">
            <h3>Why this is trusted</h3>
            <div style={{
              display: "grid", gap: 12,
              padding: 14,
              background: "#fbfbf7",
              border: "1px solid var(--border)",
              borderRadius: 8,
            }}>
              <div style={{ display: "grid", gridTemplateColumns: "20px 1fr", gap: 10 }}>
                <Icon name={a.confidence === "confirmed" ? "shieldCheck" : a.confidence === "probable" ? "shield" : "shieldQuestion"} size={18} />
                <div>
                  <p style={{ margin: 0, fontWeight: 600 }}>{conf.label}</p>
                  <p style={{ margin: "2px 0 0", color: "var(--text-muted)", fontSize: 13 }}>
                    {a.confidenceReason || (a.source === "manual" ? "Manually entered." : `Imported from ${SOURCE_LABEL[a.source]}.`)}
                  </p>
                </div>
              </div>
              {a.syllabusTextMatch ? (
                <div className="snippet">"{a.syllabusTextMatch}"</div>
              ) : null}
            </div>
          </section>

          {/* Facts */}
          <section className="detail-section">
            <h3>Details</h3>
            <dl className="detail-grid">
              <dt>Due</dt>
              <dd>
                <strong>{formatLong(a.dueAt)}</strong>
                <span style={{ color: "var(--text-muted)", marginLeft: 8 }}>({due.rel})</span>
              </dd>
              <dt>Course</dt>
              <dd>
                <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                  <CourseSwatch color={c.color} kind="dot" />
                  {c.code} · {c.title}
                </span>
              </dd>
              <dt>Source</dt>
              <dd style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                <Icon name={SOURCE_ICON[a.source]} size={14} />
                {SOURCE_LABEL[a.source]}
                {a.sourceUrl && onOpenSource ? (
                  <button
                    type="button"
                    onClick={() => onOpenSource(a)}
                    style={{ marginLeft: 6, color: "var(--info)", display: "inline-flex", gap: 4, alignItems: "center", background: "transparent", border: 0, padding: 0, font: "inherit", cursor: "pointer" }}
                  >
                    <Icon name="external" size={12} /> open
                  </button>
                ) : null}
              </dd>
              <dt>Status</dt>
              <dd>{a.status.replace("_"," ")}</dd>
              {a.completedAt ? (<><dt>Completed</dt><dd>{formatLong(a.completedAt)}</dd></>) : null}
            </dl>
          </section>

          {/* Reminders */}
          <section className="detail-section">
            <h3>Reminders</h3>
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 13 }}>Email · 1 day before</span>
                <Badge variant={reminders.email.variant} icon={reminders.email.icon}>{reminders.email.label}</Badge>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 13 }}>Push · 2 hours before</span>
                <Badge variant={reminders.push.variant} icon={reminders.push.icon}>{reminders.push.label}</Badge>
              </div>
            </div>
            <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
              Defaults applied to every assignment. Adjust the channel toggles in Settings → Reminders.
            </p>
          </section>

          {a.notes ? (
            <section className="detail-section">
              <h3>Notes</h3>
              <div style={{
                padding: 14, border: "1px solid var(--border)", borderRadius: 8,
                fontSize: 14, lineHeight: 1.55,
                fontFamily: '"Source Serif 4", Georgia, serif',
                background: "#fbfbf7", whiteSpace: "pre-wrap",
              }}>
                {a.notes}
              </div>
            </section>
          ) : null}
        </div>

        <footer className="drawer__foot">
          <Button icon="check" onClick={() => onToggle(a)}>
            {a.status === "completed" ? "Mark incomplete" : "Mark complete"}
          </Button>
          {a.status !== "completed" && a.status !== "archived" ? (
            <Button
              icon={a.status === "in_progress" ? "clock" : "play"}
              variant="ghost"
              onClick={() => onSetStatus && onSetStatus(a, a.status === "in_progress" ? "not_started" : "in_progress")}
            >
              {a.status === "in_progress" ? "Pause" : "Mark in progress"}
            </Button>
          ) : null}
          {a.sourceUrl && onOpenSource ? (
            <Button icon="external" variant="ghost" onClick={() => onOpenSource(a)}>Open in {SOURCE_LABEL[a.source]}</Button>
          ) : null}
          <div style={{ flex: 1 }} />
          <Menu trigger={<Button variant="ghost" icon="more" aria-label="More" />}>
            {a.status !== "archived" ? (
              <MenuItem icon="archive" onSelect={() => { onArchive && onArchive(a); onClose && onClose(); }}>Archive</MenuItem>
            ) : null}
            <MenuItem icon="trash" danger onSelect={() => { onDelete && onDelete(a); onClose && onClose(); }}>Delete</MenuItem>
          </Menu>
        </footer>
      </aside>
    </Fragment>
  );
}

window.DashboardPage = DashboardPage;
window.RightRail = RightRail;
window.AssignmentDetail = AssignmentDetail;
window.Monogram = Monogram;
