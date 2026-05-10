import type { SourceConnection } from "../types/source";

export const mockSources: SourceConnection[] = [
  {
    id: "canvas-ga-state",
    name: "Canvas",
    type: "canvas",
    status: "connected",
    lastSyncedAt: "2026-05-09T14:42:00-04:00",
    permissions: ["Assignments", "Courses", "Calendar events"],
  },
  {
    id: "icollege-brightspace",
    name: "iCollege / Brightspace",
    type: "brightspace",
    status: "syncing",
    lastSyncedAt: "2026-05-09T13:58:00-04:00",
    permissions: ["Scheduled items", "Course modules", "Assignments"],
  },
  {
    id: "mcgraw-through-lms",
    name: "McGraw Hill via LMS",
    type: "mcgraw_hill",
    status: "connected",
    lastSyncedAt: "2026-05-09T12:31:00-04:00",
    permissions: ["LMS-visible homework links"],
  },
  {
    id: "syllabus-imports",
    name: "Syllabus Uploads",
    type: "syllabus",
    status: "connected",
    lastSyncedAt: "2026-05-08T19:20:00-04:00",
    permissions: ["PDF parsing", "DOCX parsing", "Image OCR", "Pasted text"],
  },
  {
    id: "browser-helper",
    name: "Browser Helper",
    type: "browser_helper",
    status: "disabled",
    permissions: ["Opt-in page scan", "Task-like data only"],
  },
  {
    id: "manual-entry",
    name: "Manual Entries",
    type: "manual",
    status: "connected",
    lastSyncedAt: "2026-05-09T11:00:00-04:00",
    permissions: ["Student-created assignments"],
  },
];
