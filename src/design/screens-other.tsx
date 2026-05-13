// @ts-nocheck
import React from "react";
const g = globalThis as any;
g.React = React;
const { Icon, Button, Badge, ConfidenceBadge, SourceBadge, CourseSwatch, Tabs, Toggle, Search, EmptyState, Menu, MenuItem, AssignmentRow, COURSES, ASSIGNMENTS, SOURCES, TODAY, getCourse, getAssignment, formatDueRelative, formatDay, formatTime, formatLong, bucketize, SOURCE_LABEL, SOURCE_ICON, DOW, MONTHS } = g;

/* global React, Icon, Button, Badge, ConfidenceBadge, SourceBadge, CourseSwatch, Tabs, Toggle, Search, EmptyState, Menu, MenuItem, AssignmentRow,
   COURSES, ASSIGNMENTS, SOURCES, TODAY, getCourse, getAssignment, formatDueRelative, formatDay, formatTime, formatLong, bucketize, SOURCE_LABEL, SOURCE_ICON, DOW, MONTHS */

const { useState: useStateO, useMemo: useMemoO } = React;

// ============================================================
// Review Queue
// ============================================================
function ReviewQueue({ assignments, onOpen, onApprove, onReject }) {
  const items = assignments.filter(a => a.confidence === "needs_review" || a.confidence === "probable");
  const [tab, setTab] = useStateO("review");
  const [confirmReject, setConfirmReject] = useStateO(null);
  const filtered = tab === "review"
    ? items.filter(a => a.confidence === "needs_review")
    : items.filter(a => a.confidence === "probable");

  return (
    <div className="main">
      <header className="page-header">
        <div className="page-header__title-block">
          <p className="page-header__eyebrow">Review queue</p>
          <h1>Help us be sure</h1>
          <p className="page-header__sub">
            We hold onto uncertain imports — from syllabi or the browser helper — until you confirm them.
            Nothing here is on your dashboard yet.
          </p>
        </div>
        <div className="page-header__actions">
          <Tabs value={tab} onChange={setTab} options={[
            { label: "Needs review", value: "review", count: items.filter(a => a.confidence === "needs_review").length },
            { label: "Probable", value: "probable", count: items.filter(a => a.confidence === "probable").length },
          ]} />
        </div>
      </header>

      {filtered.length === 0 ? (
        <EmptyState icon="shieldCheck" title="Nothing to review"
          body="When the syllabus parser or browser helper finds something uncertain, it lands here first. You can also review probable items to upgrade them."
        />
      ) : (
        <div className="review-grid">
          {filtered.map(a => {
            const c = getCourse(a.courseId);
            const isPending = confirmReject === a.id;
            return (
              <article key={a.id} className={`card rcard rcard--${a.confidence}`}>
                <span className={`rcard__confrail rcard__confrail--${a.confidence}`} aria-hidden="true" />
                <div className="rcard__head">
                  <span className={`rcard__rail color-${c.color}`} aria-hidden="true" />
                  <div style={{ minWidth: 0 }}>
                    <h3>{a.title}</h3>
                    <div className="rcard__sub">
                      <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                        <CourseSwatch color={c.color} kind="dot" />
                        <strong style={{ fontWeight: 600 }}>{c.code}</strong>
                      </span>
                      <span>·</span>
                      <SourceBadge source={a.source} />
                    </div>
                  </div>
                  <ConfidenceBadge confidence={a.confidence} />
                </div>

                <div className="rcard__due">
                  <Icon name="clock" size={13} />
                  <span>Due {formatDay(a.dueAt)} · {formatTime(a.dueAt)}</span>
                </div>

                {a.confidenceReason ? (
                  <div className="rcard__reason">
                    <Icon name="help" size={14} style={{ marginTop: 2 }} />
                    <span>{a.confidenceReason}</span>
                  </div>
                ) : null}

                {a.syllabusTextMatch ? (
                  <div className="snippet">"{a.syllabusTextMatch}"</div>
                ) : null}

                <div className="rcard__actions">
                  {isPending ? (
                    <>
                      <span style={{ flex: 1, fontSize: 12, color: "var(--danger)" }}>Reject this item?</span>
                      <Button variant="ghost" size="sm" onClick={() => setConfirmReject(null)}>Keep</Button>
                      <Button size="sm" variant="danger" icon="trash" onClick={() => { onReject(a); setConfirmReject(null); }}>Yes, reject</Button>
                    </>
                  ) : (
                    <>
                      <Button variant="ghost" size="sm" icon="trash" onClick={() => setConfirmReject(a.id)}>Reject</Button>
                      <button type="button" className="rcard__edit" onClick={() => onOpen(a)}>Edit before approving</button>
                      <Button size="sm" variant="primary" icon="check" onClick={() => onApprove(a)}>Approve</Button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Sources Page
// ============================================================
function SourceCard({ s, onSync, onUpload, syncing }) {
  const [showWhy, setShowWhy] = useStateO(false);
  const fileRef = React.useRef(null);
  const errored = s.status === "error";
  const off = s.status === "off";
  const isSyncable = s.id === "canvas" || s.id === "brightspace";
  const action = off
    ? (isSyncable
        ? { label: syncing ? "Connecting…" : "Connect", icon: "plug", onClick: onSync }
        : s.id === "syllabus"
          ? { label: "Upload file", icon: "upload", onClick: () => fileRef.current?.click() }
          : { label: "Connect", icon: "plug", onClick: () => {} })
    : errored
      ? { label: "Reconnect", icon: "refresh", onClick: onSync }
      : s.id === "syllabus"
        ? { label: "Upload file", icon: "upload", onClick: () => fileRef.current?.click() }
        : { label: syncing ? "Syncing…" : "Sync now", icon: "refresh", onClick: onSync };

  return (
    <article className={`card scard scard--${s.status}`}>
      <div className="scard__head">
        <div className="scard__brand">
          <span className="scard__icon"><Icon name={SOURCE_ICON[s.id]} size={18} /></span>
          <div>
            <h3 className="scard__name">{s.name}</h3>
            <span className="scard__type">{s.type}</span>
          </div>
        </div>
        <Badge variant={s.status === "ok" ? "success" : s.status === "warn" ? "warning" : s.status === "off" ? undefined : "danger"}
               icon={s.status === "ok" ? "check" : s.status === "off" ? undefined : "alert"}>
          {s.status === "ok" ? "Connected" : s.status === "warn" ? "Attention" : s.status === "off" ? "Off" : "Error"}
        </Badge>
      </div>

      <dl className="scard__meta">
        <div>
          <dt>Last sync</dt>
          <dd>{s.lastSync || "—"}</dd>
        </div>
        <div>
          <dt>Items</dt>
          <dd>{s.items || 0} synced</dd>
        </div>
        {s.permissions?.[0] ? (
          <div>
            <dt>Permissions</dt>
            <dd style={{ fontSize: 12 }}>{s.permissions[0]}</dd>
          </div>
        ) : null}
        <div>
          <dt>Status</dt>
          <dd>{errored ? <span style={{ color: "var(--danger)" }}>{s.error || "Sync failed"}</span> : off ? "Not connected" : "Healthy"}</dd>
        </div>
      </dl>

      {errored ? (
        <div className="scard__why">
          <button type="button" className="scard__why-toggle" onClick={() => setShowWhy(v => !v)}
                  aria-expanded={showWhy}>
            <Icon name={showWhy ? "chevronDown" : "chevronRight"} size={12} /> Why did this fail?
          </button>
          {showWhy ? (
            <div className="scard__why-body">
              <p style={{ margin: 0, fontSize: 12.5, color: "var(--text-muted)" }}>
                {s.error || "The last sync attempt did not return a successful response."} Most failures resolve by reconnecting; if it persists, check Settings → Sources for credentials or feed URL.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {s.notes?.length ? (
        <div className="scard__notes">
          {s.notes.map((n, i) => (
            <div className="scard__notes-row" key={i}>
              <Icon name="check" size={12} style={{ marginTop: 2 }} />
              <span>{n}</span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="scard__actions">
        {s.id === "syllabus" ? (
          <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,.md"
                 style={{ display: "none" }}
                 onChange={e => { const f = e.target.files?.[0]; if (f) onUpload?.(f); if (e.target) e.target.value = ""; }} />
        ) : null}
        <Button size="sm" variant={errored || off ? "primary" : undefined} icon={action.icon}
                onClick={action.onClick}
                disabled={syncing && (action.label.startsWith("Sync") || action.label.startsWith("Connecting"))}>
          {action.label}
        </Button>
      </div>
    </article>
  );
}

function SourcesPage({ onSync, syncStatus, onUpload } = {}) {
  const visible = SOURCES.filter(s => s && s.name);
  const connected = visible.filter(s => s.status === "ok").length;
  const syncing = syncStatus === "syncing";
  return (
    <div className="main">
      <header className="page-header">
        <div className="page-header__title-block">
          <p className="page-header__eyebrow">Sources</p>
          <h1>Where your assignments come from</h1>
          <p className="page-header__sub">
            {connected} of {visible.length} channel{visible.length === 1 ? "" : "s"} connected. Syllabus uploads and pasted text route uncertain items to Review first.
          </p>
        </div>
        <div className="page-header__actions">
          <Button icon="refresh" size="sm" onClick={onSync} disabled={syncing}>{syncing ? "Syncing…" : "Sync all"}</Button>
        </div>
      </header>

      <div className="source-grid">
        {visible.map(s => (
          <SourceCard key={s.id} s={s} onSync={onSync} onUpload={onUpload} syncing={syncing} />
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Calendar Page (Month + Week)
// ============================================================
function CalendarPage({ assignments, onOpen }) {
  const [view, setView] = useStateO("month");
  const [cursor, setCursor] = useStateO(() => {
    const t = new Date(TODAY);
    t.setDate(1);
    return t;
  });

  const monthLabel = `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;

  function shift(dir) {
    const nx = new Date(cursor);
    if (view === "month") nx.setMonth(nx.getMonth() + dir);
    else nx.setDate(nx.getDate() + dir * 7);
    setCursor(nx);
  }

  return (
    <div className="main">
      <header className="page-header">
        <div className="page-header__title-block">
          <p className="page-header__eyebrow">Calendar</p>
          <h1>{monthLabel}</h1>
          <p className="page-header__sub">All courses, every source. Click any item to open its details.</p>
        </div>
        <div className="page-header__actions">
          <Tabs value={view} onChange={setView} options={[
            { label: "Month", value: "month" },
            { label: "Week", value: "week" },
          ]} />
          <Button variant="ghost" size="sm" icon="chevronLeft" aria-label="Previous" onClick={() => shift(-1)} />
          <Button size="sm" onClick={() => setCursor(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1))}>Today</Button>
          <Button variant="ghost" size="sm" icon="chevronRight" aria-label="Next" onClick={() => shift(1)} />
        </div>
      </header>

      {view === "month" ? <MonthView cursor={cursor} assignments={assignments} onOpen={onOpen} /> : <WeekView cursor={cursor} assignments={assignments} onOpen={onOpen} />}
    </div>
  );
}

function MonthView({ cursor, assignments, onOpen }) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const last  = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
  const startOffset = first.getDay();
  const totalCells = Math.ceil((startOffset + last.getDate()) / 7) * 7;
  const cells = [];
  for (let i = 0; i < totalCells; i++) {
    const dt = new Date(first);
    dt.setDate(i - startOffset + 1);
    cells.push(dt);
  }
  const todayKey = new Date(TODAY).toDateString();

  return (
    <div>
      <div className="cal__grid">
        {DOW.map(d => <div key={d} className="cal__dow">{d}</div>)}
        {cells.map((dt, i) => {
          const inMonth = dt.getMonth() === cursor.getMonth();
          const isToday = dt.toDateString() === todayKey;
          const items = assignments.filter(a => new Date(a.dueAt).toDateString() === dt.toDateString())
            .sort((a,b) => new Date(a.dueAt) - new Date(b.dueAt));
          const visible = items.slice(0, 3);
          const more = items.length - visible.length;
          const density = Math.min(items.length, 4);
          return (
            <div key={i} className={`cal__day ${!inMonth ? "cal__day--out" : ""} ${isToday ? "cal__day--today" : ""}`}>
              <span className="cal__day-num">{dt.getDate()}</span>
              {visible.map(a => {
                const c = getCourse(a.courseId);
                return (
                  <button key={a.id} className="cal__chip" onClick={() => onOpen(a)}>
                    <span className={`cal__chip-rail color-${c.color}`} />
                    <span className="cal__chip-title">{a.title}</span>
                    <span className="cal__chip-time">{formatTime(a.dueAt)}</span>
                  </button>
                );
              })}
              {more > 0 ? <span className="cal__more">+{more} more</span> : null}
              {density > 0 && inMonth ? (
                <div className="cal__density" aria-label={`${items.length} due`}>
                  {[0,1,2,3].map(i => <i key={i} className={i < density ? "on" : ""} />)}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({ cursor, assignments, onOpen }) {
  // Snap cursor to start of week (Sunday)
  const start = new Date(cursor);
  start.setDate(start.getDate() - start.getDay());
  start.setHours(0,0,0,0);
  const days = Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(start);
    dt.setDate(dt.getDate() + i);
    return dt;
  });
  const todayKey = new Date(TODAY).toDateString();
  const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7 AM to 8 PM

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "60px repeat(7, 1fr)" }}>
        <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", borderRight: "1px solid var(--border)", background: "#fbfbf7" }} />
        {days.map(d => {
          const isToday = d.toDateString() === todayKey;
          return (
            <div key={d.toISOString()} style={{
              padding: "8px 10px",
              borderBottom: "1px solid var(--border)",
              borderRight: "1px solid var(--border)",
              background: "#fbfbf7",
              display: "grid", gap: 2,
            }}>
              <span style={{ fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-soft)", fontWeight: 600 }}>{DOW[d.getDay()]}</span>
              <span style={{ fontFamily: '"Source Serif 4", Georgia, serif', fontSize: 18, fontWeight: 500, color: isToday ? "var(--text)" : "var(--text-muted)" }}>
                {isToday ? <span style={{ background: "var(--text)", color: "#fff", borderRadius: 6, padding: "0 6px" }}>{d.getDate()}</span> : d.getDate()}
              </span>
            </div>
          );
        })}

        {hours.map(h => (
          <React.Fragment key={h}>
            <div style={{ padding: "10px 8px 18px", borderBottom: "1px solid var(--border)", borderRight: "1px solid var(--border)", fontSize: 11, color: "var(--text-soft)", textAlign: "right" }}>
              {((h % 12) || 12) + (h < 12 ? "a" : "p")}
            </div>
            {days.map(d => {
              const dayItems = assignments.filter(a => {
                const dt = new Date(a.dueAt);
                return dt.toDateString() === d.toDateString() && dt.getHours() === h;
              });
              return (
                <div key={d.toISOString()+h}
                     style={{ borderBottom: "1px solid var(--border)", borderRight: "1px solid var(--border)", padding: 4, minHeight: 36, display: "grid", gap: 2 }}>
                  {dayItems.map(a => {
                    const c = getCourse(a.courseId);
                    return (
                      <button key={a.id} className="cal__chip" onClick={() => onOpen(a)}
                              style={{ borderRadius: 4, padding: "4px 6px", border: `1px solid var(--${c.color === "graphite" ? "graphite" : c.color})`, background: `var(--${c.color})`, color: "#fff" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.title}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Courses Page
// ============================================================
function CoursesPage({ assignments, onOpen, onAddToCourse, onFilterCourse }) {
  const terms = Array.from(new Set(COURSES.map(c => c.term).filter(Boolean)));
  const eyebrow = terms.length > 0 ? `Courses · ${terms.join(" · ")}` : "Courses";
  const count = COURSES.length;
  const numberWords = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
  const heading = count === 0
    ? "No courses yet"
    : `${count <= 10 ? numberWords[count] : count} course${count === 1 ? "" : "s"}`;
  return (
    <div className="main">
      <header className="page-header">
        <div className="page-header__title-block">
          <p className="page-header__eyebrow">{eyebrow}</p>
          <h1>{heading}</h1>
          <p className="page-header__sub">
            {count === 0
              ? "Connect a source or paste a syllabus to start tracking courses."
              : "Each course keeps its own color across the dashboard, calendar, and review queue."}
          </p>
        </div>
      </header>

      {count === 0 ? null : (
        <div className="course-grid">
          {COURSES.map(c => {
            const courseItems = assignments.filter(a => a.courseId === c.id);
            const open = courseItems.filter(a => a.status !== "completed").length;
            const done = courseItems.filter(a => a.status === "completed").length;
            const next = courseItems.filter(a => a.status !== "completed")
              .sort((a,b) => new Date(a.dueAt) - new Date(b.dueAt))[0];
            const meta = [c.instructor, c.term].filter(Boolean).join(" · ");
            return (
              <article key={c.id} className="card ccard">
                <span className={`ccard__rail color-${c.color}`} aria-hidden="true" />
                <div className="ccard__head" style={{ paddingLeft: 8 }}>
                  <span className="ccard__code">{c.code}</span>
                  <h3 className="ccard__title">{c.title}</h3>
                  {meta ? <span className="ccard__instr">{meta}</span> : null}
                </div>

                <div className="ccard__stats">
                  <div className="ccard__stat"><b>{open}</b><span>Open</span></div>
                  <div className="ccard__stat"><b>{done}</b><span>Done</span></div>
                  <div className="ccard__stat"><b>{courseItems.length}</b><span>Total</span></div>
                </div>

                {next ? (
                  <button onClick={() => onOpen(next)}
                          style={{ background: "transparent", border: 0, padding: 0, font: "inherit", color: "inherit", textAlign: "left", cursor: "pointer", display: "grid", gap: 4 }}>
                    <span style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-soft)", fontWeight: 600 }}>Up next</span>
                    <span style={{ fontSize: 13.5, fontWeight: 500 }}>{next.title}</span>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{formatLong(next.dueAt)} · <SourceBadge source={next.source} /></span>
                  </button>
                ) : (
                  <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>No open assignments.</span>
                )}

                <div className="ccard__actions">
                  {onAddToCourse ? (
                    <Button size="sm" variant="ghost" icon="plus" onClick={() => onAddToCourse(c.id)}>Add</Button>
                  ) : null}
                  {onFilterCourse && courseItems.length > 0 ? (
                    <Button size="sm" variant="ghost" iconRight="chevronRight" onClick={() => onFilterCourse(c.id)}>View all</Button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Settings Page
// ============================================================
function SavedPip({ stamp }) {
  const [show, setShow] = useStateO(false);
  React.useEffect(() => {
    if (!stamp) return;
    setShow(true);
    const t = setTimeout(() => setShow(false), 1500);
    return () => clearTimeout(t);
  }, [stamp]);
  if (!show) return null;
  return (
    <span className="saved-pip" role="status" aria-live="polite">
      <Icon name="check" size={11} /> Saved
    </span>
  );
}

function SettingsPage({
  notificationSettings,
  notificationBusy,
  userEmail,
  onNotificationPatch,
  onEnablePush,
  onDisablePush,
  onSendTest,
  theme,
  onThemeChange,
} = {}) {
  const [section, setSection] = useStateO("appearance");
  const [savedStamp, setSavedStamp] = useStateO(0);
  const prefs = notificationSettings?.preferences;
  const settingsReady = Boolean(prefs);
  const pushSupported = notificationSettings?.pushSupported !== false;
  const pushStatus = !settingsReady
    ? "Loading"
    : !notificationSettings?.pushConfigured
    ? "Server off"
    : !pushSupported
      ? "Unsupported"
      : notificationSettings?.pushPermission === "denied"
        ? "Blocked"
        : notificationSettings?.pushPermission === "granted" && notificationSettings?.pushSubscriptionCount > 0
          ? "Enabled"
          : "Off";
  const pushAction = pushStatus === "Enabled" ? onDisablePush : onEnablePush;
  const pushActionLabel = pushStatus === "Enabled" ? "Disable" : "Enable";
  const emailConfigured = Boolean(notificationSettings?.emailConfigured);

  function patch(payload) {
    onNotificationPatch?.(payload);
    setSavedStamp(Date.now());
  }

  const sections = [
    { id: "appearance", label: "Appearance" },
    { id: "reminders",  label: "Reminders" },
    { id: "devices",    label: "Devices" },
    { id: "account",    label: "Account" },
  ];

  return (
    <div className="main">
      <header className="page-header">
        <div className="page-header__title-block">
          <p className="page-header__eyebrow">Settings</p>
          <h1>Preferences</h1>
          <p className="page-header__sub">Tune reminders and manage your account.</p>
        </div>
      </header>

      <div className="settings-grid">
        <nav className="settings-nav" aria-label="Settings sections">
          {sections.map(s => (
            <button key={s.id}
                    aria-current={section === s.id}
                    onClick={() => setSection(s.id)}>
              {s.label}
            </button>
          ))}
        </nav>

        <div className="settings-section">
          {section === "appearance" ? (
            <>
              <div className="settings-section__head">
                <h2>Appearance</h2>
              </div>
              <div className="card" style={{ padding: "0 16px" }}>
                <SRow title="Theme"
                      sub="Light keeps the editorial cream paper. Dark inverts to ink. System follows your OS."
                      ctrl={
                        <div className="theme-picker" role="radiogroup" aria-label="Theme">
                          {[
                            { value: "light",  label: "Light",  icon: "sun" },
                            { value: "dark",   label: "Dark",   icon: "moon" },
                            { value: "system", label: "System", icon: "monitor" },
                          ].map(o => (
                            <button
                              key={o.value}
                              type="button"
                              role="radio"
                              aria-checked={theme === o.value}
                              className={`theme-picker__opt ${theme === o.value ? "theme-picker__opt--on" : ""}`}
                              onClick={() => onThemeChange?.(o.value)}
                            >
                              <Icon name={o.icon} size={14} />
                              <span>{o.label}</span>
                            </button>
                          ))}
                        </div>
                      } />
              </div>
            </>
          ) : null}

          {section === "reminders" ? (
            <>
              <div className="settings-section__head">
                <h2>Reminders</h2>
                <SavedPip stamp={savedStamp} />
              </div>
              <div className="card" style={{ padding: "0 16px" }}>
                <SRow title="Email · 1 day before"
                      sub={emailConfigured
                        ? "Sent to your account email the day before each due date."
                        : "Email delivery is not configured on the server (RESEND_API_KEY / EMAIL_FROM)."}
                      ctrl={settingsReady
                        ? <Toggle checked={Boolean(prefs.email_enabled) && emailConfigured} onChange={(value) => patch({ email_enabled: value })} />
                        : <Badge>Loading</Badge>} />
                <SRow title="Push · 2 hours before"
                      sub={notificationSettings?.pushConfigured
                        ? "Short reminder on registered devices."
                        : "Web Push is not configured on the server (VAPID keys missing)."}
                      ctrl={settingsReady
                        ? <Toggle checked={Boolean(prefs.push_enabled) && Boolean(notificationSettings?.pushConfigured)} onChange={(value) => patch({ push_enabled: value })} />
                        : <Badge>Loading</Badge>} />
                <SRow title="Weekly digest"
                      sub="A summary of the coming week, sent every Sunday."
                      ctrl={settingsReady
                        ? <Toggle checked={Boolean(prefs.weekly_digest_enabled)} onChange={(value) => patch({ weekly_digest_enabled: value })} />
                        : <Badge>Loading</Badge>} />
                <SRow title="Quiet hours"
                      sub={settingsReady && prefs.quiet_hours_start && prefs.quiet_hours_end
                        ? `No reminders between ${formatTimeRange(prefs.quiet_hours_start, prefs.quiet_hours_end)}.`
                        : "Defer reminders that land in your quiet window."}
                      ctrl={settingsReady
                        ? <Toggle checked={Boolean(prefs.quiet_hours_enabled)} onChange={(value) => patch({ quiet_hours_enabled: value })} />
                        : <Badge>Loading</Badge>} />
              </div>
            </>
          ) : null}

          {section === "devices" ? (
            <>
              <div className="settings-section__head">
                <h2>Devices</h2>
              </div>
              <div className="card" style={{ padding: "0 16px" }}>
                <SRow title="This device"
                      sub={`${pushStatus}${notificationSettings?.pushSubscriptionCount ? ` · ${notificationSettings.pushSubscriptionCount} device${notificationSettings.pushSubscriptionCount === 1 ? "" : "s"} registered` : ""}`}
                      ctrl={<Button size="sm" onClick={pushAction}
                                    disabled={notificationBusy || !settingsReady || !notificationSettings?.pushConfigured || !pushSupported || pushStatus === "Blocked"}>
                        {notificationBusy ? "Working…" : pushActionLabel}
                      </Button>} />
                <SRow title="Browser push support"
                      sub={pushSupported ? "This browser can receive web push notifications." : "Push notifications are not supported in this browser."}
                      ctrl={<Badge variant={pushSupported ? "success" : undefined} icon={pushSupported ? "check" : undefined}>{pushSupported ? "Supported" : "Unsupported"}</Badge>} />
                <SRow title="Server configuration"
                      sub={notificationSettings?.pushConfigured ? "VAPID keys are present on the server." : "Server is missing VAPID keys — push cannot be enabled."}
                      ctrl={<Badge variant={notificationSettings?.pushConfigured ? "success" : "warning"}>
                        {notificationSettings?.pushConfigured ? "Ready" : "Not configured"}
                      </Badge>} />
                <SRow title="Send test notification"
                      sub={pushStatus === "Enabled"
                        ? "Fires a one-off push to every device registered on this account."
                        : "Enable push on this device first to receive test notifications."}
                      ctrl={<Button size="sm" icon="bell" onClick={onSendTest}
                                    disabled={notificationBusy || pushStatus !== "Enabled"}>
                        {notificationBusy ? "Sending…" : "Send test"}
                      </Button>} />
              </div>
            </>
          ) : null}

          {section === "account" ? (
            <>
              <div className="settings-section__head">
                <h2>Account</h2>
              </div>
              <div className="card" style={{ padding: "0 16px" }}>
                <SRow title="Signed in as"
                      sub={userEmail || "—"}
                      ctrl={<Badge>{userEmail ? "Active" : "Not signed in"}</Badge>} />
                {settingsReady && prefs?.timezone ? (
                  <SRow title="Timezone"
                        sub="Used to schedule reminders in your local time."
                        ctrl={<Badge>{prefs.timezone}</Badge>} />
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function formatTimeRange(start, end) {
  return `${formatClock(start)} and ${formatClock(end)}`;
}

function formatClock(hhmm) {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const hour12 = ((h + 11) % 12) + 1;
  const ampm = h >= 12 ? "PM" : "AM";
  return m ? `${hour12}:${String(m).padStart(2, "0")} ${ampm}` : `${hour12} ${ampm}`;
}

function SRow({ title, sub, ctrl }) {
  return (
    <div className="settings-row">
      <div>
        <p className="settings-row__title">{title}</p>
        {sub ? <p className="settings-row__sub">{sub}</p> : null}
      </div>
      {ctrl}
    </div>
  );
}

window.ReviewQueue = ReviewQueue;
window.SourcesPage = SourcesPage;
window.CalendarPage = CalendarPage;
window.CoursesPage = CoursesPage;
window.SettingsPage = SettingsPage;
