-- ============================================================
-- CYBER SENTINEL CS SYMPOSIUM MANAGEMENT SYSTEM
-- Supabase PostgreSQL Database Schema
-- ============================================================
-- Run this entire file in Supabase SQL Editor.
-- Designed for:
--   Day 1 = Technical Events
--   Day 2 = Non-Technical Events
--   Day-based participant registration
--   Manual UPI payment + UTR + screenshot verification
--   Event-specific teams
--   QR registration + QR attendance
--   Admin / Coordinator roles
--   Supabase RLS
-- ============================================================

-- ------------------------------------------------------------
-- 1. EXTENSIONS
-- ------------------------------------------------------------

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 2. ENUM TYPES
-- ------------------------------------------------------------

do $$ begin
  create type public.user_role as enum ('ADMIN', 'COORDINATOR');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.event_day as enum ('DAY_1', 'DAY_2');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.event_type as enum ('INDIVIDUAL', 'TEAM');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.registration_status as enum (
    'DRAFT',
    'PAYMENT_PENDING',
    'CONFIRMED',
    'CANCELLED'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.payment_status as enum (
    'PENDING',
    'UNDER_REVIEW',
    'VERIFIED',
    'REJECTED',
    'FLAGGED'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.team_status as enum ('OPEN', 'FULL', 'LOCKED', 'DISBANDED');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.member_role as enum ('LEADER', 'MEMBER');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.invitation_status as enum (
    'PENDING',
    'ACCEPTED',
    'REJECTED',
    'EXPIRED',
    'CANCELLED'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.attendance_status as enum ('PRESENT', 'CANCELLED');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.email_status as enum ('QUEUED', 'SENT', 'FAILED');
exception when duplicate_object then null;
end $$;

-- ------------------------------------------------------------
-- 3. PROFILES
-- Staff profiles are independent of Supabase auth.users.
-- Participants do NOT need staff auth accounts.
-- ------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  password_hash text,
  role public.user_role not null default 'COORDINATOR',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_email_unique_idx
  on public.profiles (lower(email));

create table if not exists public.coordinator_sessions (
  token uuid primary key default gen_random_uuid(),
  coordinator_id uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null default now() + interval '12 hours',
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 4. PARTICIPANTS
-- ------------------------------------------------------------

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  college text not null,
  department text not null,
  phone text not null,
  email text not null,
  year text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists participants_email_idx
  on public.participants (lower(email));

create index if not exists participants_phone_idx
  on public.participants (phone);

-- ------------------------------------------------------------
-- 5. EVENTS
-- ------------------------------------------------------------

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  day public.event_day not null,
  event_type public.event_type not null default 'INDIVIDUAL',

  -- For individual event: 1
  -- For team event: 2 or 3 (or another configured size)
  min_team_size integer not null default 1,
  max_team_size integer not null default 1,

  venue text,
  event_date date,
  start_time time,
  end_time time,

  registration_fee numeric(10,2) not null default 0
    check (registration_fee >= 0),

  status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'INACTIVE', 'COMPLETED')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (min_team_size >= 1),
  check (max_team_size >= min_team_size),

  -- Individual events must have exactly one participant.
  check (
    (event_type = 'INDIVIDUAL' and min_team_size = 1 and max_team_size = 1)
    or
    (event_type = 'TEAM' and max_team_size >= 2)
  )
);

create index if not exists events_day_idx
  on public.events (day);

create index if not exists events_status_idx
  on public.events (status);

-- ------------------------------------------------------------
-- 6. EVENT COORDINATORS
-- A coordinator can manage multiple events.
-- An event can have multiple coordinators.
-- ------------------------------------------------------------

create table if not exists public.event_coordinators (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  coordinator_user_id uuid not null references public.profiles(id) on delete cascade,
  assigned_at timestamptz not null default now(),

  unique (event_id, coordinator_user_id)
);

create index if not exists event_coordinators_event_idx
  on public.event_coordinators (event_id);

create index if not exists event_coordinators_coordinator_idx
  on public.event_coordinators (coordinator_user_id);

-- ------------------------------------------------------------
-- 7. REGISTRATIONS
--
-- Registration is DAY based.
-- selected_day can be:
--   DAY_1
--   DAY_2
--   BOTH
--
-- Public registration code example:
--   CS-2452
-- ------------------------------------------------------------

-- Add a third-day value separately because enum is currently only
-- used by events. Registration day is represented by text with a check.

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),

  participant_id uuid not null references public.participants(id) on delete cascade,

  registration_code text not null unique,

  selected_day text not null
    check (selected_day in ('DAY_1', 'DAY_2', 'BOTH')),

  status public.registration_status not null default 'PAYMENT_PENDING',

  -- Secure random token used by QR/verification flow.
  qr_token uuid unique default gen_random_uuid(),

  confirmed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists registrations_participant_idx
  on public.registrations (participant_id);

create index if not exists registrations_day_idx
  on public.registrations (selected_day);

create index if not exists registrations_status_idx
  on public.registrations (status);

create index if not exists registrations_qr_token_idx
  on public.registrations (qr_token);

-- ------------------------------------------------------------
-- 8. PAYMENTS
--
-- College provides official QR.
-- Participant enters UTR and uploads screenshot.
-- Admin/coordinator manually verifies payment.
-- ------------------------------------------------------------

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),

  registration_id uuid not null unique
    references public.registrations(id) on delete cascade,

  amount numeric(10,2) not null
    check (amount >= 0),

  utr text not null,

  screenshot_path text not null,

  status public.payment_status not null default 'PENDING',

  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,

  rejection_reason text,
  review_note text,

  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists payments_utr_unique_idx
  on public.payments (upper(utr));

