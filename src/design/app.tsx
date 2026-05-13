// @ts-nocheck
import React from "react";
import ReactDOM from "react-dom/client";
import {
  createManualAssignment,
  deleteAssignment,
  getSession,
  loadWorkspace,
  onAuthStateChange,
  recordSyncRun,
  saveImportedData,
  setAssignmentStatus,
  setGlobalWorkspace,
  signInWithPassword,
  signOut as signOutSupabase,
  signUpWithPassword,
  supabaseConfigured,
  updateAssignmentConfidence,
  updateSourceFromSync,
  type Session,
} from "./db";
import {
  disablePushNotifications,
  enablePushNotifications,
  getNotificationSettings,
  sendTestNotification,
  updateNotificationPreferences,
  type NotificationSettings,
} from "./notifications";
(globalThis as any).ReactDOM = ReactDOM;
const g = globalThis as any;
g.React = React;
const { Icon, Button, Badge, Search, DashboardPage, RightRail, AssignmentDetail, ReviewQueue, SourcesPage, CalendarPage, CoursesPage, SettingsPage, COURSES, ASSIGNMENTS, SOURCES, TODAY, getCourse, bucketize, TweaksPanel, useTweaks, TweakSection, TweakRadio, TweakToggle, TweakColor, TweakSelect } = g;

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
  "fontPair": "serif-sans",
  "theme": "system"
}/*EDITMODE-END*/;

function resolveTheme(setting) {
  if (setting === "dark" || setting === "light") return setting;
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    function tick() { setNow(new Date()); }
    const align = 60000 - (Date.now() % 60000);
    const t1 = setTimeout(() => {
      tick();
      const t2 = setInterval(tick, 60000);
      (window as any).__clockInterval = t2;
    }, align);
    return () => {
      clearTimeout(t1);
      if ((window as any).__clockInterval) clearInterval((window as any).__clockInterval);
    };
  }, []);
  const time = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const day = now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  return (
    <span className="topbar__clock" aria-label={`${day}, ${time}`} title={now.toLocaleString()}>
      <span className="topbar__clock-time">{time}</span>
      <span className="topbar__clock-day">{day}</span>
    </span>
  );
}

function StatusChip({ syncStatus, lastSyncedAt, onSync }) {
  const syncing = syncStatus === "syncing";
  const errored = syncStatus === "error";
  const label = syncing ? "Syncing…" : errored ? "Sync failed" : lastSyncedAt ? `Synced ${timeAgo(lastSyncedAt)}` : "Synced";
  const cls = ["statuschip"];
  if (syncing) cls.push("statuschip--syncing");
  else if (errored) cls.push("statuschip--err");
  else cls.push("statuschip--ok");
  return (
    <button
      type="button"
      className={cls.join(" ")}
      onClick={onSync}
      disabled={syncing}
      title={syncing ? label : "Click to resync"}
      aria-label={`${label}. Click to resync.`}
    >
      <Icon name={errored ? "alert" : "refresh"} size={12} />
      <span>{label}</span>
    </button>
  );
}

function ThemeToggle({ theme, onChange }) {
  const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
  const icon = theme === "dark" ? "moon" : theme === "system" ? "monitor" : "sun";
  const label = theme === "light" ? "Light theme" : theme === "dark" ? "Dark theme" : "System theme";
  return (
    <button
      type="button"
      className="topbar__theme"
      onClick={() => onChange(next)}
      aria-label={`${label}. Click to switch.`}
      title={`${label} — click to switch to ${next}`}
    >
      <Icon name={icon} size={14} />
    </button>
  );
}

