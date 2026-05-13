/* global React, ReactDOM, Icon, Button, Badge, Search,
   DashboardPage, RightRail, AssignmentDetail, ReviewQueue, SourcesPage, CalendarPage, CoursesPage, SettingsPage,
   COURSES, ASSIGNMENTS, SOURCES, TODAY, getCourse, bucketize,
   TweaksPanel, useTweaks, TweakSection, TweakRadio, TweakToggle, TweakColor, TweakSelect */

const { useState, useEffect, useMemo } = React;

const NAV_ITEMS = [
  { id: "dashboard", label: "Today",     icon: "dashboard" },
  { id: "courses",   label: "Courses",   icon: "book" },
  { id: "calendar",  label: "Calendar",  icon: "calendar" },
  { id: "review",    label: "Review",    icon: "inbox" },
  { id: "sources",   label: "Sources",   icon: "plug" },
  { id: "settings",  label: "Settings",  icon: "settings" },
];

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "density": "comfortable",
  "showRail": true,
  "accent": "graphite",
  "fontPair": "serif-sans"
}/*EDITMODE-END*/;

function Topbar({ active, onNav, counts }) {
  const todayDt = new Date(TODAY);
  const issueNo = Math.abs(Math.ceil((todayDt - new Date(2026, 0, 12)) / (1000*60*60*24*7))) + 1;
  return (
    <header className="topbar">
      <div className="topbar__left">
        <span>Vol. III · No. {issueNo}</span>
      </div>

      <div className="topbar__brand">
        <span className="topbar__name">Lazy</span>
        <span className="topbar__kicker">a quieter way to keep up.</span>
      </div>

      <div className="topbar__right">
        <span className="topbar__pulse" title="All sources nominal">
          <span className="topbar__pulse-dot" />
          <span>Synced</span>
        </span>
        <button className="topbar__profile" aria-label="Account">
          <span className="topbar__avatar">JK</span>
        </button>
      </div>

      <nav className="topbar__nav" aria-label="Primary">
        {NAV_ITEMS.map(item => {
          const c = counts[item.id];
          return (
            <button key={item.id}
                    className="topbar__link"
                    aria-current={active === item.id ? "page" : undefined}
                    onClick={() => onNav(item.id)}>
              <span>{item.label}</span>
              {c ? <span className="topbar__count">{c}</span> : null}
            </button>
          );
        })}
      </nav>
    </header>
  );
}

// ============================================================
// App
// ============================================================
function App() {
  const [route, setRoute] = useState("dashboard");
  const [assignments, setAssignments] = useState(ASSIGNMENTS);
  const [openId, setOpenId] = useState(null);
  const [toast, setToast] = useState(null);
  const [confetti, setConfetti] = useState(null);

  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  useEffect(() => {
    document.body.dataset.fontPair = tweaks.fontPair;
    document.body.dataset.density = tweaks.density;
  }, [tweaks.fontPair, tweaks.density]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  function toggleComplete(a) {
    const wasComplete = a.status === "completed";
    setAssignments(prev => prev.map(x => x.id === a.id
      ? { ...x, status: wasComplete ? "not_started" : "completed" }
      : x
    ));
    if (!wasComplete) {
      // Burst at center
      setConfetti(Date.now());
      setTimeout(() => setConfetti(null), 1200);
    }
    showToast(wasComplete ? "Marked incomplete" : "Done — nice work");
  }

  function approveItem(a) {
    setAssignments(prev => prev.map(x => x.id === a.id ? { ...x, confidence: "confirmed" } : x));
    showToast("Approved — moved to dashboard");
  }
  function rejectItem(a) {
    setAssignments(prev => prev.filter(x => x.id !== a.id));
    showToast("Rejected — removed from queue");
  }

  const counts = useMemo(() => {
    const buckets = bucketize(assignments);
    const total = assignments.length || 1;
    const overdue = buckets.overdue.length;
    const onTrack = Math.round(((total - overdue) / total) * 100);
    return {
      review: buckets.review.length,
      sources: SOURCES.filter(s => s.status !== "ok").length,
      onTrack,
    };
  }, [assignments]);

  const open = openId ? assignments.find(a => a.id === openId) : null;

  return (
    <div className="shell">
      <Topbar active={route} onNav={setRoute} counts={counts} />

      <main className="workspace" key={route}>
        <div className={`workspace__inner ${route === "dashboard" && tweaks.showRail ? "" : "workspace__inner--wide"}`}>
          {route === "dashboard" ? (
            <>
              <DashboardPage assignments={assignments}
                             onOpen={(a) => setOpenId(a.id)}
                             onToggle={toggleComplete}
                             onNav={setRoute} />
              {tweaks.showRail ? <RightRail assignments={assignments} onNav={setRoute} onOpen={(a) => setOpenId(a.id)} /> : null}
            </>
          ) : null}

          {route === "review" ? (
            <ReviewQueue assignments={assignments}
                         onOpen={(a) => setOpenId(a.id)}
                         onApprove={approveItem}
                         onReject={rejectItem} />
          ) : null}

          {route === "sources"  ? <SourcesPage /> : null}
          {route === "calendar" ? <CalendarPage assignments={assignments} onOpen={(a) => setOpenId(a.id)} /> : null}
          {route === "courses"  ? <CoursesPage assignments={assignments} onOpen={(a) => setOpenId(a.id)} /> : null}
          {route === "settings" ? <SettingsPage /> : null}
        </div>
      </main>

      {open ? (
        <AssignmentDetail a={open} onClose={() => setOpenId(null)} onToggle={toggleComplete} />
      ) : null}

      {toast ? (
        <div className="toast" role="status">
          <Icon name="check" size={14} /> {toast}
        </div>
      ) : null}

      {confetti ? (
        <div className="confetti" key={confetti} aria-hidden="true">
          {Array.from({ length: 18 }, (_, i) => (
            <span key={i} style={{
              "--i": i,
              "--x": `${(i % 6 - 2.5) * 18}vw`,
              "--y": `${-30 - (i % 4) * 10}vh`,
              "--r": `${(i * 47) % 360}deg`,
              "--c": ["var(--brick)","var(--cobalt)","var(--gold)","var(--forest)","var(--plum)","var(--teal)"][i % 6],
              "--delay": `${(i % 5) * 30}ms`,
            }} />
          ))}
        </div>
      ) : null}

      <TweaksPanel title="Tweaks">
        <TweakSection label="Layout">
          <TweakRadio label="Density" value={tweaks.density} onChange={(v) => setTweak("density", v)}
                      options={[{ value: "compact", label: "Compact" }, { value: "comfortable", label: "Comfort" }]} />
          <TweakToggle label="Right rail" value={tweaks.showRail} onChange={(v) => setTweak("showRail", v)} />
        </TweakSection>
        <TweakSection label="Type">
          <TweakRadio label="Font pairing" value={tweaks.fontPair} onChange={(v) => setTweak("fontPair", v)}
                      options={[
                        { value: "serif-sans", label: "Serif + Sans" },
                        { value: "all-sans",   label: "All Sans" },
                      ]} />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