create index if not exists payments_status_idx
  on public.payments (status);

create index if not exists payments_registration_idx
  on public.payments (registration_id);

-- ------------------------------------------------------------
-- 9. EVENT REGISTRATIONS / ACCESS
--
-- Because registration is day-based, this table represents
-- participant eligibility for individual/team events.
--
-- Initially the system can create rows for all events on the
-- participant's selected day after payment confirmation.
-- ------------------------------------------------------------

create table if not exists public.event_registrations (
  id uuid primary key default gen_random_uuid(),

  registration_id uuid not null references public.registrations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,

  registered_at timestamptz not null default now(),
  active boolean not null default true,

  unique (registration_id, event_id)
);

create index if not exists event_registrations_event_idx
  on public.event_registrations (event_id);

create index if not exists event_registrations_registration_idx
  on public.event_registrations (registration_id);

-- ------------------------------------------------------------
-- 10. EVENT TEAMS
-- ------------------------------------------------------------

create table if not exists public.event_teams (
  id uuid primary key default gen_random_uuid(),

  event_id uuid not null references public.events(id) on delete cascade,

  team_code text not null unique,
  team_name text not null,

  leader_registration_id uuid
    references public.registrations(id) on delete set null,

  max_members integer not null,

  status public.team_status not null default 'OPEN',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (max_members >= 2)
);

create index if not exists event_teams_event_idx
  on public.event_teams (event_id);

create index if not exists event_teams_leader_idx
  on public.event_teams (leader_registration_id);

-- ------------------------------------------------------------
-- 11. TEAM MEMBERS
-- ------------------------------------------------------------

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),

  team_id uuid not null references public.event_teams(id) on delete cascade,

  registration_id uuid not null references public.registrations(id) on delete cascade,

  member_role public.member_role not null default 'MEMBER',

  joined_at timestamptz not null default now(),

  unique (team_id, registration_id)
);

create index if not exists team_members_team_idx
  on public.team_members (team_id);

create index if not exists team_members_registration_idx
  on public.team_members (registration_id);

-- ------------------------------------------------------------
-- 12. TEAM INVITATIONS
-- ------------------------------------------------------------

create table if not exists public.team_invitations (
  id uuid primary key default gen_random_uuid(),

  team_id uuid not null references public.event_teams(id) on delete cascade,

  registration_id uuid
    references public.registrations(id) on delete cascade,

  invite_email text,

  invite_token uuid not null unique default gen_random_uuid(),

  status public.invitation_status not null default 'PENDING',

  expires_at timestamptz not null default (now() + interval '24 hours'),

  created_at timestamptz not null default now(),

  check (registration_id is not null or invite_email is not null)
);

create index if not exists team_invitations_team_idx
  on public.team_invitations (team_id);

create index if not exists team_invitations_registration_idx
  on public.team_invitations (registration_id);

-- ------------------------------------------------------------
-- 13. ATTENDANCE
-- ------------------------------------------------------------

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),

  registration_id uuid not null
    references public.registrations(id) on delete cascade,

  event_id uuid not null
    references public.events(id) on delete cascade,

  scanned_by uuid
    references public.profiles(id) on delete set null,

  scanned_at timestamptz not null default now(),

  status public.attendance_status not null default 'PRESENT',

  -- Useful for offline PWA synchronization.
  sync_id uuid unique default gen_random_uuid(),
  device_id text,
  offline_recorded_at timestamptz,

  unique (registration_id, event_id)
);

create index if not exists attendance_event_idx
  on public.attendance (event_id);

create index if not exists attendance_registration_idx
  on public.attendance (registration_id);

create index if not exists attendance_scanned_at_idx
  on public.attendance (scanned_at);

-- ------------------------------------------------------------
-- 14. ANNOUNCEMENTS
-- ------------------------------------------------------------

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),

  title text not null,
  message text not null,

  -- ALL, DAY, EVENT, INDIVIDUAL
  target_scope text not null
    check (target_scope in ('ALL', 'DAY', 'EVENT', 'INDIVIDUAL')),

  target_day text
    check (target_day is null or target_day in ('DAY_1', 'DAY_2', 'BOTH')),

  target_event_id uuid references public.events(id) on delete set null,

  target_registration_id uuid
    references public.registrations(id) on delete set null,

  created_by uuid
    references public.profiles(id) on delete set null,

  created_at timestamptz not null default now()
);

create index if not exists announcements_created_at_idx
  on public.announcements(created_at desc);

-- ------------------------------------------------------------
-- 15. EMAIL LOGS
-- ------------------------------------------------------------

create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),

  recipient text not null,
  template_type text not null,

  related_registration_id uuid
    references public.registrations(id) on delete set null,

  status public.email_status not null default 'QUEUED',

  provider_message_id text,

  error_message text,

  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists email_logs_recipient_idx
  on public.email_logs (lower(recipient));

create index if not exists email_logs_status_idx
  on public.email_logs(status);

-- ------------------------------------------------------------
-- 16. UPDATED_AT TRIGGER
-- ------------------------------------------------------------

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

drop trigger if exists set_participants_updated_at on public.participants;
create trigger set_participants_updated_at
before update on public.participants
for each row execute function public.set_updated_at();

drop trigger if exists set_events_updated_at on public.events;
create trigger set_events_updated_at
before update on public.events
for each row execute function public.set_updated_at();

