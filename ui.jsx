/* global React, Icon, SOURCE_ICON, SOURCE_LABEL, CONFIDENCE_PRESENT, getCourse, formatDueRelative, formatDay, formatTime, formatLong */

const { useState, useRef, useEffect } = React;

// ---------- Button ----------
function Button({ variant, size, icon, iconRight, children, className = "", ...props }) {
  const cls = ["btn"];
  if (variant === "primary") cls.push("btn--primary");
  if (variant === "ghost")   cls.push("btn--ghost");
  if (variant === "danger")  cls.push("btn--danger");
  if (size === "sm")         cls.push("btn--sm");
  if (size === "lg")         cls.push("btn--lg");
  if (!children && (icon || iconRight)) cls.push("btn--icon");
  if (size === "sm" && !children && (icon || iconRight)) cls.push("btn--sm");
  cls.push(className);
  return (
    <button className={cls.join(" ")} {...props}>
      {icon ? <Icon name={icon} size={size === "lg" ? 16 : 14} /> : null}
      {children}
      {iconRight ? <Icon name={iconRight} size={size === "lg" ? 16 : 14} /> : null}
    </button>
  );
}

// ---------- Badge ----------
function Badge({ children, variant, icon, className = "", ...props }) {
  const cls = ["badge"];
  if (variant) cls.push(`badge--${variant}`);
  cls.push(className);
  return (
    <span className={cls.join(" ")} {...props}>
      {icon ? <Icon name={icon} size={11} /> : null}
      {children}
    </span>
  );
}

// ---------- ConfidenceBadge ----------
function ConfidenceBadge({ confidence, size }) {
  const p = CONFIDENCE_PRESENT[confidence];
  if (!p) return null;
  const iconName = confidence === "confirmed" ? "shieldCheck" : confidence === "probable" ? "shield" : "shieldQuestion";
  return (
    <Badge variant={p.cls.replace("badge--","")} icon={iconName}>
      {p.label}
    </Badge>
  );
}

// ---------- SourceBadge ----------
function SourceBadge({ source }) {
  return (
    <span className="arow__source" title={SOURCE_LABEL[source]} aria-label={`Imported from ${SOURCE_LABEL[source]}`}>
      <Icon name={SOURCE_ICON[source]} size={13} />
      <span>{SOURCE_LABEL[source]}</span>
    </span>
  );
}

// ---------- Course swatch ----------
function CourseSwatch({ color, kind = "bar" }) {
  return <span className={`swatch swatch--${kind} color-${color}`} aria-hidden="true" />;
}