function Topbar({ active, onNav, counts, syncStatus, lastSyncedAt, onSync, onUpload, onNewManual, onNewFromText, onSignOut, userEmail, theme, onThemeChange }) {
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const newMenuRef = React.useRef(null);
  const fileRef = React.useRef(null);
  const initials = (userEmail || "").slice(0, 2).toUpperCase() || "—";

  useEffect(() => {
    function closeMenu(event) {
      if (!newMenuRef.current || newMenuRef.current.contains(event.target)) return;
      setNewMenuOpen(false);
    }
    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, []);

  return (
    <header className="topbar">
      <div className="topbar__left">
        <Clock />
        <StatusChip syncStatus={syncStatus} lastSyncedAt={lastSyncedAt} onSync={onSync} />
      </div>

      <div className="topbar__brand">
        <span className="topbar__name">Lazy</span>
        <span className="topbar__kicker">a quieter way to keep up.</span>
      </div>

      <div className="topbar__right">
        <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,.md"
               style={{ display: "none" }}
               onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); if (e.target) e.target.value = ""; }} />
        <div className="topbar__menu-wrap" ref={newMenuRef}>
          <button
            aria-expanded={newMenuOpen}
            aria-haspopup="menu"
            className="topbar__link topbar__link--primary"
            onClick={() => setNewMenuOpen(open => !open)}
            title="Create assignments"
          >
            <Icon name="plus" size={13} /> <span style={{ marginLeft: 4 }}>New</span>
          </button>
          {newMenuOpen ? (
            <div className="topbar__menu" role="menu">
              <button
                className="topbar__menu-item"
                role="menuitem"
                type="button"
                onClick={() => { setNewMenuOpen(false); onNewManual(); }}
              >
                <Icon name="plus" size={15} />
                <span>
                  <strong>Manual assignment</strong>
                  <em>Fill in the fields yourself</em>
                </span>
              </button>
              <button
                className="topbar__menu-item"
                role="menuitem"
                type="button"
                onClick={() => { setNewMenuOpen(false); onNewFromText(); }}
              >
                <Icon name="syllabus" size={15} />
                <span>
                  <strong>Paste syllabus text</strong>
                  <em>Extract deadlines from pasted text</em>
                </span>
              </button>
              <button
                className="topbar__menu-item"
                role="menuitem"
                type="button"
                onClick={() => { setNewMenuOpen(false); fileRef.current?.click(); }}
              >
                <Icon name="upload" size={15} />
                <span>
                  <strong>Upload syllabus file</strong>
                  <em>PDF, DOCX, or TXT</em>
                </span>
              </button>
            </div>
          ) : null}
        </div>
        <ThemeToggle theme={theme} onChange={onThemeChange} />
        <button className="topbar__profile" aria-label="Sign out" onClick={onSignOut} title={`Sign out ${userEmail || "account"}`}>
          <span className="topbar__avatar">{initials}</span>
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

function timeAgo(iso) {
  if (!iso) return "";
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 30) return "just now";
  if (s < 90) return "a minute ago";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 7200) return "an hour ago";
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return new Date(iso).toLocaleString();
}

