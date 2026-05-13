-- Notification delivery support for email reminders, web push, and fallbacks.

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_enabled boolean not null default true,
  push_enabled boolean not null default true,
  weekly_digest_enabled boolean not null default true,
  quiet_hours_enabled boolean not null default true,
  quiet_hours_start time not null default '22:00',
  quiet_hours_end time not null default '07:00',
  timezone text not null default 'America/New_York',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assignment_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  offset_minutes integer not null check (offset_minutes > 0),
  channel text not null check (channel in ('email', 'push', 'calendar')),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, channel, offset_minutes)
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  enabled boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  reminder_id uuid not null references public.assignment_reminders(id) on delete cascade,
  requested_channel text not null check (requested_channel in ('email', 'push', 'calendar')),
  delivered_channel text check (delivered_channel in ('email', 'push', 'email_fallback', 'calendar')),
  scheduled_for timestamptz not null,
  effective_send_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'skipped', 'failed')),
  attempt_count integer not null default 1,
  recipient_count integer not null default 0,
  provider_message_id text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (reminder_id, scheduled_for)
);

create index if not exists assignment_reminders_user_assignment_idx
  on public.assignment_reminders (user_id, assignment_id);
create index if not exists assignment_reminders_due_lookup_idx
  on public.assignment_reminders (enabled, channel, offset_minutes);
create index if not exists push_subscriptions_user_enabled_idx
  on public.push_subscriptions (user_id, enabled);
create index if not exists notification_deliveries_user_status_idx
  on public.notification_deliveries (user_id, status, scheduled_for);

drop trigger if exists set_notification_preferences_updated_at on public.notification_preferences;
create trigger set_notification_preferences_updated_at
before update on public.notification_preferences
for each row execute function public.set_updated_at();

drop trigger if exists set_assignment_reminders_updated_at on public.assignment_reminders;
create trigger set_assignment_reminders_updated_at
before update on public.assignment_reminders
for each row execute function public.set_updated_at();

drop trigger if exists set_push_subscriptions_updated_at on public.push_subscriptions;
create trigger set_push_subscriptions_updated_at
before update on public.push_subscriptions
for each row execute function public.set_updated_at();

drop trigger if exists set_notification_deliveries_updated_at on public.notification_deliveries;
create trigger set_notification_deliveries_updated_at
before update on public.notification_deliveries
for each row execute function public.set_updated_at();

create or replace function public.create_default_assignment_reminders()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.assignment_reminders (user_id, assignment_id, offset_minutes, channel, enabled)
  values
    (new.user_id, new.id, 1440, 'email', true),
    (new.user_id, new.id, 120, 'push', true)
  on conflict (assignment_id, channel, offset_minutes) do nothing;

  return new;
end;
$$;

drop trigger if exists create_default_assignment_reminders on public.assignments;
create trigger create_default_assignment_reminders
after insert on public.assignments
for each row execute function public.create_default_assignment_reminders();

insert into public.notification_preferences (user_id)
select id from auth.users
on conflict (user_id) do nothing;

insert into public.assignment_reminders (user_id, assignment_id, offset_minutes, channel, enabled)
select user_id, id, 1440, 'email', true
from public.assignments
on conflict (assignment_id, channel, offset_minutes) do nothing;

insert into public.assignment_reminders (user_id, assignment_id, offset_minutes, channel, enabled)
select user_id, id, 120, 'push', true
from public.assignments
on conflict (assignment_id, channel, offset_minutes) do nothing;

create or replace function public.notification_effective_send_at(
  p_scheduled_at timestamptz,
  p_timezone text,
  p_quiet_hours_enabled boolean,
  p_quiet_hours_start time,
  p_quiet_hours_end time
)
returns timestamptz
language plpgsql
stable
as $$
declare
  tz text := coalesce(nullif(p_timezone, ''), 'UTC');
  local_ts timestamp;
  local_time time;
  end_local timestamp;
begin
  if not coalesce(p_quiet_hours_enabled, false) or p_quiet_hours_start = p_quiet_hours_end then
    return p_scheduled_at;
  end if;

  local_ts := p_scheduled_at at time zone tz;
  local_time := local_ts::time;

  if p_quiet_hours_start < p_quiet_hours_end then
    if local_time >= p_quiet_hours_start and local_time < p_quiet_hours_end then
      end_local := local_ts::date + p_quiet_hours_end;
      return end_local at time zone tz;
    end if;
  else
    if local_time >= p_quiet_hours_start then
      end_local := local_ts::date + p_quiet_hours_end + interval '1 day';
      return end_local at time zone tz;
    elsif local_time < p_quiet_hours_end then
      end_local := local_ts::date + p_quiet_hours_end;
      return end_local at time zone tz;
    end if;
  end if;

  return p_scheduled_at;
exception
  when others then
    return p_scheduled_at;
end;
$$;

