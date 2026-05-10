# Test Plan

## Layout

- Verify mobile, tablet, and desktop layouts.
- Verify sidebar wraps/collapses into a stable top navigation on smaller screens.
- Verify the right rail stacks below main content on tablet and mobile.
- Verify assignment rows wrap title, badges, metadata, and actions without overlap.
- Verify badge wrapping and button spacing in dashboard, review, detail, and source screens.
- Verify empty states for no tasks today, no review items, no courses, and no source errors.

## UI Restrictions

- Run `rg "gradient|emoji|blob|glassmorphism|border-radius: [0-9]{2}" src package.json index.html`.
- Confirm no gradients, emoji, decorative blobs, glassmorphism, or oversized border radii are present.
- Confirm text contrast remains readable across badges, buttons, cards, and muted copy.

## Data Behavior

- Simulate Canvas import through confirmed mock Canvas assignments.
- Simulate Brightspace / iCollege import through confirmed scheduled items.
- Simulate LMS-visible McGraw Hill import through the Brightspace-linked Connect item.
- Use the syllabus upload flow and confirm the created task enters Review Queue.
- Confirm browser-helper mock imports are marked Needs Review.
- Create a manual assignment and confirm it appears as Confirmed.
- Verify duplicate detection surfaces suggestions for similar title, same course, and nearby due date.
- Merge a duplicate and confirm the merge is recorded instead of silently deleting data.
- Edit a task due date, status, confidence, title, and notes in Assignment Detail.
- Trigger source resync and confirm sync state changes.
- Confirm reminders remain associated with new and existing assignments.

## Review Queue

- Approve a task and confirm its confidence becomes Confirmed.
- Edit a review item from the detail dialog.
- Merge a duplicate candidate.
- Reject a review item and confirm it is removed.
- Open source links for linked items.
- Confirm confidence badges differ for Confirmed, Probable, and Needs Review.
- Confirm review count updates in sidebar and right rail.

## Accessibility

- Navigate sidebar, dashboard rows, calendar markers, forms, dialogs, and menus with keyboard.
- Confirm visible focus states are present.
- Confirm form inputs and selects have labels.
- Confirm icon-only buttons have accessible names.
- Confirm status is not conveyed by color alone.
- Confirm screen-reader-friendly status messages are used for toast updates.

## Verification Commands

```bash
npm run build
curl -I http://127.0.0.1:5173/
```