drop trigger if exists set_registrations_updated_at on public.registrations;
create trigger set_registrations_updated_at
before update on public.registrations
for each row execute function public.set_updated_at();

drop trigger if exists set_payments_updated_at on public.payments;
create trigger set_payments_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

drop trigger if exists set_event_teams_updated_at on public.event_teams;
create trigger set_event_teams_updated_at
before update on public.event_teams
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 17. REGISTRATION CODE GENERATOR
-- ------------------------------------------------------------
-- Example output:
--   CS-2452
-- ------------------------------------------------------------

create or replace function public.generate_registration_code()
returns text
language plpgsql
as $$
declare
  new_code text;
begin
  loop
    new_code := 'CS-' || lpad((floor(random() * 10000))::int::text, 4, '0');

    exit when not exists (
      select 1
      from public.registrations
      where registration_code = new_code
    );
  end loop;

  return new_code;
end;
$$;

-- ------------------------------------------------------------
-- 18. TEAM CODE GENERATOR
-- ------------------------------------------------------------

create or replace function public.generate_team_code(p_event_code text)
returns text
language plpgsql
as $$
declare
  new_code text;
begin
  loop
    new_code :=
      upper(left(regexp_replace(p_event_code, '[^A-Za-z0-9]', '', 'g'), 6))
      || '-'
      || lpad((floor(random() * 1000))::int::text, 3, '0');

    exit when not exists (
      select 1
      from public.event_teams
      where team_code = new_code
    );
  end loop;

  return new_code;
end;
$$;

-- ------------------------------------------------------------
-- 19. HELPER FUNCTIONS FOR ROLE CHECKING
-- ------------------------------------------------------------

create or replace function public.current_actor_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    auth.uid(),
    (select coordinator_id from public.coordinator_sessions
     where token = nullif(current_setting('request.headers', true)::json->>'x-coordinator-token', '')::uuid
       and expires_at > now())
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = public.current_actor_id()
      and role = 'ADMIN'
      and active = true
  );
$$;

create or replace function public.is_coordinator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = public.current_actor_id()
      and role = 'COORDINATOR'
      and active = true
  );
$$;

create or replace function public.is_event_coordinator(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.event_coordinators ec
    join public.profiles p
      on p.id = ec.coordinator_user_id
    where ec.event_id = p_event_id
      and ec.coordinator_user_id = public.current_actor_id()
      and p.active = true
      and p.role = 'COORDINATOR'
  );
$$;

-- ------------------------------------------------------------
-- 20. FUNCTION TO CHECK DAY ACCESS
-- ------------------------------------------------------------

create or replace function public.registration_has_day_access(
  p_registration_id uuid,
  p_event_day public.event_day
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.registrations r
    where r.id = p_registration_id
      and r.status = 'CONFIRMED'
      and (
        r.selected_day = 'BOTH'
        or (r.selected_day = 'DAY_1' and p_event_day = 'DAY_1')
        or (r.selected_day = 'DAY_2' and p_event_day = 'DAY_2')
      )
  );
$$;

-- ------------------------------------------------------------
-- 21. AUTO-CREATE EVENT ACCESS AFTER PAYMENT VERIFICATION
-- ------------------------------------------------------------
-- Call this function from the backend/Edge Function when payment
-- is verified. It can also be called manually by an admin.
-- It creates access to every event on the participant's selected
-- day(s).

