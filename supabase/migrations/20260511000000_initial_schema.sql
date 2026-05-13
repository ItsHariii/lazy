-- Lazy Supabase schema
-- Run this file in Supabase SQL Editor, or with `supabase db push`.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null default 'manual' check (
    source in ('canvas', 'brightspace', 'syllabus', 'manual', 'mcgraw_hill', 'browser_helper')
  ),
  external_id text not null,
  code text not null,
  title text not null,
  instructor text,
  color text not null default 'graphite',
  term text,
  syllabus_file text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source, external_id)
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  source text not null check (
    source in ('canvas', 'brightspace', 'syllabus', 'manual', 'mcgraw_hill', 'browser_helper')
  ),
  external_id text,
  source_fingerprint text not null,
  title text not null,
  due_at timestamptz not null,
  status text not null default 'not_started' check (
    status in ('not_started', 'in_progress', 'overdue', 'completed', 'archived')
  ),
  confidence text not null default 'confirmed' check (
    confidence in ('confirmed', 'probable', 'needs_review')
  ),
  confidence_reason text,
  source_url text,
  notes text,
  syllabus_text_match text,
  completed_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source_fingerprint)
);

create table if not exists public.source_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null check (
    source in ('canvas', 'brightspace', 'syllabus', 'manual', 'mcgraw_hill', 'browser_helper')
  ),
  status text not null default 'off' check (
    status in ('ok', 'off', 'warn', 'error', 'syncing')
  ),
  last_synced_at timestamptz,
  items_count integer not null default 0,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source)
);

create table if not exists public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null check (
    source in ('canvas', 'brightspace', 'syllabus', 'manual', 'mcgraw_hill', 'browser_helper')
  ),
  status text not null check (status in ('ok', 'warn', 'error', 'syncing')),
  imported_count integer not null default 0,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists courses_user_idx on public.courses (user_id, code);
create index if not exists assignments_dashboard_idx on public.assignments (user_id, status, due_at);
create index if not exists assignments_course_idx on public.assignments (user_id, course_id);
create index if not exists assignments_review_idx on public.assignments (user_id, confidence, due_at);
create index if not exists sync_runs_user_source_idx on public.sync_runs (user_id, source, started_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_courses_updated_at on public.courses;
create trigger set_courses_updated_at
before update on public.courses
for each row execute function public.set_updated_at();

drop trigger if exists set_assignments_updated_at on public.assignments;
create trigger set_assignments_updated_at
before update on public.assignments
for each row execute function public.set_updated_at();

drop trigger if exists set_source_connections_updated_at on public.source_connections;
create trigger set_source_connections_updated_at
before update on public.source_connections
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  insert into public.source_connections (user_id, source, status)
  values
    (new.id, 'canvas', 'off'),
    (new.id, 'brightspace', 'off'),
    (new.id, 'syllabus', 'ok'),
    (new.id, 'manual', 'ok')
  on conflict (user_id, source) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.seed_source_connections(p_user_id uuid default auth.uid())
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  p_user_id := coalesce(p_user_id, auth.uid());

  if p_user_id is null then
    raise exception 'Missing user id';
  end if;

  if p_user_id <> auth.uid() then
    raise exception 'Cannot seed source connections for another user';
  end if;

  insert into public.source_connections (user_id, source, status)
  values
    (p_user_id, 'canvas', 'off'),
    (p_user_id, 'brightspace', 'off'),
    (p_user_id, 'syllabus', 'ok'),
    (p_user_id, 'manual', 'ok')
  on conflict (user_id, source) do nothing;
end;
$$;

create or replace function public.mark_assignment_status(
  p_assignment_id uuid,
  p_status text
)
returns public.assignments
language plpgsql
security invoker
set search_path = public
as $$
declare
  updated_assignment public.assignments;
begin
  if p_status not in ('not_started', 'in_progress', 'overdue', 'completed', 'archived') then
    raise exception 'Invalid assignment status: %', p_status;
  end if;

  update public.assignments
  set
    status = p_status,
    completed_at = case
      when p_status = 'completed' then coalesce(completed_at, now())
      when status = 'completed' and p_status <> 'completed' then null
      else completed_at
    end,
    archived_at = case
      when p_status = 'archived' then coalesce(archived_at, now())
      when status = 'archived' and p_status <> 'archived' then null
      else archived_at
    end
  where id = p_assignment_id
    and user_id = auth.uid()
  returning * into updated_assignment;

  if updated_assignment.id is null then
    raise exception 'Assignment not found';
  end if;

  return updated_assignment;
end;
$$;

create or replace function public.active_assignments()
returns setof public.assignments
language sql
security invoker
set search_path = public
as $$
  select *
  from public.assignments
  where user_id = auth.uid()
    and status not in ('completed', 'archived')
  order by due_at asc;
$$;

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.assignments enable row level security;
alter table public.source_connections enable row level security;
alter table public.sync_runs enable row level security;

drop policy if exists "Profiles are visible to owner" on public.profiles;
create policy "Profiles are visible to owner"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles for insert
with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can read own courses" on public.courses;
create policy "Users can read own courses"
on public.courses for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own courses" on public.courses;
create policy "Users can insert own courses"
on public.courses for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own courses" on public.courses;
create policy "Users can update own courses"
on public.courses for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own courses" on public.courses;
create policy "Users can delete own courses"
on public.courses for delete
using (auth.uid() = user_id);

drop policy if exists "Users can read own assignments" on public.assignments;
create policy "Users can read own assignments"
on public.assignments for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own assignments" on public.assignments;
create policy "Users can insert own assignments"
on public.assignments for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own assignments" on public.assignments;
create policy "Users can update own assignments"
on public.assignments for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own assignments" on public.assignments;
create policy "Users can delete own assignments"
on public.assignments for delete
using (auth.uid() = user_id);

drop policy if exists "Users can read own source connections" on public.source_connections;
create policy "Users can read own source connections"
on public.source_connections for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own source connections" on public.source_connections;
create policy "Users can insert own source connections"
on public.source_connections for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own source connections" on public.source_connections;
create policy "Users can update own source connections"
on public.source_connections for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can read own sync runs" on public.sync_runs;
create policy "Users can read own sync runs"
on public.sync_runs for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own sync runs" on public.sync_runs;
create policy "Users can insert own sync runs"
on public.sync_runs for insert
with check (auth.uid() = user_id);