// ============================================================
// App
// ============================================================
function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authMessage, setAuthMessage] = useState(null);
  const [route, setRoute] = useState("dashboard");
  const [assignments, setAssignments] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [toast, setToast] = useState(null);
  const [confetti, setConfetti] = useState(null);
  const [syncStatus, setSyncStatus] = useState("idle");
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newDialogPrefill, setNewDialogPrefill] = useState(null);
  const [showTextImportDialog, setShowTextImportDialog] = useState(false);
  const [dashboardFilter, setDashboardFilter] = useState("all");
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null);
  const [notificationBusy, setNotificationBusy] = useState(false);

  function syncAssignmentsGlobal(next) {
    g.ASSIGNMENTS.length = 0;
    g.ASSIGNMENTS.push(...next);
  }

  function applyWorkspace(data) {
    setGlobalWorkspace(g, data.courses, data.assignments, data.sources);
    setAssignments(data.assignments);
  }

  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("lazy.theme");
      if (saved && saved !== tweaks.theme) setTweak("theme", saved);
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem("lazy.theme", tweaks.theme); } catch {}
  }, [tweaks.theme]);

  useEffect(() => {
    document.body.dataset.fontPair = tweaks.fontPair;
    document.body.dataset.density = tweaks.density;
  }, [tweaks.fontPair, tweaks.density]);

  useEffect(() => {
    function apply() {
      const resolved = resolveTheme(tweaks.theme);
      document.body.dataset.theme = resolved;
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", resolved === "dark" ? "#15130f" : "#3f4a3c");
    }
    apply();
    if (tweaks.theme !== "system" || typeof window.matchMedia !== "function") return undefined;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => apply();
    mq.addEventListener?.("change", listener);
    return () => mq.removeEventListener?.("change", listener);
  }, [tweaks.theme]);

  useEffect(() => {
    function onKey(e) {
      const target = e.target as HTMLElement;
      const inField = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);

      // cmd+Z / ctrl+Z → undo last toast action
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && (e.key === "z" || e.key === "Z")) {
        if (undoRef.current) {
          e.preventDefault();
          runUndo();
        }
        return;
      }

      // 'n' → focus quick-add bar
      if (!inField && !e.metaKey && !e.ctrlKey && !e.altKey && (e.key === "n" || e.key === "N")) {
        const focus = (window as any)._focusQuickAdd;
        if (typeof focus === "function") {
          e.preventDefault();
          if (route !== "dashboard") setRoute("dashboard");
          // Wait for dashboard mount if needed
          requestAnimationFrame(() => {
            const f = (window as any)._focusQuickAdd;
            if (typeof f === "function") f();
          });
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [route]);

  useEffect(() => {
    if (!supabaseConfigured) {
      setAuthReady(true);
      return undefined;
    }

    let cancelled = false;
    getSession()
      .then((nextSession) => {
        if (!cancelled) setSession(nextSession);
      })
      .catch((e) => setAuthMessage(e.message || String(e)))
      .finally(() => {
        if (!cancelled) setAuthReady(true);
      });

    const { data } = onAuthStateChange((nextSession) => {
      setSession(nextSession);
      if (!nextSession) {
        setAssignments([]);
        setGlobalWorkspace(g, [], [], []);
      }
    });

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authReady || !session?.user) return;
    refreshWorkspace(session.user.id);
    refreshNotificationSettings();
  }, [authReady, session?.user?.id]);

  async function refreshNotificationSettings() {
    if (!session?.user) return;
    try {
      setNotificationSettings(await getNotificationSettings());
    } catch (e) {
      showToast(`Notification settings failed: ${e.message || e}`);
    }
  }

  async function saveNotificationPatch(patch) {
    setNotificationBusy(true);
    try {
      setNotificationSettings(await updateNotificationPreferences(patch));
      showToast("Notification settings saved");
    } catch (e) {
      showToast(`Notification settings failed: ${e.message || e}`);
    } finally {
      setNotificationBusy(false);
    }
  }

  async function enablePushForDevice() {
    setNotificationBusy(true);
    try {
      setNotificationSettings(await enablePushNotifications());
      showToast("Push notifications enabled");
    } catch (e) {
      showToast(`Push setup failed: ${e.message || e}`);
    } finally {
      setNotificationBusy(false);
    }
  }

  async function disablePushForDevice() {
    setNotificationBusy(true);
    try {
      setNotificationSettings(await disablePushNotifications());
      showToast("Push notifications disabled on this device");
    } catch (e) {
      showToast(`Push setup failed: ${e.message || e}`);
    } finally {
      setNotificationBusy(false);
    }
  }

  async function sendTestPush() {
    setNotificationBusy(true);
    try {
      const r = await sendTestNotification();
      showToast(r.sent === 1 ? "Test sent — check your device" : `Test sent to ${r.sent} device${r.sent === 1 ? "" : "s"}`);
    } catch (e) {
      showToast(`Test failed: ${e.message || e}`);
    } finally {
      setNotificationBusy(false);
    }
  }

  async function refreshWorkspace(userId = session?.user?.id) {
    if (!userId) return;
    setSyncStatus("syncing");
    try {
      const data = await loadWorkspace(userId);
      applyWorkspace(data);
      setSyncStatus("ok");
      setLastSyncedAt(new Date().toISOString());
    } catch (e) {
      setSyncStatus("error");
      showToast(`Database load failed: ${e.message || e}`);
    }
  }

  async function syncAll() {
    if (!session?.user) {
      showToast("Sign in before syncing assignments");
      return;
    }
    setSyncStatus("syncing");
    const merged = [];
    const mergedCourses = [];
    const sourceStates = {};
    async function tryFetch(name, url) {
      try {
        const r = await fetch(url);
        const d = await r.json().catch(() => ({}));
        if (!r.ok) { sourceStates[name] = { status: r.status === 500 && d.error?.includes("not set") ? "off" : "warn", error: d.error || `HTTP ${r.status}`, lastSync: "—", items: 0 }; return; }
        merged.push(...(d.assignments || []));
        mergedCourses.push(...(d.courses || []));
        sourceStates[name] = { status: "ok", lastSync: "just now", items: (d.assignments || []).length };
      } catch (e) {
        sourceStates[name] = { status: "error", error: String(e.message || e), lastSync: "—", items: 0 };
      }
    }
    await Promise.all([
      tryFetch("brightspace", "/api/icollege/sync"),
      tryFetch("canvas", "/api/canvas/sync"),
    ]);
    try {
      const data = await saveImportedData(session.user.id, mergedCourses, merged);
      for (const [source, state] of Object.entries(sourceStates)) {
        const status = state.status === "ok" ? "ok" : state.status === "off" ? "off" : state.status === "warn" ? "warn" : "error";
        await updateSourceFromSync(session.user.id, source, status, state.items || 0, state.error || null);
        await recordSyncRun(session.user.id, source, status === "ok" ? "ok" : status === "warn" ? "warn" : "error", state.items || 0, state.error || null);
      }
      const fresh = await loadWorkspace(session.user.id);
      applyWorkspace(fresh);
      const anyOk = Object.values(sourceStates).some(s => s.status === "ok");
      setSyncStatus(anyOk ? "ok" : "error");
      setLastSyncedAt(new Date().toISOString());
      showToast(anyOk ? `Synced ${merged.length} assignments` : "Sync failed");
    } catch (e) {
      setSyncStatus("error");
      showToast(`Database sync failed: ${e.message || e}`);
    }
  }

  async function uploadSyllabus(file) {
    if (!session?.user) {
      showToast("Sign in before uploading a syllabus");
      return;
    }
    setSyncStatus("syncing");
    const fd = new FormData();
    fd.append("file", file);
    try {
      const r = await fetch("/api/syllabus/parse", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
      const data = await saveImportedData(session.user.id, [d.course], d.assignments || []);
      await updateSourceFromSync(session.user.id, "syllabus", "ok", d.assignments?.length || 0, null);
      await recordSyncRun(session.user.id, "syllabus", "ok", d.assignments?.length || 0, null);
      applyWorkspace(await loadWorkspace(session.user.id));
      setSyncStatus("ok");
      setLastSyncedAt(new Date().toISOString());
      showToast(`Parsed ${d.assignments.length} items from ${file.name} ($${d.meta?.callCostUsd?.toFixed?.(4)})`);
    } catch (e) {
      setSyncStatus("error");
      showToast(`Syllabus failed: ${e.message || e}`);
    }
  }

  async function importAssignmentsFromText({ title, text }) {
    if (!session?.user) {
      showToast("Sign in before importing assignments");
      return false;
    }
    if (!text.trim()) {
      showToast("Paste syllabus or schedule text first");
      return false;
    }

    setSyncStatus("syncing");
    try {
      const r = await fetch("/api/syllabus/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          filename: title || "pasted-schedule.txt",
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);

      await saveImportedData(session.user.id, [d.course], d.assignments || []);
      await updateSourceFromSync(session.user.id, "syllabus", "ok", d.assignments?.length || 0, null);
      await recordSyncRun(session.user.id, "syllabus", "ok", d.assignments?.length || 0, null);
      applyWorkspace(await loadWorkspace(session.user.id));
      setSyncStatus("ok");
      setLastSyncedAt(new Date().toISOString());
      showToast(`Created ${d.assignments?.length || 0} assignments from pasted text`);
      return true;
    } catch (e) {
      setSyncStatus("error");
      showToast(`Text import failed: ${e.message || e}`);
      return false;
    }
  }

  async function addManualAssignment(data) {
    if (!session?.user) {
      showToast("Sign in before adding assignments");
      return;
    }
    try {
      const workspace = await createManualAssignment(session.user.id, data);
      applyWorkspace(workspace);
      showToast(`Added "${data.title}"`);
    } catch (e) {
      showToast(`Manual assignment failed: ${e.message || e}`);
    }
  }

  async function archiveItem(a) {
    await setStatus(a, "archived");
  }

  async function deleteItem(a) {
    try {
      await deleteAssignment(a.id);
      setAssignments(prev => {
        const next = prev.filter(x => x.id !== a.id);
        syncAssignmentsGlobal(next);
        return next;
      });
      if (openId === a.id) setOpenId(null);
      showToast("Deleted");
    } catch (e) {
      showToast(`Delete failed: ${e.message || e}`);
    }
  }

  async function setStatus(a, status) {
    try {
      const updated = await setAssignmentStatus(a.id, status);
      setAssignments(prev => {
        const next = prev.map(x => x.id === a.id ? updated : x);
        syncAssignmentsGlobal(next);
        return next;
      });
      showToast(status === "in_progress" ? "Marked in progress" : status === "not_started" ? "Marked not started" : `Status: ${status}`);
    } catch (e) {
      showToast(`Status update failed: ${e.message || e}`);
    }
  }

  function openEditDialog(a) {
    setNewDialogPrefill({
      title: a.title,
      courseId: a.courseId,
      dueAt: a.dueAt,
      notes: a.notes,
    });
    setShowNewDialog(true);
  }

  function openAddToCourse(courseId) {
    setNewDialogPrefill({ courseId });
    setShowNewDialog(true);
  }

  function filterByCourse(courseId) {
    setDashboardFilter(courseId);
    setRoute("dashboard");
  }

  function openSourceUrl(a) {
    const u = a.sourceUrl;
    if (!u) { showToast("No source link"); return; }
    const url = /^https?:\/\//.test(u) ? u : `https://${u}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const undoRef = React.useRef(null);
  const toastTimerRef = React.useRef(null);

  function showToast(msg, undo) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ msg, undo: !!undo });
    undoRef.current = undo || null;
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      undoRef.current = null;
    }, undo ? 5000 : 2200);
  }

  function runUndo() {
    if (!undoRef.current) return;
    const fn = undoRef.current;
    undoRef.current = null;
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(null);
    Promise.resolve(fn()).catch(() => {});
  }

  async function toggleComplete(a) {
    const prevStatus = a.status;
    const wasComplete = prevStatus === "completed";
    await setStatusSilent(a, wasComplete ? "not_started" : "completed");
    if (!wasComplete) {
      setConfetti(Date.now());
      setTimeout(() => setConfetti(null), 1200);
    }
    showToast(
      wasComplete ? "Marked incomplete" : "Done — nice work",
      async () => { await setStatusSilent(a, prevStatus); },
    );
  }

  async function setStatusSilent(a, status) {
    try {
      const updated = await setAssignmentStatus(a.id, status);
      setAssignments(prev => {
        const next = prev.map(x => x.id === a.id ? updated : x);
        syncAssignmentsGlobal(next);
        return next;
      });
    } catch (e) {
      showToast(`Status update failed: ${e.message || e}`);
    }
  }

  async function approveItem(a) {
    try {
      const updated = await updateAssignmentConfidence(a.id, "confirmed");
      setAssignments(prev => {
        const next = prev.map(x => x.id === a.id ? updated : x);
        syncAssignmentsGlobal(next);
        return next;
      });
      showToast("Approved — moved to dashboard");
    } catch (e) {
      showToast(`Approval failed: ${e.message || e}`);
    }
  }
  async function rejectItem(a) {
    await deleteItem(a);
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

  if (!supabaseConfigured) {
    return <AuthShell title="Supabase is not configured" message="Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local, then restart the dev server." />;
  }

  if (!authReady) {
    return <AuthShell title="Loading Lazy" message="Checking your Supabase session..." />;
  }

  if (!session?.user) {
    return (
      <AuthScreen
        message={authMessage}
        onSubmit={async (mode, email, password) => {
          try {
            setAuthMessage(null);
            const nextSession = mode === "signup"
              ? await signUpWithPassword(email, password)
              : await signInWithPassword(email, password);
            if (nextSession) setSession(nextSession);
            else setAuthMessage("Check your email to confirm the account, then sign in.");
          } catch (e) {
            setAuthMessage(e.message || String(e));
          }
        }}
      />
    );
  }

  return (
    <div className="shell">
      <Topbar active={route} onNav={setRoute} counts={counts}
              syncStatus={syncStatus} lastSyncedAt={lastSyncedAt}
              onSync={syncAll} onUpload={uploadSyllabus}
              onNewManual={() => setShowNewDialog(true)}
              onNewFromText={() => setShowTextImportDialog(true)}
              onSignOut={() => signOutSupabase().catch(e => showToast(e.message || String(e)))}
              userEmail={session.user.email}
              theme={tweaks.theme}
              onThemeChange={(v) => setTweak("theme", v)} />

      <main className="workspace" key={route}>
        <div className={`workspace__inner ${route === "dashboard" && tweaks.showRail ? "" : "workspace__inner--wide"}`}>
          {route === "dashboard" ? (
            <>
              <DashboardPage assignments={assignments}
                             onOpen={(a) => setOpenId(a.id)}
                             onToggle={toggleComplete}
                             onNav={setRoute}
                             onUpload={uploadSyllabus}
                             onNew={() => setShowNewDialog(true)}
                             onSetStatus={setStatus}
                             onSync={syncAll}
                             onArchive={archiveItem}
                             onDelete={deleteItem}
                             onOpenSource={openSourceUrl}
                             onQuickAdd={addManualAssignment}
                             onOpenDialogPrefilled={(p) => { setNewDialogPrefill(p); setShowNewDialog(true); }}
                             initialFilter={dashboardFilter}
                             onFilterChange={setDashboardFilter} />
              {tweaks.showRail ? (
                <RightRail
                  assignments={assignments}
                  onNav={setRoute}
                  onOpen={(a) => setOpenId(a.id)}
                  onSync={syncAll}
                  notificationSettings={notificationSettings}
                />
              ) : null}
            </>
          ) : null}

          {route === "review" ? (
            <ReviewQueue assignments={assignments}
                         onOpen={(a) => setOpenId(a.id)}
                         onApprove={approveItem}
                         onReject={rejectItem} />
          ) : null}

          {route === "sources"  ? <SourcesPage onSync={syncAll} syncStatus={syncStatus} onUpload={uploadSyllabus} /> : null}
          {route === "calendar" ? <CalendarPage assignments={assignments} onOpen={(a) => setOpenId(a.id)} /> : null}
          {route === "courses"  ? <CoursesPage assignments={assignments} onOpen={(a) => setOpenId(a.id)} onAddToCourse={openAddToCourse} onFilterCourse={filterByCourse} /> : null}
          {route === "settings" ? (
            <SettingsPage
              notificationSettings={notificationSettings}
              notificationBusy={notificationBusy}
              userEmail={session.user.email}
              onNotificationPatch={saveNotificationPatch}
              onEnablePush={enablePushForDevice}
              onDisablePush={disablePushForDevice}
              onSendTest={sendTestPush}
              theme={tweaks.theme}
              onThemeChange={(v) => setTweak("theme", v)}
            />
          ) : null}
        </div>
      </main>

      {open ? (
        <AssignmentDetail a={open} onClose={() => setOpenId(null)} onToggle={toggleComplete}
                          onOpenSource={openSourceUrl}
                          onArchive={archiveItem}
                          onDelete={deleteItem}
                          onSetStatus={setStatus}
                          onEdit={openEditDialog}
                          notificationSettings={notificationSettings} />
      ) : null}

      {showNewDialog ? (
        <NewAssignmentDialog
          prefill={newDialogPrefill}
          onClose={() => { setShowNewDialog(false); setNewDialogPrefill(null); }}
          onSubmit={(d) => { addManualAssignment(d); setShowNewDialog(false); setNewDialogPrefill(null); }}
        />
      ) : null}

      {showTextImportDialog ? (
        <TextImportDialog
          onClose={() => setShowTextImportDialog(false)}
          onSubmit={async (d) => {
            const ok = await importAssignmentsFromText(d);
            if (ok) setShowTextImportDialog(false);
          }}
        />
      ) : null}

      {toast ? (
        <div className="toast" role="status">
          <Icon name="check" size={14} />
          <span>{toast.msg}</span>
          {toast.undo ? (
            <button type="button" className="toast__undo" onClick={runUndo}>Undo</button>
          ) : null}
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
        <TweakSection label="Theme">
          <TweakRadio label="Mode" value={tweaks.theme} onChange={(v) => setTweak("theme", v)}
                      options={[
                        { value: "light",  label: "Light" },
                        { value: "dark",   label: "Dark" },
                        { value: "system", label: "System" },
                      ]} />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

const dialogPanelStyle = {
  pointerEvents: "auto",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 22,
  width: "min(560px, calc(100vw - 32px))",
  maxHeight: "min(86vh, 760px)",
  overflowY: "auto",
  overflowX: "hidden",
  display: "grid",
  gap: 14,
  boxShadow: "var(--shadow-2)",
  fontFamily: "inherit",
  minWidth: 0,
};

const dialogControlStyle = {
  width: "100%",
  minWidth: 0,
  padding: "8px 10px",
  border: "1px solid var(--border)",
  borderRadius: 6,
  font: "inherit",
};

const dialogLabelStyle = {
  fontSize: 12,
  color: "var(--text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

function isoToDateInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function isoToTimeInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function defaultDueDate(offsetDays = 1) {
  const d = new Date(); d.setDate(d.getDate() + offsetDays);
  return isoToDateInput(d.toISOString());
}

function NewAssignmentDialog({ onClose, onSubmit, prefill }) {
  const [title, setTitle] = useState(prefill?.title || "");
  const [courseId, setCourseId] = useState(() => {
    if (prefill?.courseId) return prefill.courseId;
    if (prefill?.courseCode) return "__new__";
    return g.COURSES[0]?.id || "__new__";
  });
  const [newCourseCode, setNewCourseCode] = useState(prefill?.courseCode || "");
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [dueDate, setDueDate] = useState(prefill?.dueAt ? isoToDateInput(prefill.dueAt) : defaultDueDate(1));
  const [dueTime, setDueTime] = useState(prefill?.dueAt ? isoToTimeInput(prefill.dueAt) : "23:59");
  const [notes, setNotes] = useState(prefill?.notes || "");
  const useNewCourse = courseId === "__new__";
  const titleRef = React.useRef(null);

  React.useEffect(() => {
    if (prefill?.title) {
      // If title already filled by prefill, focus first empty required field
      if (!prefill.courseId && !prefill.courseCode) {
        // course needed — no autofocus on title
      } else if (!prefill.dueAt) {
        // date needed — no autofocus on title
      }
    } else {
      titleRef.current?.focus();
    }
  }, []);

  function submit(e) {
    e?.preventDefault?.();
    if (!title.trim()) return;
    if (useNewCourse && !newCourseCode.trim()) return;
    const dueAt = new Date(`${dueDate}T${dueTime}:00`).toISOString();
    onSubmit({
      title: title.trim(),
      courseId: useNewCourse ? undefined : courseId,
      courseCode: useNewCourse ? newCourseCode.trim() : undefined,
      courseTitle: useNewCourse ? (newCourseTitle.trim() || newCourseCode.trim()) : undefined,
      dueAt,
      notes: notes.trim(),
    });
  }

  function setDatePreset(kind) {
    const d = new Date();
    if (kind === "today") {
      // keep
    } else if (kind === "tomorrow") {
      d.setDate(d.getDate() + 1);
    } else if (kind === "fri") {
      const cur = d.getDay();
      const diff = ((5 - cur + 7) % 7) || 7;
      d.setDate(d.getDate() + diff);
    } else if (kind === "next-mon") {
      const cur = d.getDay();
      const diff = ((1 - cur + 7) % 7) || 7;
      d.setDate(d.getDate() + diff);
    } else if (kind === "+week") {
      d.setDate(d.getDate() + 7);
    }
    setDueDate(isoToDateInput(d.toISOString()));
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      submit(e);
    }
  }

  const titleMissing = !title.trim();
  const courseMissing = useNewCourse && !newCourseCode.trim();
  const canSubmit = !titleMissing && !courseMissing;

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div role="dialog" aria-label="New assignment" aria-modal="true"
           style={{ position: "fixed", inset: 0, display: "grid", placeItems: "center", zIndex: 60, pointerEvents: "none", padding: 16 }}>
        <form onSubmit={submit} onKeyDown={onKeyDown} style={dialogPanelStyle}>
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, minWidth: 0 }}>
            <div style={{ display: "grid", gap: 2 }}>
              <h2 className="serif" style={{ margin: 0, fontSize: 22, minWidth: 0, overflowWrap: "anywhere" }}>New assignment</h2>
              {prefill ? <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Pre-filled from quick-add — review and confirm</span> : null}
            </div>
            <Button variant="ghost" icon="x" aria-label="Close" onClick={onClose} type="button" />
          </header>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={dialogLabelStyle}>Title</span>
            <input ref={titleRef} value={title} onChange={e => setTitle(e.target.value)} required
                   placeholder="e.g. Problem Set 11"
                   style={dialogControlStyle} />
          </label>

          <div style={{ display: "grid", gap: 8 }}>
            <span style={dialogLabelStyle}>Course</span>
            <div className="pchip-row" role="radiogroup" aria-label="Course">
              {g.COURSES.map(c => (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={courseId === c.id}
                  className={`pchip ${courseId === c.id ? "pchip--on" : ""}`}
                  onClick={() => setCourseId(c.id)}
                >
                  <span className={`swatch swatch--dot color-${c.color}`} aria-hidden="true" />
                  {c.code}
                </button>
              ))}
              <button
                type="button"
                role="radio"
                aria-checked={useNewCourse}
                className={`pchip ${useNewCourse ? "pchip--on" : ""}`}
                onClick={() => setCourseId("__new__")}
              >
                <Icon name="plus" size={11} /> New course
              </button>
            </div>
            {useNewCourse ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, minWidth: 0 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Course code</span>
                  <input value={newCourseCode} onChange={e => setNewCourseCode(e.target.value)} required placeholder="MKT 3010"
                         style={dialogControlStyle} />
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Course title</span>
                  <input value={newCourseTitle} onChange={e => setNewCourseTitle(e.target.value)} placeholder="Marketing Management"
                         style={dialogControlStyle} />
                </label>
              </div>
            ) : null}
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <span style={dialogLabelStyle}>Due</span>
            <div className="pchip-row">
              <button type="button" className="pchip" onClick={() => setDatePreset("today")}>Today</button>
              <button type="button" className="pchip" onClick={() => setDatePreset("tomorrow")}>Tomorrow</button>
              <button type="button" className="pchip" onClick={() => setDatePreset("fri")}>Fri</button>
              <button type="button" className="pchip" onClick={() => setDatePreset("next-mon")}>Next Mon</button>
              <button type="button" className="pchip" onClick={() => setDatePreset("+week")}>+ 1 week</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, minWidth: 0 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Date</span>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required
                       style={dialogControlStyle} />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Time</span>
                <input type="time" value={dueTime} onChange={e => setDueTime(e.target.value)} required
                       style={dialogControlStyle} />
              </label>
            </div>
          </div>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Notes (optional)</span>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                      style={{ ...dialogControlStyle, resize: "vertical" }} />
          </label>

          <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "var(--text-soft)" }}>
              <kbd style={{ font: "inherit", fontSize: 10, padding: "1px 5px", border: "1px solid var(--border)", borderRadius: 3 }}>⌘</kbd>
              {" + "}
              <kbd style={{ font: "inherit", fontSize: 10, padding: "1px 5px", border: "1px solid var(--border)", borderRadius: 3 }}>↵</kbd>
              {" to add"}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
              <Button variant="primary" icon="plus" type="submit" disabled={!canSubmit}>Add assignment</Button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}