create or replace function public.confirm_registration(
  p_registration_id uuid,
  p_verified_by uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day text;
begin
  select selected_day
  into v_day
  from public.registrations
  where id = p_registration_id;

  if v_day is null then
    raise exception 'Registration not found';
  end if;

  update public.registrations
  set
    status = 'CONFIRMED',
    confirmed_at = now(),
    updated_at = now()
  where id = p_registration_id;

  update public.payments
  set
    status = 'VERIFIED',
    verified_by = p_verified_by,
    verified_at = now(),
    updated_at = now()
  where registration_id = p_registration_id;

  insert into public.event_registrations (registration_id, event_id)
  select p_registration_id, e.id
  from public.events e
  where e.status = 'ACTIVE'
    and (
      v_day = 'BOTH'
      or (v_day = 'DAY_1' and e.day = 'DAY_1')
      or (v_day = 'DAY_2' and e.day = 'DAY_2')
    )
  on conflict (registration_id, event_id) do nothing;

  return true;
end;
$$;

-- ------------------------------------------------------------
-- 22. PAYMENT REJECTION FUNCTION
-- ------------------------------------------------------------

create or replace function public.reject_payment(
  p_registration_id uuid,
  p_reason text,
  p_rejected_by uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.payments
  set
    status = 'REJECTED',
    rejection_reason = p_reason,
    verified_by = p_rejected_by,
    verified_at = now(),
    updated_at = now()
  where registration_id = p_registration_id;

  update public.registrations
  set
    status = 'PAYMENT_PENDING',
    updated_at = now()
  where id = p_registration_id;

  return true;
end;
$$;

-- ------------------------------------------------------------
-- 23. TEAM MEMBER COUNT
-- ------------------------------------------------------------

create or replace function public.team_member_count(p_team_id uuid)
returns integer
language sql
stable
as $$
  select count(*)::integer
  from public.team_members
  where team_id = p_team_id;
$$;

-- ------------------------------------------------------------
-- 24. CHECK WHETHER REGISTRATION CAN JOIN TEAM EVENT
-- ------------------------------------------------------------

create or replace function public.can_join_team_event(
  p_registration_id uuid,
  p_event_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.event_registrations er
    join public.events e on e.id = er.event_id
    join public.registrations r on r.id = er.registration_id
    where er.registration_id = p_registration_id
      and er.event_id = p_event_id
      and er.active = true
      and r.status = 'CONFIRMED'
      and e.event_type = 'TEAM'
  );
$$;

-- ------------------------------------------------------------
-- 25. ATTENDANCE SCAN FUNCTION
-- ------------------------------------------------------------
-- This should be called by the scanner/backend.
-- It prevents duplicate attendance through the unique constraint.

create or replace function public.record_attendance(
  p_qr_token uuid,
  p_event_id uuid,
  p_scanned_by uuid,
  p_device_id text default null,
  p_offline_recorded_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_registration_id uuid;
  v_participant_name text;
  v_registration_code text;
  v_event_day public.event_day;
  v_existing timestamptz;
begin

  select
    r.id,
    p.name,
    r.registration_code,
    e.day
  into
    v_registration_id,
    v_participant_name,
    v_registration_code,
    v_event_day
  from public.registrations r
  join public.participants p
    on p.id = r.participant_id
  cross join public.events e
  where r.qr_token = p_qr_token
    and e.id = p_event_id;

  if v_registration_id is null then
    return jsonb_build_object(
      'success', false,
      'code', 'INVALID_QR',
      'message', 'Invalid QR or participant is not registered for this event.'
    );
  end if;

  if not public.registration_has_day_access(v_registration_id, v_event_day) then
    return jsonb_build_object(
      'success', false,
      'code', 'WRONG_DAY',
      'message', 'Participant is not registered for this event day.'
    );
  end if;

  if not exists (
    select 1
    from public.event_registrations er
    where er.registration_id = v_registration_id
      and er.event_id = p_event_id
      and er.active = true
  ) then
    return jsonb_build_object(
      'success', false,
      'code', 'NOT_REGISTERED',
      'message', 'Participant is not registered for this event.'
    );
  end if;

  select scanned_at
  into v_existing
  from public.attendance
  where registration_id = v_registration_id
    and event_id = p_event_id
    and status = 'PRESENT';

  if v_existing is not null then
    return jsonb_build_object(
      'success', false,
      'code', 'ALREADY_PRESENT',
      'message', 'Participant already checked in.',
      'scanned_at', v_existing,
      'registration_code', v_registration_code,
      'participant_name', v_participant_name
    );
  end if;

  insert into public.attendance (
    registration_id,
    event_id,
    scanned_by,
    device_id,
    offline_recorded_at,
    status
  )
  values (
    v_registration_id,
    p_event_id,
    p_scanned_by,
    p_device_id,
    p_offline_recorded_at,
    'PRESENT'
  )
  on conflict (registration_id, event_id)
  do update set
    status = 'PRESENT',
    scanned_by = excluded.scanned_by,
    scanned_at = now(),
    device_id = excluded.device_id,
    offline_recorded_at = excluded.offline_recorded_at;

  return jsonb_build_object(
    'success', true,
    'code', 'CHECKED_IN',
    'message', 'Attendance recorded successfully.',
    'registration_code', v_registration_code,
    'participant_name', v_participant_name,
    'scanned_at', now()
  );
end;
$$;

-- ------------------------------------------------------------
-- 26. DASHBOARD VIEWS
-- ------------------------------------------------------------

create or replace view public.admin_registration_summary as
select
  count(*) as total_registrations,
  count(*) filter (where selected_day = 'DAY_1') as day_1_registrations,
  count(*) filter (where selected_day = 'DAY_2') as day_2_registrations,
  count(*) filter (where selected_day = 'BOTH') as both_day_registrations,
  count(*) filter (where status = 'CONFIRMED') as confirmed_registrations,
  count(*) filter (where status = 'PAYMENT_PENDING') as payment_pending,
  count(*) filter (where status = 'CANCELLED') as cancelled_registrations
from public.registrations;

create or replace view public.admin_payment_summary as
select
  count(*) as total_payments,
  count(*) filter (where status = 'VERIFIED') as verified_payments,
  count(*) filter (where status = 'PENDING') as pending_payments,
  count(*) filter (where status = 'UNDER_REVIEW') as under_review_payments,
  count(*) filter (where status = 'REJECTED') as rejected_payments,
  count(*) filter (where status = 'FLAGGED') as flagged_payments,
  coalesce(sum(amount) filter (where status = 'VERIFIED'), 0) as verified_amount
from public.payments;

create or replace view public.team_summary as
select
  et.id,
  et.team_code,
  et.team_name,
  e.code as event_code,
  e.name as event_name,
  e.day,
  et.leader_registration_id as team_leader_registration_id,
  et.max_members,
  count(tm.id)::integer as current_members,
  et.status
from public.event_teams et
join public.events e on e.id = et.event_id
left join public.team_members tm on tm.team_id = et.id
group by
  et.id,
  et.team_code,
  et.team_name,
  e.code,
  e.name,
  e.day,
  et.leader_registration_id,
  et.max_members,
  et.status;

-- ------------------------------------------------------------
-- 27. ROW LEVEL SECURITY
-- ------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.participants enable row level security;
alter table public.events enable row level security;
alter table public.event_coordinators enable row level security;
alter table public.registrations enable row level security;
alter table public.payments enable row level security;
alter table public.event_registrations enable row level security;
alter table public.event_teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_invitations enable row level security;
alter table public.attendance enable row level security;
alter table public.announcements enable row level security;
alter table public.email_logs enable row level security;

-- ------------------------------------------------------------
-- 28. PROFILE POLICIES
-- ------------------------------------------------------------

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all
on public.profiles
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select
on public.profiles
for select
to authenticated
using (id = public.current_actor_id());

-- ------------------------------------------------------------
-- 29. PARTICIPANT POLICIES
-- ------------------------------------------------------------
-- Staff can manage participants.
-- Public participant registration should use a server-side
-- Edge Function/service role rather than exposing unrestricted
-- INSERT access to the browser.

drop policy if exists participants_admin_all on public.participants;
create policy participants_admin_all
on public.participants
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists participants_coordinator_select on public.participants;
create policy participants_coordinator_select
on public.participants
for select
to authenticated
using (
  public.is_coordinator()
  and exists (
    select 1
    from public.event_registrations er
    join public.event_coordinators ec
      on ec.event_id = er.event_id
    where er.registration_id in (
      select r.id
      from public.registrations r
      where r.participant_id = participants.id
    )
    and ec.coordinator_user_id = public.current_actor_id()
  )
);

-- ------------------------------------------------------------
-- 30. EVENT POLICIES
-- ------------------------------------------------------------

drop policy if exists events_authenticated_select on public.events;
create policy events_authenticated_select
on public.events
for select
to public
using (true);

drop policy if exists events_admin_all on public.events;
create policy events_admin_all
on public.events
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ------------------------------------------------------------
-- 31. EVENT COORDINATOR POLICIES
-- ------------------------------------------------------------

drop policy if exists event_coordinators_admin_all on public.event_coordinators;
create policy event_coordinators_admin_all
on public.event_coordinators
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists event_coordinators_self_select on public.event_coordinators;
create policy event_coordinators_self_select
on public.event_coordinators
for select
to authenticated
using (coordinator_user_id = public.current_actor_id());

-- ------------------------------------------------------------
-- 32. REGISTRATION POLICIES
-- ------------------------------------------------------------

drop policy if exists registrations_admin_all on public.registrations;
create policy registrations_admin_all
on public.registrations
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists registrations_coordinator_select on public.registrations;
create policy registrations_coordinator_select
on public.registrations
for select
to authenticated
using (
  public.is_coordinator()
  and exists (
    select 1
    from public.event_registrations er
    join public.event_coordinators ec
      on ec.event_id = er.event_id
    where er.registration_id = registrations.id
      and ec.coordinator_user_id = public.current_actor_id()
  )
);

-- ------------------------------------------------------------
-- 33. PAYMENT POLICIES
-- ------------------------------------------------------------

drop policy if exists payments_admin_all on public.payments;
create policy payments_admin_all
on public.payments
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists payments_coordinator_select on public.payments;
create policy payments_coordinator_select
on public.payments
for select
to authenticated
using (
  public.is_coordinator()
  and exists (
    select 1
    from public.event_registrations er
    join public.event_coordinators ec
      on ec.event_id = er.event_id
    where er.registration_id = payments.registration_id
      and ec.coordinator_user_id = public.current_actor_id()
  )
);

drop policy if exists payments_coordinator_update on public.payments;
create policy payments_coordinator_update
on public.payments
for update
to authenticated
using (
  public.is_coordinator()
  and exists (
    select 1
    from public.event_registrations er
    join public.event_coordinators ec
      on ec.event_id = er.event_id
    where er.registration_id = payments.registration_id
      and ec.coordinator_user_id = public.current_actor_id()
  )
)
with check (
  public.is_coordinator()
  and exists (
    select 1
    from public.event_registrations er
    join public.event_coordinators ec
      on ec.event_id = er.event_id
    where er.registration_id = payments.registration_id
      and ec.coordinator_user_id = public.current_actor_id()
  )
);

-- ------------------------------------------------------------
-- 34. EVENT REGISTRATION POLICIES
-- ------------------------------------------------------------

drop policy if exists event_registrations_admin_all on public.event_registrations;
create policy event_registrations_admin_all
on public.event_registrations
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists event_registrations_coordinator_select
on public.event_registrations;
create policy event_registrations_coordinator_select
on public.event_registrations
for select
to authenticated
using (
  public.is_coordinator()
  and public.is_event_coordinator(event_id)
);

-- ------------------------------------------------------------
-- 35. TEAM POLICIES
-- ------------------------------------------------------------

drop policy if exists event_teams_admin_all on public.event_teams;
create policy event_teams_admin_all
on public.event_teams
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists event_teams_coordinator_select on public.event_teams;
create policy event_teams_coordinator_select
on public.event_teams
for select
to authenticated
using (
  public.is_coordinator()
  and public.is_event_coordinator(event_id)
);

drop policy if exists team_members_admin_all on public.team_members;
create policy team_members_admin_all
on public.team_members
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists team_members_coordinator_select on public.team_members;
create policy team_members_coordinator_select
on public.team_members
for select
to authenticated
using (
  public.is_coordinator()
  and exists (
    select 1
    from public.event_teams et
    where et.id = team_members.team_id
      and public.is_event_coordinator(et.event_id)
  )
);

-- ------------------------------------------------------------
-- 36. ATTENDANCE POLICIES
-- ------------------------------------------------------------

drop policy if exists attendance_admin_all on public.attendance;
create policy attendance_admin_all
on public.attendance
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists attendance_coordinator_select on public.attendance;
create policy attendance_coordinator_select
on public.attendance
for select
to authenticated
using (
  public.is_coordinator()
  and public.is_event_coordinator(event_id)
);

drop policy if exists attendance_coordinator_insert on public.attendance;
create policy attendance_coordinator_insert
on public.attendance
for insert
to authenticated
with check (
  public.is_coordinator()
  and public.is_event_coordinator(event_id)
);

-- ------------------------------------------------------------
-- 37. ANNOUNCEMENT POLICIES
-- ------------------------------------------------------------

drop policy if exists announcements_admin_all on public.announcements;
create policy announcements_admin_all
on public.announcements
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists announcements_coordinator_select
on public.announcements;
create policy announcements_coordinator_select
on public.announcements
for select
to public
using (
  public.is_coordinator()
  and (
    target_scope = 'ALL'
    or (target_scope = 'EVENT' and target_event_id is not null
        and public.is_event_coordinator(target_event_id))
  )
);

drop policy if exists announcements_coordinator_insert on public.announcements;
create policy announcements_coordinator_insert
on public.announcements
for insert
to public
with check (
  public.is_coordinator()
  and created_by = public.current_actor_id()
  and (target_scope = 'ALL' or (target_scope = 'EVENT' and target_event_id is not null and public.is_event_coordinator(target_event_id)))
);

-- ------------------------------------------------------------
-- 38. EMAIL LOG POLICIES
-- ------------------------------------------------------------

drop policy if exists email_logs_admin_all on public.email_logs;
create policy email_logs_admin_all
on public.email_logs
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists email_logs_coordinator_select on public.email_logs;
create policy email_logs_coordinator_select
on public.email_logs
for select
to authenticated
using (
  public.is_coordinator()
  and related_registration_id in (
    select er.registration_id
    from public.event_registrations er
    where public.is_event_coordinator(er.event_id)
  )
);

-- ------------------------------------------------------------
-- 39. STORAGE BUCKET
-- ------------------------------------------------------------
-- Creates a private bucket for payment screenshots.
-- If your Supabase project already has a bucket with this name,
-- this insert may need to be skipped/adjusted.

insert into storage.buckets (id, name, public)
values ('payment-screenshots', 'payment-screenshots', false)
on conflict (id) do nothing;

-- Storage policies are intentionally restrictive.
-- Actual participant upload should preferably happen through
-- a server-side Edge Function or carefully scoped signed upload.

drop policy if exists payment_screenshot_admin_select
on storage.objects;

create policy payment_screenshot_admin_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'payment-screenshots'
  and public.is_admin()
);

drop policy if exists payment_screenshot_coordinator_select
on storage.objects;

create policy payment_screenshot_coordinator_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'payment-screenshots'
  and public.is_coordinator()
);

-- ------------------------------------------------------------
-- 40. SAMPLE EVENTS
-- ------------------------------------------------------------
-- Uncomment and edit these examples after deciding your actual
-- symposium events.
--
-- insert into public.events
--   (code, name, description, day, event_type,
--    min_team_size, max_team_size, venue, registration_fee)
-- values
--   ('PP', 'Paper Presentation', 'Technical paper presentation',
--    'DAY_1', 'INDIVIDUAL', 1, 1, 'Seminar Hall', 0),
--   ('CC', 'Code Clash', 'Competitive coding event',
--    'DAY_1', 'INDIVIDUAL', 1, 1, 'Lab 1', 0),
--   ('HA', 'Hackathon', 'Team based hackathon',
--    'DAY_1', 'TEAM', 3, 3, 'Computer Lab', 0),
--   ('RR', 'Robo Race', 'Team robotics event',
--    'DAY_2', 'TEAM', 2, 2, 'Open Ground', 0),
--   ('QUIZ', 'General Quiz', 'Quiz competition',
--    'DAY_2', 'TEAM', 2, 3, 'Auditorium', 0);

-- ------------------------------------------------------------
-- 41. IMPORTANT IMPLEMENTATION NOTES
-- ------------------------------------------------------------
--
-- A) PUBLIC REGISTRATION
-- Do NOT give anonymous users broad INSERT/UPDATE/SELECT access
-- to all participant/payment/registration rows.
-- Use a Supabase Edge Function for public registration.
--
-- B) PAYMENT VERIFICATION
-- Never trust the browser to set VERIFIED.
-- Admin/coordinator action or a secure backend function must do it.
--
-- C) QR
-- QR should contain qr_token or a secure verification URL.
-- Never put name, phone, email, college or payment information
-- directly inside the QR.
--
-- D) COORDINATOR SCOPE
-- RLS policies restrict coordinator access by event assignment.
-- Frontend filtering alone is NOT sufficient.
--
-- E) TEAM CAPACITY
-- Team size must be enforced in a backend transaction/function
-- to avoid two users joining the last available slot at once.
--
-- F) OFFLINE
-- React PWA + IndexedDB can queue registrations/attendance.
-- Supabase remains the source of truth.
--
-- G) GOOGLE SHEETS BACKUP
-- Sync Supabase -> Edge Function/automation -> Google Sheets.
-- Do not force participants to fill a second Google Form.
--
-- H) AUTH
-- Create Admin/Coordinator accounts using Supabase Auth.
-- Then insert matching rows into public.profiles with role.
--
-- ============================================================
-- END OF SCHEMA
-- ============================================================