// ---------- Tabs ----------
function Tabs({ value, onChange, options }) {
  return (
    <div className="tabs" role="tablist">
      {options.map(o => (
        <button key={o.value} role="tab"
                aria-selected={value === o.value}
                className="tabs__btn"
                onClick={() => onChange(o.value)}>
          {o.label}
          {o.count !== undefined ? <span style={{ opacity: 0.55, marginLeft: 6 }}>{o.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

// ---------- Toggle ----------
function Toggle({ checked, onChange, label, id }) {
  const inputId = id || `t-${Math.random().toString(36).slice(2,8)}`;
  return (
    <label className="toggle" htmlFor={inputId}>
      <input id={inputId} type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="toggle__track" aria-hidden="true" />
      {label ? <span>{label}</span> : null}
    </label>
  );
}

// ---------- Search ----------
function Search({ value, onChange, placeholder = "Search assignments…" }) {
  return (
    <div className="search">
      <Icon name="search" size={14} />
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} aria-label="Search" />
      <kbd>⌘ K</kbd>
    </div>
  );
}

// ---------- Empty state ----------
function EmptyState({ icon = "check", title, body, action }) {
  return (
    <div className="empty">
      <div className="empty__icon"><Icon name={icon} size={18} /></div>
      <h4 className="serif">{title}</h4>
      {body ? <p>{body}</p> : null}
      {action ? action : null}
    </div>
  );
}

// ---------- Menu (simple controlled) ----------
function Menu({ trigger, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    function onDoc(e) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <span onClick={() => setOpen(o => !o)}>{trigger}</span>
      {open ? (
        <div style={{
          position: "absolute", right: 0, top: "calc(100% + 4px)",
          background: "#fff", border: "1px solid var(--border)", borderRadius: 8,
          boxShadow: "var(--shadow-2)", padding: 4, minWidth: 200, zIndex: 20,
          display: "grid", gap: 1,
        }}>
          {React.Children.map(children, child =>
            React.cloneElement(child, { onSelect: () => { setOpen(false); child.props.onSelect && child.props.onSelect(); } })
          )}
        </div>
      ) : null}
    </div>
  );
}
function MenuItem({ icon, children, onSelect, danger }) {
  return (
    <button onClick={onSelect}
      style={{
        display: "grid", gridTemplateColumns: "16px 1fr", gap: 8, alignItems: "center",
        background: "transparent", border: 0, padding: "7px 8px", borderRadius: 6,
        font: "inherit", textAlign: "left", color: danger ? "var(--danger)" : "var(--text)",
      }}
      onMouseEnter={e => e.currentTarget.style.background = "var(--surface-subtle)"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
      {icon ? <Icon name={icon} size={14} /> : <span/>}
      <span style={{ fontSize: 13 }}>{children}</span>
    </button>
  );
}

// ---------- AssignmentRow ----------
function AssignmentRow({ a, course, onToggle, onOpen, dense }) {
  const due = formatDueRelative(a.dueAt);
  const isCompleted = a.status === "completed";
  return (
    <div className="arow" data-status={a.status} role="article" aria-label={a.title}>
      <span className={`arow__rail color-${course.color}`} aria-hidden="true">
        {(course.code.match(/[A-Z]/) || ["•"])[0]}
      </span>
      <button
        className="arow__check"
        aria-checked={isCompleted}
        role="checkbox"
        aria-label={isCompleted ? "Mark incomplete" : "Mark complete"}
        onClick={(e) => { e.stopPropagation(); onToggle(a); }}
      >
        {isCompleted ? <Icon name="check" size={13} /> : null}
      </button>

      <button className="arow__body"
              onClick={() => onOpen(a)}
              style={{ background: "transparent", border: 0, padding: 0, font: "inherit", color: "inherit", textAlign: "left", cursor: "pointer", display: "grid", gap: 6, minWidth: 0 }}>
        <div className="arow__title-line">
          <h3 className="arow__title">{a.title}</h3>
          {a.confidence !== "confirmed" ? <ConfidenceBadge confidence={a.confidence} /> : null}
          {a.duplicateOf ? <Badge variant="ghost" icon="merge">Possible duplicate</Badge> : null}
        </div>
        <div className="arow__meta">
          <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
            <CourseSwatch color={course.color} kind="dot" />
            <span style={{ fontWeight: 600 }}>{course.code}</span>
          </span>
          <span className="arow__meta-sep" aria-hidden="true" />
          <SourceBadge source={a.source} />
          {a.notes ? (
            <>
              <span className="arow__meta-sep" aria-hidden="true" />
              <span style={{ fontStyle: "italic" }}>Has notes</span>
            </>
          ) : null}
        </div>
      </button>

      <div className="arow__due">
        <span className={`arow__due-rel ${due.soon === "now" ? "arow__due-rel--now" : due.soon === "soon" ? "arow__due-rel--soon" : ""}`}>
          {due.rel}
        </span>
        <span className="arow__due-day">{formatDay(a.dueAt)}</span>
        <span className="arow__due-time">{formatTime(a.dueAt)}</span>
      </div>

      <div className="arow__badges">
        {a.status === "in_progress" ? <Badge variant="info" icon="clock">In progress</Badge> : null}
        {a.status === "overdue"     ? <Badge variant="danger" icon="alert">Overdue</Badge> : null}
        {a.confidence === "confirmed" && a.status === "not_started" ? <Badge>Not started</Badge> : null}
        {a.status === "completed"   ? <Badge variant="success" icon="check">Complete</Badge> : null}
      </div>

      <div className="arow__actions" onClick={e => e.stopPropagation()}>
        <Button variant="ghost" size="sm" icon="external" aria-label="Open source" />
        <Button variant="ghost" size="sm" icon="edit" aria-label="Edit assignment" />
        <Menu trigger={<Button variant="ghost" size="sm" icon="more" aria-label="More actions" />}>
          <MenuItem icon="bell">Set reminder</MenuItem>
          <MenuItem icon="bookmark">Save for later</MenuItem>
          <MenuItem icon="archive">Archive</MenuItem>
          <MenuItem icon="trash" danger>Delete</MenuItem>
        </Menu>
      </div>
    </div>
  );
}

Object.assign(window, {
  Button, Badge, ConfidenceBadge, SourceBadge, CourseSwatch,
  Tabs, Toggle, Search, EmptyState, Menu, MenuItem, AssignmentRow,
});