function TextImportDialog({ onClose, onSubmit }) {
  const [title, setTitle] = useState("Pasted syllabus text");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try {
      await onSubmit({ title: title.trim(), text: text.trim() });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="scrim" onClick={busy ? undefined : onClose} />
      <div role="dialog" aria-label="Paste syllabus or schedule text"
           style={{ position: "fixed", inset: 0, display: "grid", placeItems: "center", zIndex: 60, pointerEvents: "none", padding: 16 }}>
        <form onSubmit={submit} style={{ ...dialogPanelStyle, width: "min(680px, calc(100vw - 32px))" }}>
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, minWidth: 0 }}>
            <h2 className="serif" style={{ margin: 0, fontSize: 22, minWidth: 0, overflowWrap: "anywhere" }}>Import from text</h2>
            <Button variant="ghost" icon="x" aria-label="Close" onClick={onClose} type="button" disabled={busy} />
          </header>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={dialogLabelStyle}>Source label</span>
            <input value={title} onChange={e => setTitle(e.target.value)}
                   placeholder="e.g. Marketing syllabus week 12"
                   style={dialogControlStyle} />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={dialogLabelStyle}>Text</span>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              required
              rows={14}
              placeholder="Paste syllabus, schedule, or assignment list text here."
              style={{ ...dialogControlStyle, resize: "vertical", lineHeight: 1.45, minHeight: 260 }}
            />
          </label>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <Button variant="ghost" type="button" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button variant="primary" icon="syllabus" type="submit" disabled={busy || !text.trim()}>
              {busy ? "Extracting..." : "Extract assignments"}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}