-- ============================================================
-- CYBER SENTINEL SECURITY HARDENING PATCH
-- Apply AFTER the main schema above.
-- ============================================================

-- 1. Secure payment verification: only Admin or assigned Coordinator.
create or replace function public.confirm_registration(
  p_registration_id uuid,
  p_verified_by uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day text;
  v_actor uuid := public.current_actor_id();
begin
  if v_actor is null then raise exception 'Authentication required'; end if;

  if not (
    public.is_admin()
    or exists (
      select 1 from public.event_registrations er
      where er.registration_id = p_registration_id
        and public.is_event_coordinator(er.event_id)
    )
  ) then
    raise exception 'Not authorized to verify this registration';
  end if;

  select selected_day into v_day
  from public.registrations
  where id = p_registration_id
  for update;

  if v_day is null then raise exception 'Registration not found'; end if;

  update public.registrations
  set status='CONFIRMED', confirmed_at=now(), updated_at=now()
  where id=p_registration_id;

  update public.payments
  set status='VERIFIED',
      verified_by=coalesce(p_verified_by,v_actor),
      verified_at=now(),
      updated_at=now()
  where registration_id=p_registration_id;

  insert into public.event_registrations(registration_id,event_id)
  select p_registration_id,e.id
  from public.events e
  where e.status='ACTIVE'
    and (
      v_day='BOTH'
      or (v_day='DAY_1' and e.day='DAY_1')
      or (v_day='DAY_2' and e.day='DAY_2')
    )
  on conflict(registration_id,event_id) do nothing;

  return true;
end;
$$;

revoke all on function public.confirm_registration(uuid,uuid) from public;
grant execute on function public.confirm_registration(uuid,uuid) to authenticated;

-- 2. Secure payment rejection.
create or replace function public.reject_payment(
  p_registration_id uuid,
  p_reason text,
  p_rejected_by uuid default null
)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare
  v_actor uuid := public.current_actor_id();
begin
  if v_actor is null then raise exception 'Authentication required'; end if;

  if not (
    public.is_admin()
    or exists (
      select 1 from public.event_registrations er
      where er.registration_id=p_registration_id
        and public.is_event_coordinator(er.event_id)
    )
  ) then
    raise exception 'Not authorized to reject this payment';
  end if;

  if nullif(trim(p_reason),'') is null then
    raise exception 'Rejection reason is required';
  end if;

  update public.payments
  set status='REJECTED',
      rejection_reason=trim(p_reason),
      verified_by=coalesce(p_rejected_by,v_actor),
      verified_at=now(),
      updated_at=now()
  where registration_id=p_registration_id;

  update public.registrations
  set status='PAYMENT_PENDING',updated_at=now()
  where id=p_registration_id;

  return true;
end;
$$;

revoke all on function public.reject_payment(uuid,text,uuid) from public;
grant execute on function public.reject_payment(uuid,text,uuid) to authenticated;


-- 3. Secure attendance scanner.
create or replace function public.record_attendance(
  p_qr_token uuid,
  p_event_id uuid,
  p_scanned_by uuid default null,
  p_device_id text default null,
  p_offline_recorded_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_registration_id uuid;
  v_participant_name text;
  v_registration_code text;
  v_event_day public.event_day;
  v_existing timestamptz;
  v_actor uuid := public.current_actor_id();
begin
  if v_actor is null then
    return jsonb_build_object('success',false,'code','AUTH_REQUIRED','message','Authentication required.');
  end if;

  if not (public.is_admin() or public.is_event_coordinator(p_event_id)) then
    return jsonb_build_object('success',false,'code','NOT_AUTHORIZED','message','You are not assigned to this event.');
  end if;

  select r.id,p.name,r.registration_code,e.day
  into v_registration_id,v_participant_name,v_registration_code,v_event_day
  from public.registrations r
  join public.participants p on p.id=r.participant_id
  cross join public.events e
  where r.qr_token=p_qr_token and e.id=p_event_id;

  if v_registration_id is null then
    return jsonb_build_object('success',false,'code','INVALID_QR','message','Invalid QR or participant is not registered for this event.');
  end if;

  if not public.registration_has_day_access(v_registration_id,v_event_day) then
    return jsonb_build_object('success',false,'code','WRONG_DAY','message','Participant is not registered for this event day.');
  end if;

  if not exists (
    select 1 from public.event_registrations er
    where er.registration_id=v_registration_id
      and er.event_id=p_event_id
      and er.active=true
  ) then
    return jsonb_build_object('success',false,'code','NOT_REGISTERED','message','Participant is not registered for this event.');
  end if;

  select scanned_at into v_existing
  from public.attendance
  where registration_id=v_registration_id
    and event_id=p_event_id
    and status='PRESENT';

  if v_existing is not null then
    return jsonb_build_object(
      'success',false,'code','ALREADY_PRESENT',
      'message','Participant already checked in.',
      'scanned_at',v_existing,
      'registration_code',v_registration_code,
      'participant_name',v_participant_name
    );
  end if;

  insert into public.attendance(
    registration_id,event_id,scanned_by,device_id,offline_recorded_at,status
  )
  values(
    v_registration_id,p_event_id,v_actor,p_device_id,
    p_offline_recorded_at,'PRESENT'
  )
  on conflict(registration_id,event_id)
  do update set
    status='PRESENT',
    scanned_by=excluded.scanned_by,
    scanned_at=now(),
    device_id=excluded.device_id,
    offline_recorded_at=excluded.offline_recorded_at;

  return jsonb_build_object(
    'success',true,'code','CHECKED_IN',
    'message','Attendance recorded successfully.',
    'registration_code',v_registration_code,
    'participant_name',v_participant_name,
    'scanned_at',now()
  );
end;
$$;

revoke all on function public.record_attendance(uuid,uuid,uuid,text,timestamptz) from public;
grant execute on function public.record_attendance(uuid,uuid,uuid,text,timestamptz) to authenticated;


-- 4. Team membership protection.
-- A participant may belong to only ONE non-disbanded team per event.
create or replace function public.prevent_duplicate_event_team_member()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_event_id uuid;
begin
  select event_id into v_event_id
  from public.event_teams
  where id=new.team_id;

  if exists (
    select 1
    from public.team_members tm
    join public.event_teams et on et.id=tm.team_id
    where tm.registration_id=new.registration_id
      and et.event_id=v_event_id
      and et.status <> 'DISBANDED'
      and tm.team_id <> new.team_id
  ) then
    raise exception 'Participant already belongs to a team for this event';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_duplicate_event_team_member
on public.team_members;

create trigger prevent_duplicate_event_team_member
before insert or update on public.team_members
for each row
execute function public.prevent_duplicate_event_team_member();


-- 5. Secure team invitation acceptance.
create or replace function public.accept_team_invitation(p_invite_token uuid)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare
  v_inv public.team_invitations%rowtype;
  v_event_id uuid;
  v_max integer;
  v_count integer;
begin
  if public.current_actor_id() is null then raise exception 'Authentication required'; end if;

  select * into v_inv
  from public.team_invitations
  where invite_token=p_invite_token
    and status='PENDING'
    and expires_at>now()
  for update;

  if v_inv.id is null then raise exception 'Invitation is invalid or expired'; end if;
  if v_inv.registration_id is null then raise exception 'Invitation is not linked to a participant'; end if;

  select et.event_id,et.max_members
  into v_event_id,v_max
  from public.event_teams et
  where et.id=v_inv.team_id
    and et.status in ('OPEN','FULL')
  for update;

  if v_event_id is null then raise exception 'Team is not available'; end if;

  if not public.can_join_team_event(v_inv.registration_id,v_event_id) then
    raise exception 'Participant is not eligible for this event';
  end if;

  if exists (
    select 1
    from public.team_members tm
    join public.event_teams et on et.id=tm.team_id
    where tm.registration_id=v_inv.registration_id
      and et.event_id=v_event_id
      and et.status<>'DISBANDED'
  ) then
    raise exception 'Participant already belongs to a team for this event';
  end if;

  select count(*) into v_count
  from public.team_members
  where team_id=v_inv.team_id;

  if v_count>=v_max then raise exception 'Team is already full'; end if;

  insert into public.team_members(team_id,registration_id,member_role)
  values(v_inv.team_id,v_inv.registration_id,'MEMBER');

  update public.team_invitations
  set status='ACCEPTED'
  where id=v_inv.id;

  update public.event_teams
  set status=case when v_count+1>=max_members then 'FULL' else 'OPEN' end,
      updated_at=now()
  where id=v_inv.team_id;

  return true;
end;
$$;

revoke all on function public.accept_team_invitation(uuid) from public;
grant execute on function public.accept_team_invitation(uuid) to authenticated;


-- 6. Secure team locking.
create or replace function public.lock_event_team(p_team_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare
  v_event_id uuid;
  v_count integer;
begin
  select event_id into v_event_id
  from public.event_teams
  where id=p_team_id
  for update;

  if v_event_id is null then raise exception 'Team not found'; end if;

  if not (public.is_admin() or public.is_event_coordinator(v_event_id)) then
    raise exception 'Not authorized for this team';
  end if;

  select count(*) into v_count
  from public.team_members
  where team_id=p_team_id;

  if v_count<2 then raise exception 'Team must have at least two members'; end if;

  update public.event_teams
  set status='LOCKED',updated_at=now()
  where id=p_team_id;

  return true;
end;
$$;

revoke all on function public.lock_event_team(uuid) from public;
grant execute on function public.lock_event_team(uuid) to authenticated;


-- 7. Team invitation RLS.
alter table public.team_invitations enable row level security;

drop policy if exists team_invitations_admin_all on public.team_invitations;
create policy team_invitations_admin_all
on public.team_invitations
for all to authenticated
using(public.is_admin())
with check(public.is_admin());

drop policy if exists team_invitations_coordinator_select on public.team_invitations;
create policy team_invitations_coordinator_select
on public.team_invitations
for select to authenticated
using(
  public.is_coordinator()
  and exists(
    select 1 from public.event_teams et
    where et.id=team_invitations.team_id
      and public.is_event_coordinator(et.event_id)
  )
);


-- 8. Tighten payment screenshot coordinator access.
drop policy if exists payment_screenshot_coordinator_select
on storage.objects;

create policy payment_screenshot_coordinator_select
on storage.objects
for select to authenticated
using(
  bucket_id='payment-screenshots'
  and public.is_coordinator()
  and exists(
    select 1
    from public.payments pay
    join public.event_registrations er
      on er.registration_id=pay.registration_id
    where pay.screenshot_path=storage.objects.name
      and public.is_event_coordinator(er.event_id)
  )
);

-- Recommended storage path:
-- payment-screenshots/<registration_uuid>/<filename>


-- 9. Keep SECURITY DEFINER helpers inaccessible to anonymous users.
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

revoke all on function public.is_coordinator() from public;
grant execute on function public.is_coordinator() to authenticated;

revoke all on function public.is_event_coordinator(uuid) from public;
grant execute on function public.is_event_coordinator(uuid) to authenticated;

revoke all on function public.registration_has_day_access(uuid,public.event_day) from public;
grant execute on function public.registration_has_day_access(uuid,public.event_day) to authenticated;

revoke all on function public.can_join_team_event(uuid,uuid) from public;
grant execute on function public.can_join_team_event(uuid,uuid) to authenticated;

-- ============================================================
-- END SECURITY HARDENING PATCH
-- ============================================================
