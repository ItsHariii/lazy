/* global React */
// Lucide-style line icons. Stroke = currentColor.
// Each icon: <Icon name="check" size={16} />

const ICON_PATHS = {
  // Navigation
  dashboard: <><path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/></>,
  book:      <><path d="M4 4h12a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3V4z"/><path d="M4 17h15"/></>,
  calendar:  <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></>,
  inbox:     <><path d="M3 13l3-9h12l3 9"/><path d="M3 13v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6h-6a3 3 0 0 1-6 0H3z"/></>,
  plug:     <><path d="M12 2v4M9 6h6M7 6h10v5a5 5 0 0 1-10 0V6z"/><path d="M12 16v6"/></>,
  settings:  <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></>,

  // Actions
  check:     <><path d="M5 12l5 5L20 7"/></>,
  plus:      <><path d="M12 5v14M5 12h14"/></>,
  more:      <><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></>,
  edit:      <><path d="M4 20h4l10-10-4-4L4 16v4z"/><path d="M14 6l4 4"/></>,
  external:  <><path d="M14 4h6v6"/><path d="M10 14L20 4"/><path d="M19 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"/></>,
  search:    <><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></>,
  filter:    <><path d="M3 5h18l-7 9v6l-4-2v-4L3 5z"/></>,
  refresh:   <><path d="M4 4v6h6"/><path d="M20 20v-6h-6"/><path d="M5 14a8 8 0 0 0 14 4"/><path d="M19 10A8 8 0 0 0 5 6"/></>,
  bell:      <><path d="M6 17V11a6 6 0 0 1 12 0v6"/><path d="M4 17h16"/><path d="M10 21h4"/></>,
  bookmark:  <><path d="M6 3h12v18l-6-4-6 4V3z"/></>,

  // Confidence / status / source
  shield:        <><path d="M12 3l8 3v6c0 4.5-3.4 8.4-8 9-4.6-.6-8-4.5-8-9V6l8-3z"/></>,
  shieldCheck:   <><path d="M12 3l8 3v6c0 4.5-3.4 8.4-8 9-4.6-.6-8-4.5-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/></>,
  shieldQuestion:<><path d="M12 3l8 3v6c0 4.5-3.4 8.4-8 9-4.6-.6-8-4.5-8-9V6l8-3z"/><path d="M10 10a2 2 0 1 1 3 1.7c-.6.4-1 1-1 1.6"/><path d="M12 16h0"/></>,
  alert:         <><path d="M12 9v4M12 17h0"/><path d="M10.3 3.9L2.3 18a2 2 0 0 0 1.7 3h16a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></>,

  // Sources / brands (geometric, original)
  canvas:    <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></>,
  bspace:    <><path d="M5 4h7a4 4 0 1 1 0 8H5z"/><path d="M5 12h8a4 4 0 1 1 0 8H5z"/></>,
  mcgraw:    <><path d="M3 19V5l4 6 4-6 4 6 4-6h2v14"/></>,
  syllabus:  <><path d="M5 3h11l4 4v14H5z"/><path d="M9 9h6M9 13h6M9 17h4"/></>,
  browser:   <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18"/><circle cx="6.5" cy="7" r="0.6"/><circle cx="9" cy="7" r="0.6"/></>,
  pencil:    <><path d="M14 4l6 6L8 22H2v-6L14 4z"/><path d="M13 5l6 6"/></>,

  // Misc
  chevronLeft:  <><path d="M15 6l-6 6 6 6"/></>,
  chevronRight: <><path d="M9 6l6 6-6 6"/></>,
  chevronDown:  <><path d="M6 9l6 6 6-6"/></>,
  chevronUp:    <><path d="M6 15l6-6 6 6"/></>,
  x:           <><path d="M6 6l12 12M18 6L6 18"/></>,
  link:        <><path d="M10 14a4 4 0 0 1 0-6l3-3a4 4 0 0 1 6 6l-1.5 1.5"/><path d="M14 10a4 4 0 0 1 0 6l-3 3a4 4 0 0 1-6-6l1.5-1.5"/></>,
  clock:       <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  flag:        <><path d="M5 21V4h11l-2 4 2 4H5"/></>,
  archive:     <><path d="M3 5h18v4H3z"/><path d="M5 9v11h14V9"/><path d="M10 13h4"/></>,
  upload:      <><path d="M12 16V4"/><path d="M7 9l5-5 5 5"/><path d="M5 20h14"/></>,
  help:        <><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 4"/><path d="M12 17h0"/></>,
  user:        <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  merge:       <><path d="M6 21V11a5 5 0 0 1 5-5h0a5 5 0 0 1 5 5v10"/><path d="M3 8l3-3 3 3"/></>,
  trash:       <><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/></>,
  gear:        <><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M21 12h-3M6 12H3M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1M18.4 18.4l-2.1-2.1M7.7 7.7L5.6 5.6"/></>,
  list:        <><path d="M9 6h12M9 12h12M9 18h12"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/></>,
  grid:        <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></>,
  layers:      <><path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/></>,
  archiveCheck:<><path d="M3 6h18v4H3z"/><path d="M5 10v10h14V10"/><path d="M9 14l2 2 4-4"/></>,
  globe:       <><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a13 13 0 0 1 0 18M12 3a13 13 0 0 0 0 18"/></>,
  lock:        <><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 1 1 8 0v4"/></>,
};

function Icon({ name, size = 16, strokeWidth = 1.6, className, style }) {
  const inner = ICON_PATHS[name];
  if (!inner) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"
         fill="none" stroke="currentColor"
         strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
         className={className} style={style} aria-hidden="true">
      {inner}
    </svg>
  );
}

const SOURCE_ICON = {
  canvas: "canvas",
  brightspace: "bspace",
  mcgraw_hill: "mcgraw",
  syllabus: "syllabus",
  browser_helper: "browser",
  manual: "pencil",
};

window.Icon = Icon;
window.SOURCE_ICON = SOURCE_ICON;
