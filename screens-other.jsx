/* global React, Icon, Button, Badge, ConfidenceBadge, SourceBadge, CourseSwatch, Tabs, Toggle, Search, EmptyState, Menu, MenuItem, AssignmentRow,
   COURSES, ASSIGNMENTS, SOURCES, TODAY, getCourse, getAssignment, formatDueRelative, formatDay, formatTime, formatLong, bucketize, SOURCE_LABEL, SOURCE_ICON, DOW, MONTHS */

const { useState: useStateO, useMemo: useMemoO } = React;

// ============================================================
// Review Queue
// ============================================================
function ReviewQueue({ assignments, onOpen, onApprove, onReject }) {
  const items = assignments.filter(a => a.confidence === "needs_review" || a.confidence === "probable");
  const [tab, setTab] = useStateO("review");
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
            const dup = a.duplicateOf ? getAssignment(a.duplicateOf) : null;
            return (
              <article key={a.id} className="card rcard">
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

                <div className="rcard__reason">
                  <Icon name="help" size={14} style={{ marginTop: 2 }} />
                  <span>{a.confidenceReason}</span>
                </div>

                {a.syllabusTextMatch ? (
                  <div className="snippet">"{a.syllabusTextMatch}"</div>
                ) : null}

                {dup ? (
                  <div className="rcard__dup">
                    <div>
                      <p className="rcard__dup-title" style={{ margin: 0 }}>
                        Possible match: <em style={{ fontStyle: "normal", fontFamily: '"Source Serif 4", Georgia, serif' }}>{dup.title}</em>
                      </p>
                      <span className="rcard__dup-sub">{SOURCE_LABEL[dup.source]} · {formatLong(dup.dueAt)}</span>
                    </div>
                    <Button size="sm" icon="merge">Merge</Button>
                  </div>
                ) : null}

                <div className="rcard__actions">
                  <Button variant="ghost" size="sm" onClick={() => onReject(a)}>Reject</Button>
                  <Button size="sm" icon="edit" onClick={() => onOpen(a)}>Edit</Button>
                  <Button size="sm" variant="primary" icon="check" onClick={() => onApprove(a)}>Approve</Button>
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
function SourcesPage() {
  return (
    <div className="main">
      <header className="page-header">
        <div className="page-header__title-block">
          <p className="page-header__eyebrow">Sources</p>
          <h1>Where your assignments come from</h1>
          <p className="page-header__sub">
            Six channels feed your dashboard. The browser helper and syllabus parser route uncertain items to Review first.
          </p>
        </div>
        <div className="page-header__actions">
          <Button icon="refresh" size="sm">Sync all</Button>
          <Button variant="primary" icon="plus" size="sm">Connect a source</Button>
        </div>
      </header>

      <div className="source-grid">
        {SOURCES.map(s => (
          <article key={s.id} className="card scard">
            <div className="scard__head">
              <div className="scard__brand">
                <span className="scard__icon"><Icon name={SOURCE_ICON[s.id]} size={18} /></span>
                <div>
                  <h3 className="scard__name">{s.name}</h3>
                  <span className="scard__type">{s.type}</span>
                </div>
              </div>
              <Badge variant={s.status === "ok" ? "success" : s.status === "warn" ? "warning" : "danger"}
                     icon={s.status === "ok" ? "check" : "alert"}>
                {s.status === "ok" ? "Connected" : s.status === "warn" ? "Attention" : "Error"}
              </Badge>
            </div>

            <dl className="scard__meta">
              <div>
                <dt>Last sync</dt>
                <dd>{s.lastSync}</dd>
              </div>
              <div>
                <dt>Items</dt>
                <dd>{s.items} synced</dd>
              </div>
              <div>
                <dt>Permissions</dt>
                <dd style={{ fontSize: 12 }}>{s.permissions[0]}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{s.error ? <span style={{ color: "var(--danger)" }}>{s.error}</span> : "Healthy"}</dd>
              </div>
            </dl>

            <div className="scard__notes">
              {s.notes.map((n, i) => (
                <div className="scard__notes-row" key={i}>
                  <Icon name={s.id === "browser_helper" ? "lock" : "check"} size={12} style={{ marginTop: 2 }} />
                  <span>{n}</span>
                </div>
              ))}
            </div>

            <div className="scard__actions">
              <Button variant="ghost" size="sm">Permissions</Button>
              <Button size="sm" variant="danger">{s.id === "manual" ? "Pause" : "Disconnect"}</Button>
              <Button size="sm" icon="refresh">Sync now</Button>
            </div>
          </article>
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
function CoursesPage({ assignments, onOpen }) {
  return (
    <div className="main">
      <header className="page-header">
        <div className="page-header__title-block">
          <p className="page-header__eyebrow">Courses · Fall 2026</p>
          <h1>Six courses</h1>
          <p className="page-header__sub">Each course keeps its own color across the dashboard, calendar, and review queue.</p>
        </div>
        <div className="page-header__actions">
          <Button variant="primary" icon="plus" size="sm">Add course</Button>
        </div>
      </header>

      <div className="course-grid">
        {COURSES.map(c => {
          const courseItems = assignments.filter(a => a.courseId === c.id);
          const open = courseItems.filter(a => a.status !== "completed").length;
          const done = courseItems.filter(a => a.status === "completed").length;
          const next = courseItems.filter(a => a.status !== "completed")
            .sort((a,b) => new Date(a.dueAt) - new Date(b.dueAt))[0];
          return (
            <article key={c.id} className="card ccard">
              <span className={`ccard__rail color-${c.color}`} aria-hidden="true" />
              <div className="ccard__head" style={{ paddingLeft: 8 }}>
                <span className="ccard__code">{c.code}</span>
                <h3 className="ccard__title">{c.title}</h3>
                <span className="ccard__instr">{c.instructor} · {c.term}</span>
              </div>

              <div className="ccard__stats">
                <div className="ccard__stat">
                  <b>{open}</b><span>Open</span>
                </div>
                <div className="ccard__stat">
                  <b>{done}</b><span>Done</span>
                </div>
                <div className="ccard__stat">
                  <b>{courseItems.length}</b><span>Total</span>
                </div>
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

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Button variant="ghost" size="sm" iconRight="chevronRight">Open course</Button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// Settings Page
// ============================================================
function SettingsPage() {
  const [section, setSection] = useStateO("reminders");
  const [emailDigest, setEmailDigest] = useStateO(true);
  const [push, setPush] = useStateO(true);
  const [sun, setSun] = useStateO(true);
  const [calExport, setCalExport] = useStateO(true);

  const sections = [
    { id: "reminders",  label: "Reminders" },
    { id: "calendar",   label: "Calendar" },
    { id: "sources",    label: "Source preferences" },
    { id: "browser",    label: "Browser helper" },
    { id: "privacy",    label: "Privacy" },
    { id: "account",    label: "Account" },
  ];

  return (
    <div className="main">
      <header className="page-header">
        <div className="page-header__title-block">
          <p className="page-header__eyebrow">Settings</p>
          <h1>Preferences</h1>
          <p className="page-header__sub">Tune reminders, integrations, and what your dashboard knows about you.</p>
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
          {section === "reminders" ? (
            <>
              <h2>Reminders</h2>
              <div className="card" style={{ padding: "0 16px" }}>
                <SRow title="1 day before — email"
                      sub="Sent the morning of the day before each due date."
                      ctrl={<Toggle checked={emailDigest} onChange={setEmailDigest} />} />
                <SRow title="2 hours before — push"
                      sub="A short reminder when something is genuinely about to be due."
                      ctrl={<Toggle checked={push} onChange={setPush} />} />
                <SRow title="Sunday weekly preview"
                      sub="A scheduled summary of the coming week, every Sunday at 6 PM."
                      ctrl={<Toggle checked={sun} onChange={setSun} />} />
                <SRow title="Quiet hours"
                      sub="No reminders between 10 PM and 7 AM."
                      ctrl={<Button size="sm">10 PM – 7 AM</Button>} />
              </div>
            </>
          ) : null}

          {section === "calendar" ? (
            <>
              <h2>Calendar</h2>
              <div className="card" style={{ padding: "0 16px" }}>
                <SRow title="Apple Calendar export"
                      sub="A read-only feed (.ics) you can subscribe to from any calendar app."
                      ctrl={<Toggle checked={calExport} onChange={setCalExport} />} />
                <SRow title="First day of week"
                      sub="Used for week view and the Sunday preview email."
                      ctrl={<Tabs value="sun" onChange={() => {}} options={[{label:"Sun", value:"sun"},{label:"Mon", value:"mon"}]} />} />
                <SRow title="Show completed assignments"
                      ctrl={<Toggle checked={false} onChange={() => {}} />} />
              </div>
            </>
          ) : null}

          {section === "sources" ? (
            <>
              <h2>Source preferences</h2>
              <p style={{ color: "var(--text-muted)", margin: 0, fontSize: 13.5 }}>How aggressively each source pulls.</p>
              <div className="card" style={{ padding: "0 16px" }}>
                {SOURCES.map(s => (
                  <SRow key={s.id}
                        title={s.name}
                        sub={`Sync interval: every 15 minutes`}
                        ctrl={<Toggle checked={s.status !== "off"} onChange={() => {}} />} />
                ))}
              </div>
            </>
          ) : null}

          {section === "browser" ? (
            <>
              <h2>Browser helper</h2>
              <article className="card settings-card">
                <h3 className="serif" style={{ margin: 0, fontWeight: 500, fontSize: 16 }}>Permissions</h3>
                <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 13 }}>
                  The helper only reads page text on whitelisted course pages. It cannot run silently in the background.
                </p>
                <ul style={{ margin: "8px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 6, fontSize: 13 }}>
                  {[
                    ["check", "Reads visible text on whitelisted pages"],
                    ["check", "Only when you explicitly start a scan"],
                    ["x",     "Never reads password fields or MFA codes"],
                    ["x",     "Never accesses cookies or stored credentials"],
                    ["x",     "Never logs unrelated browsing history"],
                  ].map(([icon, label]) => (
                    <li key={label} style={{ display: "grid", gridTemplateColumns: "16px 1fr", gap: 8, alignItems: "center" }}>
                      <Icon name={icon} size={12} style={{ color: icon === "x" ? "var(--danger)" : "var(--success)" }} />
                      <span>{label}</span>
                    </li>
                  ))}
                </ul>
              </article>
              <div className="card" style={{ padding: "0 16px" }}>
                <SRow title="Whitelisted pages"
                      sub="3 course portals · canvas.example.edu, icollege.example.edu, mhconnect.example.edu"
                      ctrl={<Button size="sm" icon="edit">Edit list</Button>} />
                <SRow title="Auto-import probable items"
                      sub="When the helper finds a likely assignment, route it to the review queue."
                      ctrl={<Toggle checked={true} onChange={() => {}} />} />
                <SRow title="Pause helper"
                      sub="Disable scanning entirely without disconnecting."
                      ctrl={<Toggle checked={false} onChange={() => {}} />} />
              </div>
            </>
          ) : null}

          {section === "privacy" ? (
            <>
              <h2>Privacy</h2>
              <div className="card" style={{ padding: "0 16px" }}>
                <SRow title="Anonymous usage analytics"
                      sub="Helps us improve assignment detection. No assignment text is sent."
                      ctrl={<Toggle checked={false} onChange={() => {}} />} />
                <SRow title="Export your data"
                      sub="Download a JSON archive of your assignments, sources, and review history."
                      ctrl={<Button size="sm" icon="upload">Request export</Button>} />
                <SRow title="Clear browser helper history"
                      sub="Removes all captured snippets from past scans."
                      ctrl={<Button size="sm" variant="danger">Clear</Button>} />
              </div>
            </>
          ) : null}

          {section === "account" ? (
            <>
              <h2>Account</h2>
              <div className="card" style={{ padding: "0 16px" }}>
                <SRow title="Email"
                      sub="jordan.kim@example.edu"
                      ctrl={<Button size="sm">Change</Button>} />
                <SRow title="Password"
                      sub="Last updated 4 months ago."
                      ctrl={<Button size="sm">Change</Button>} />
                <SRow title="Delete account"
                      sub="Permanently remove your account, assignments, and connections. This cannot be undone."
                      ctrl={<Button size="sm" variant="danger" icon="trash">Delete account</Button>} />
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
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