create or replace function public.claim_due_notification_reminders(
  p_now timestamptz default now(),
  p_limit integer default 100,
  p_lookback_minutes integer default 360,
  p_max_attempts integer default 5
)
returns table (
  delivery_id uuid,
  reminder_id uuid,
  user_id uuid,
  user_email text,
  assignment_id uuid,
  assignment_title text,
  course_code text,
  course_title text,
  due_at timestamptz,
  offset_minutes integer,
  requested_channel text,
  scheduled_for timestamptz,
  effective_send_at timestamptz,
  timezone text,
  email_enabled boolean
)
language sql
security definer
set search_path = public
as $$
  with due as (
    select
      r.id as reminder_id,
      a.user_id,
      u.email as user_email,
      a.id as assignment_id,
      a.title as assignment_title,
      c.code as course_code,
      c.title as course_title,
      a.due_at,
      r.offset_minutes,
      r.channel as requested_channel,
      s.scheduled_for,
      e.effective_send_at,
      coalesce(prefs.timezone, 'America/New_York') as timezone,
      coalesce(prefs.email_enabled, true) as email_enabled
    from public.assignment_reminders r
    join public.assignments a on a.id = r.assignment_id
    left join public.courses c on c.id = a.course_id
    join auth.users u on u.id = a.user_id
    left join public.notification_preferences prefs on prefs.user_id = a.user_id
    cross join lateral (
      select a.due_at - make_interval(mins => r.offset_minutes) as scheduled_for
    ) s
    cross join lateral (
      select public.notification_effective_send_at(
        s.scheduled_for,
        coalesce(prefs.timezone, 'America/New_York'),
        coalesce(prefs.quiet_hours_enabled, true),
        coalesce(prefs.quiet_hours_start, '22:00'::time),
        coalesce(prefs.quiet_hours_end, '07:00'::time)
      ) as effective_send_at
    ) e
    where r.enabled = true
      and a.status not in ('completed', 'archived')
      and (
        (r.channel = 'email' and coalesce(prefs.email_enabled, true))
        or (r.channel = 'push' and coalesce(prefs.push_enabled, true))
      )
      and e.effective_send_at <= p_now
      and e.effective_send_at >= p_now - make_interval(mins => greatest(p_lookback_minutes, 1))
    order by e.effective_send_at asc
    limit least(greatest(p_limit, 1), 500)
  ),
  claimed as (
    insert into public.notification_deliveries as d (
      user_id,
      assignment_id,
      reminder_id,
      requested_channel,
      scheduled_for,
      effective_send_at,
      status,
      attempt_count
    )
    select
      due.user_id,
      due.assignment_id,
      due.reminder_id,
      due.requested_channel,
      due.scheduled_for,
      due.effective_send_at,
      'pending',
      1
    from due
    on conflict (reminder_id, scheduled_for)
    do update set
      status = 'pending',
      effective_send_at = excluded.effective_send_at,
      error_message = null,
      updated_at = now(),
      attempt_count = d.attempt_count + 1
    where d.status = 'failed'
      and d.attempt_count < p_max_attempts
    returning d.id, d.reminder_id, d.scheduled_for
  )
  select
    claimed.id as delivery_id,
    due.reminder_id,
    due.user_id,
    due.user_email,
    due.assignment_id,
    due.assignment_title,
    due.course_code,
    due.course_title,
    due.due_at,
    due.offset_minutes,
    due.requested_channel,
    due.scheduled_for,
    due.effective_send_at,
    due.timezone,
    due.email_enabled
  from claimed
  join due
    on due.reminder_id = claimed.reminder_id
   and due.scheduled_for = claimed.scheduled_for
  order by due.effective_send_at asc;
$$;

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

  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

alter table public.notification_preferences enable row level security;
alter table public.assignment_reminders enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notification_deliveries enable row level security;

drop policy if exists "Users can read own notification preferences" on public.notification_preferences;
create policy "Users can read own notification preferences"
on public.notification_preferences for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own notification preferences" on public.notification_preferences;
create policy "Users can insert own notification preferences"
on public.notification_preferences for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own notification preferences" on public.notification_preferences;
create policy "Users can update own notification preferences"
on public.notification_preferences for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can read own assignment reminders" on public.assignment_reminders;
create policy "Users can read own assignment reminders"
on public.assignment_reminders for select
using (
  auth.uid() = user_id
  and exists (
    select 1 from public.assignments a
    where a.id = assignment_id
      and a.user_id = auth.uid()
  )
);

drop policy if exists "Users can insert own assignment reminders" on public.assignment_reminders;
create policy "Users can insert own assignment reminders"
on public.assignment_reminders for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.assignments a
    where a.id = assignment_id
      and a.user_id = auth.uid()
  )
);

drop policy if exists "Users can update own assignment reminders" on public.assignment_reminders;
create policy "Users can update own assignment reminders"
on public.assignment_reminders for update
using (
  auth.uid() = user_id
  and exists (
    select 1 from public.assignments a
    where a.id = assignment_id
      and a.user_id = auth.uid()
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.assignments a
    where a.id = assignment_id
      and a.user_id = auth.uid()
  )
);

drop policy if exists "Users can delete own assignment reminders" on public.assignment_reminders;
create policy "Users can delete own assignment reminders"
on public.assignment_reminders for delete
using (
  auth.uid() = user_id
  and exists (
    select 1 from public.assignments a
    where a.id = assignment_id
      and a.user_id = auth.uid()
  )
);

drop policy if exists "Users can read own push subscriptions" on public.push_subscriptions;
create policy "Users can read own push subscriptions"
on public.push_subscriptions for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own push subscriptions" on public.push_subscriptions;
create policy "Users can insert own push subscriptions"
on public.push_subscriptions for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own push subscriptions" on public.push_subscriptions;
create policy "Users can update own push subscriptions"
on public.push_subscriptions for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own push subscriptions" on public.push_subscriptions;
create policy "Users can delete own push subscriptions"
on public.push_subscriptions for delete
using (auth.uid() = user_id);

drop policy if exists "Users can read own notification deliveries" on public.notification_deliveries;
create policy "Users can read own notification deliveries"
on public.notification_deliveries for select
using (auth.uid() = user_id);

revoke execute on function public.claim_due_notification_reminders(timestamptz, integer, integer, integer)
from anon, authenticated;
grant execute on function public.claim_due_notification_reminders(timestamptz, integer, integer, integer)
to service_role;
