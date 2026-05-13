# Supabase Setup

Run `migrations/20260511000000_initial_schema.sql` in the Supabase SQL Editor for your project.

The migration creates:

- `profiles`
- `courses`
- `assignments`
- `source_connections`
- `sync_runs`
- Row Level Security policies scoped to `auth.uid()`
- `mark_assignment_status(...)`, which sets `completed_at` / `archived_at`
- `active_assignments()`, which excludes completed and archived rows
- source seeding for new and existing users

The app uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the browser. Keep
`SUPABASE_SERVICE_ROLE_KEY` server-only.

Completed and archived assignments are preserved during sync/import. Incoming source items are matched by
`source_fingerprint`; if a matching row is already completed or archived, the import does not reset it.