function AuthHero() {
  const todayDt = new Date(TODAY);
  const issueNo = Math.abs(Math.ceil((todayDt - new Date(2026, 0, 12)) / (1000 * 60 * 60 * 24 * 7))) + 1;
  const dateLine = todayDt.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  return (
    <aside className="auth__hero" aria-hidden="true">
      <div className="auth__masthead">
        <b>Lazy</b>
        <span>Vol. III · No. {issueNo}</span>
      </div>
      <div className="auth__pitch">
        <span className="auth__eyebrow">A quieter way to keep up.</span>
        <h1 className="auth__title">
          Every syllabus, <em>one feed</em> — sorted by what's next.
        </h1>
        <p className="auth__lede">
          Lazy pulls assignments from Canvas, iCollege, and any syllabus you can drop in, then keeps the dashboard honest about what's due, what's late, and what still needs a second look.
        </p>
        <ul className="auth__bullets">
          <li><Icon name="check" size={14} /><span><b>Every source, one page.</b> Canvas + Brightspace + uploads, deduped.</span></li>
          <li><Icon name="bell" size={14} /><span><b>Reminders that actually arrive.</b> Email through Resend, push through your device.</span></li>
          <li><Icon name="shieldCheck" size={14} /><span><b>Uncertain items wait.</b> Anything ambiguous goes to Review before it hits your dashboard.</span></li>
        </ul>
      </div>
      <div className="auth__folio">
        <span>{dateLine}</span>
        <span>Issued today · for you</span>
      </div>
    </aside>
  );
}

