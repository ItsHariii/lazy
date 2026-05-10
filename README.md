# Academic Command Center

A dashboard-first React and TypeScript prototype for tracking homework across official LMS APIs, syllabus imports, browser-helper fallback data, and manual entries.

## Architecture

The app is organized around feature modules and shared primitives:

- `src/components/ui` contains reusable buttons, badges, inputs, tabs, toggles, menus, dialogs, empty states, and status messaging.
- `src/components/layout` contains the app shell, sidebar, header, and right rail.
- Feature folders contain assignment rows/details, review queue cards, course pages, calendar views, source connection cards, settings, manual entry, and syllabus review flow.
- `src/types` defines normalized assignment, course, source, reminder, and duplicate suggestion contracts.
- `src/data` provides realistic mock assignments, courses, and source sync states.
- `src/utils` contains task normalization, duplicate scoring, confidence labels, source labels, and date formatting.

## Data Model

Every imported item is normalized into one `Assignment` model with source metadata, confidence, source history, reminders, duplicate state, LMS IDs, and optional syllabus text matches. Courses and source connections are separate records so real integrations can replace mock data without changing the dashboard components.

## State Management

The prototype uses local React state in `App.tsx` because there is no backend. State updates are intentionally centralized there: assignment completion, review approval, rejection, merge decisions, source sync simulation, manual creation, and syllabus review creation all update the normalized assignment/source arrays.

## Deduplication

`src/utils/dedupeTasks.ts` scores likely duplicate assignments using similar titles, same course, nearby due dates, identical source URLs, matching LMS metadata, and matching syllabus snippets. Suggestions are surfaced in the Review Queue and Assignment Detail view. The app records explicit merges instead of silently overwriting tasks.

## Accessibility

The interface uses semantic sections, headings, labels, role-aware tabs, visible focus rings, accessible icon buttons, color plus text status indicators, responsive wrapping, and keyboard-reachable assignment and calendar actions.

## Real API Integration Path

Replace the mock files in `src/data` with service functions that fetch Canvas OAuth assignments, Brightspace scheduled items, LMS-visible McGraw Hill links, syllabus parser results, browser-helper candidates, and manual entries. Keep the UI contract stable by returning normalized `Assignment`, `Course`, and `SourceConnection` objects.

## Commands

```bash
npm install
npm run dev
npm run build
```