function AuthShell({ title, message }) {
  return (
    <div className="auth">
      <AuthHero />
      <div className="auth__pane">
        <div className="auth__form-wrap">
          <div className="auth__form-head">
            <h2>{title}</h2>
            <p>{message}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthScreen({ message, onSubmit }) {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await onSubmit(mode, email.trim(), password);
    } finally {
      setBusy(false);
    }
  }

  const isSignup = mode === "signup";

  return (
    <div className="auth">
      <AuthHero />
      <div className="auth__pane">
        <div className="auth__form-wrap">
          <div className="auth__form-head">
            <h2>{isSignup ? "Create your account" : "Welcome back"}</h2>
            <p>
              {isSignup
                ? "It takes about 30 seconds. We store assignments and progress in your Supabase project so every device stays in sync."
                : "Sign in to pick up where you left off — synced across every device."}
            </p>
          </div>

          <div className="auth__segment" role="tablist" aria-label="Authentication mode">
            <button
              type="button"
              role="tab"
              aria-pressed={!isSignup}
              aria-selected={!isSignup}
              onClick={() => setMode("signin")}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-pressed={isSignup}
              aria-selected={isSignup}
              onClick={() => setMode("signup")}
            >
              Create account
            </button>
          </div>

          <form className="auth__form" onSubmit={submit} noValidate>
            <div className="auth__field">
              <label className="auth__label" htmlFor="auth-email">Email</label>
              <div className="auth__input-wrap">
                <Icon name="inbox" size={15} className="auth__icon" />
                <input
                  id="auth-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="you@school.edu"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
                <span />
              </div>
            </div>

            <div className="auth__field">
              <label className="auth__label" htmlFor="auth-password">Password</label>
              <div className="auth__input-wrap">
                <Icon name="lock" size={15} className="auth__icon" />
                <input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  minLength={6}
                  placeholder={isSignup ? "At least 6 characters" : "Your password"}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="auth__visibility"
                  aria-pressed={showPassword}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword(v => !v)}
                  tabIndex={-1}
                >
                  <Icon name={showPassword ? "eyeOff" : "eye"} size={15} />
                </button>
              </div>
              {isSignup ? (
                <p className="auth__hint">Use 6+ characters. Anything you keep in a password manager works.</p>
              ) : null}
            </div>

            {message ? (
              <div className="auth__error" role="alert">
                <Icon name="alert" size={14} />
                <span>{message}</span>
              </div>
            ) : null}

            <button className="auth__submit" type="submit" disabled={busy || !email || password.length < 6}>
              {busy ? "Working…" : isSignup ? "Create account" : "Sign in"}
              {!busy ? <Icon name="chevronRight" size={15} /> : null}
            </button>

            {isSignup ? (
              <p className="auth__legal">
                By creating an account you agree to keep an eye on the things <b>Lazy</b> tracks for you. We send reminders, never marketing.
              </p>
            ) : (
              <p className="auth__note">
                New here?{" "}
                <button type="button" onClick={() => setMode("signup")}>Create an account</button>
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
