-- Cyber Sentinel secondary database migrations
-- Run this file AFTER the primary database schema has been installed.
-- This file combines all secondary SQL files and does not recreate the main schema.

-- ============================================================================
-- 1. Registration duplicate cleanup and unique indexes
-- Source: supabase_fix_registration_duplicates.sql
-- ============================================================================

begin;

do $$
declare
  duplicate_row record;
  keeper_id uuid;
begin
  for duplicate_row in
    select lower(trim(email)) as identity_value
    from public.participants
    where nullif(trim(email), '') is not null
    group by lower(trim(email))
    having count(*) > 1
  loop
    select p.id into keeper_id
    from public.participants p
    where lower(trim(p.email)) = duplicate_row.identity_value
    order by p.created_at nulls first, p.id
    limit 1;

    update public.registrations
    set participant_id = keeper_id
    where participant_id in (
      select p.id from public.participants p
      where lower(trim(p.email)) = duplicate_row.identity_value
        and p.id <> keeper_id
    );

    delete from public.participants p
    where lower(trim(p.email)) = duplicate_row.identity_value
      and p.id <> keeper_id;
  end loop;

  for duplicate_row in
    select trim(phone) as identity_value
    from public.participants
    where nullif(trim(phone), '') is not null
    group by trim(phone)
    having count(*) > 1
  loop
    select p.id into keeper_id
    from public.participants p
    where trim(p.phone) = duplicate_row.identity_value
    order by p.created_at nulls first, p.id
    limit 1;

    update public.registrations
    set participant_id = keeper_id
    where participant_id in (
      select p.id from public.participants p
      where trim(p.phone) = duplicate_row.identity_value
        and p.id <> keeper_id
    );

    delete from public.participants p
    where trim(p.phone) = duplicate_row.identity_value
      and p.id <> keeper_id;
  end loop;

  delete from public.payments duplicate_payment
  using public.payments keeper_payment
  where upper(trim(duplicate_payment.utr)) = upper(trim(keeper_payment.utr))
    and duplicate_payment.id <> keeper_payment.id
    and (
      duplicate_payment.submitted_at > keeper_payment.submitted_at
      or (
        duplicate_payment.submitted_at = keeper_payment.submitted_at
        and duplicate_payment.id > keeper_payment.id
      )
    );
end;
$$;

create unique index if not exists participants_email_unique_idx
  on public.participants (lower(trim(email)));

create unique index if not exists participants_phone_unique_idx
  on public.participants (trim(phone));

create unique index if not exists payments_utr_unique_idx
  on public.payments (upper(trim(utr)));

commit;

-- ============================================================================
-- 2. Admin main attendance
-- Source: register2/supabase/add_main_attendance.sql
-- ============================================================================

create table if not exists public.main_attendance (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  day text not null check (day in ('DAY_1','DAY_2')),
  scanned_by uuid not null references public.profiles(id) on delete restrict,
  scanned_at timestamptz not null default now(),
  status public.attendance_status not null default 'PRESENT',
  unique (registration_id, day)
);

create index if not exists main_attendance_registration_idx on public.main_attendance(registration_id);
create index if not exists main_attendance_day_idx on public.main_attendance(day);

alter table public.main_attendance enable row level security;

drop policy if exists main_attendance_admin_all on public.main_attendance;
create policy main_attendance_admin_all on public.main_attendance
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.record_main_attendance(
  p_qr_token uuid,
  p_day text
) returns jsonb
language plpgsql security definer set search_path=public
as $$
declare
  v_actor uuid := public.current_actor_id();
  v_registration_id uuid;
  v_name text;
  v_code text;
  v_selected_day text;
  v_existing timestamptz;
begin
  if v_actor is null or not public.is_admin() then
    return jsonb_build_object('success',false,'code','NOT_AUTHORIZED','message','Admin authentication required.');
  end if;
  if p_day not in ('DAY_1','DAY_2') then
    return jsonb_build_object('success',false,'code','INVALID_DAY','message','Invalid attendance day.');
  end if;

  select r.id,p.name,r.registration_code,r.selected_day
    into v_registration_id,v_name,v_code,v_selected_day
  from public.registrations r
  join public.participants p on p.id=r.participant_id
  where r.qr_token=p_qr_token and r.status='CONFIRMED';

  if v_registration_id is null then
    return jsonb_build_object('success',false,'code','INVALID_QR','message','Invalid QR or registration is not confirmed.');
  end if;
  if not (v_selected_day='BOTH' or (v_selected_day='DAY_1' and p_day='DAY_1') or (v_selected_day='DAY_2' and p_day='DAY_2')) then
    return jsonb_build_object('success',false,'code','WRONG_DAY','message','Participant is not registered for this day.');
  end if;

  select scanned_at into v_existing
  from public.main_attendance
  where registration_id=v_registration_id and day=p_day and status='PRESENT';

  if v_existing is not null then
    return jsonb_build_object('success',false,'code','ALREADY_PRESENT','message','Main attendance already recorded.','registration_code',v_code,'participant_name',v_name,'scanned_at',v_existing);
  end if;

  insert into public.main_attendance(registration_id,day,scanned_by,status)
  values(v_registration_id,p_day,v_actor,'PRESENT')
  on conflict(registration_id,day) do update
    set status='PRESENT',scanned_by=v_actor,scanned_at=now();

  return jsonb_build_object('success',true,'code','CHECKED_IN','message','Main attendance recorded successfully.','registration_code',v_code,'participant_name',v_name,'day',p_day,'scanned_at',now());
end;
$$;

revoke all on function public.record_main_attendance(uuid,text) from public;
grant execute on function public.record_main_attendance(uuid,text) to authenticated;

-- ============================================================================
-- 3. Attendance QR inspection
-- Source: supabase_fix_attendance_scan.sql
-- ============================================================================

create or replace function public.inspect_attendance_scan(
  p_qr_token uuid,
  p_event_id uuid default null,
  p_day text default null
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_actor uuid := public.current_actor_id();
  v_registration_id uuid;
  v_name text;
  v_email text;
  v_phone text;
  v_college text;
  v_department text;
  v_year text;
  v_code text;
  v_selected_day text;
  v_status text;
  v_existing timestamptz;
  v_event_name text;
  v_event_code text;
  v_event_day text;
  v_events jsonb;
begin
  if v_actor is null then
    return jsonb_build_object('success', false, 'code', 'AUTH_REQUIRED', 'message', 'Authentication required.');
  end if;
  if p_event_id is not null and not (public.is_admin() or public.is_event_coordinator(p_event_id)) then
    return jsonb_build_object('success', false, 'code', 'NOT_AUTHORIZED', 'message', 'You are not assigned to this event.');
  end if;
  if p_event_id is null and not public.is_admin() then
    return jsonb_build_object('success', false, 'code', 'NOT_AUTHORIZED', 'message', 'Admin authentication required.');
  end if;

  select r.id,p.name,p.email,p.phone,p.college,p.department,p.year,r.registration_code,r.selected_day,r.status::text
    into v_registration_id,v_name,v_email,v_phone,v_college,v_department,v_year,v_code,v_selected_day,v_status
  from public.registrations r join public.participants p on p.id=r.participant_id
  where r.qr_token=p_qr_token;

  if v_registration_id is null then
    return jsonb_build_object('success', false, 'code', 'INVALID_QR', 'message', 'This QR code is not valid.');
  end if;

  if p_event_id is not null then
    select e.name,e.code,e.day::text into v_event_name,v_event_code,v_event_day
    from public.events e where e.id=p_event_id;
    if not exists (select 1 from public.event_registrations er where er.registration_id=v_registration_id and er.event_id=p_event_id and er.active) then
      return jsonb_build_object('success',false,'code','NOT_REGISTERED','message','Participant is not registered for this event.','registration_code',v_code,'participant_name',v_name);
    end if;
    select a.scanned_at into v_existing from public.attendance a
    where a.registration_id=v_registration_id and a.event_id=p_event_id and a.status='PRESENT';
  else
    if p_day not in ('DAY_1','DAY_2') then
      return jsonb_build_object('success',false,'code','INVALID_DAY','message','Select a valid attendance day.');
    end if;
    if not (v_selected_day='BOTH' or v_selected_day=p_day) then
      return jsonb_build_object('success',false,'code','WRONG_DAY','message','Participant is not registered for this day.','registration_code',v_code,'participant_name',v_name);
    end if;
    select a.scanned_at into v_existing from public.main_attendance a
    where a.registration_id=v_registration_id and a.day=p_day and a.status='PRESENT';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'code',e.code,'name',e.name,'day',e.day)),'[]'::jsonb)
    into v_events
  from public.event_registrations er join public.events e on e.id=er.event_id
  where er.registration_id=v_registration_id and er.active=true;

  return jsonb_build_object('success',true,'code',case when v_existing is null then 'READY' else 'ALREADY_PRESENT' end,'message',case when v_existing is null then 'Participant verified. Confirm attendance.' else 'Participant already checked in.' end,'registration_id',v_registration_id,'qr_token',p_qr_token,'registration_code',v_code,'participant',jsonb_build_object('name',v_name,'email',v_email,'phone',v_phone,'college',v_college,'department',v_department,'year',v_year),'registration',jsonb_build_object('status',v_status,'selected_day',v_selected_day),'event',case when p_event_id is null then null else jsonb_build_object('id',p_event_id,'code',v_event_code,'name',v_event_name,'day',v_event_day) end,'events',v_events,'attendance',case when v_existing is null then null else jsonb_build_object('scanned_at',v_existing) end);
end;
$$;

create or replace function public.inspect_registration_attendance(
  p_registration_code text,
  p_event_id uuid default null,
  p_day text default null
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v_token uuid;
begin
  select qr_token into v_token from public.registrations where registration_code=upper(trim(p_registration_code));
  if v_token is null then return jsonb_build_object('success',false,'code','INVALID_REGISTRATION','message','Registration ID was not found.'); end if;
  return public.inspect_attendance_scan(v_token,p_event_id,p_day);
end;
$$;

revoke all on function public.inspect_attendance_scan(uuid,uuid,text) from public;
revoke all on function public.inspect_registration_attendance(text,uuid,text) from public;
grant execute on function public.inspect_attendance_scan(uuid,uuid,text) to authenticated;
grant execute on function public.inspect_registration_attendance(text,uuid,text) to authenticated;

-- ============================================================================
-- 4. Coordinator day/event access and payment verification
-- Source: supabase_fix_day1_event_access.sql
-- ============================================================================

create or replace function public.confirm_registration(
  p_registration_id uuid,
  p_verified_by uuid default null
) returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_day text;
  v_actor uuid := public.current_actor_id();
begin
  if v_actor is null then raise exception 'Authentication required'; end if;
  select selected_day into v_day from public.registrations where id=p_registration_id for update;
  if v_day is null then raise exception 'Registration not found'; end if;

  if not (public.is_admin() or exists (select 1 from public.event_coordinators ec join public.events e on e.id=ec.event_id where ec.coordinator_user_id=v_actor and e.status='ACTIVE' and (v_day='BOTH' or (v_day='DAY_1' and e.day='DAY_1') or (v_day='DAY_2' and e.day='DAY_2')))) then
    raise exception 'Not authorized to verify this registration';
  end if;

  update public.registrations set status='CONFIRMED',confirmed_at=now(),updated_at=now() where id=p_registration_id;
  update public.payments set status='VERIFIED',verified_by=coalesce(p_verified_by,v_actor),verified_at=now(),updated_at=now() where registration_id=p_registration_id;
  insert into public.event_registrations(registration_id,event_id)
  select p_registration_id,e.id from public.events e where e.status='ACTIVE' and (v_day='BOTH' or (v_day='DAY_1' and e.day='DAY_1') or (v_day='DAY_2' and e.day='DAY_2'))
  on conflict(registration_id,event_id) do nothing;
  return true;
end;
$$;

revoke all on function public.confirm_registration(uuid,uuid) from public;
grant execute on function public.confirm_registration(uuid,uuid) to authenticated;

insert into public.event_registrations(registration_id,event_id)
select r.id,e.id from public.registrations r join public.events e on e.status='ACTIVE'
where r.status='CONFIRMED' and (r.selected_day='BOTH' or (r.selected_day='DAY_1' and e.day='DAY_1') or (r.selected_day='DAY_2' and e.day='DAY_2'))
on conflict(registration_id,event_id) do nothing;

drop policy if exists payments_coordinator_select on public.payments;
create policy payments_coordinator_select on public.payments for select to authenticated using (
  public.is_coordinator() and exists (select 1 from public.registrations r join public.events e on e.status='ACTIVE' and (r.selected_day='BOTH' or (r.selected_day='DAY_1' and e.day='DAY_1') or (r.selected_day='DAY_2' and e.day='DAY_2')) join public.event_coordinators ec on ec.event_id=e.id and ec.coordinator_user_id=public.current_actor_id() where r.id=payments.registration_id)
);

drop policy if exists registrations_coordinator_select on public.registrations;
create policy registrations_coordinator_select on public.registrations for select to authenticated using (
  public.is_coordinator() and exists (select 1 from public.events e join public.event_coordinators ec on ec.event_id=e.id and ec.coordinator_user_id=public.current_actor_id() where e.status='ACTIVE' and (registrations.selected_day='BOTH' or (registrations.selected_day='DAY_1' and e.day='DAY_1') or (registrations.selected_day='DAY_2' and e.day='DAY_2')))
);

drop policy if exists participants_coordinator_select on public.participants;
create policy participants_coordinator_select on public.participants for select to authenticated using (
  public.is_coordinator() and exists (select 1 from public.registrations r join public.events e on e.status='ACTIVE' join public.event_coordinators ec on ec.event_id=e.id and ec.coordinator_user_id=public.current_actor_id() where r.participant_id=participants.id and (r.selected_day='BOTH' or (r.selected_day='DAY_1' and e.day='DAY_1') or (r.selected_day='DAY_2' and e.day='DAY_2')))
);

-- ============================================================================
-- 5. Team package support
-- Replaces the previous single-event team flow.
-- ============================================================================

create index if not exists event_teams_name_idx on public.event_teams(lower(team_name));

create table if not exists public.event_team_packages (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.event_teams(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  unique (team_id, event_id)
);

create index if not exists event_team_packages_team_idx on public.event_team_packages(team_id);
create index if not exists event_team_packages_event_idx on public.event_team_packages(event_id);

alter table public.event_team_packages enable row level security;
drop policy if exists event_team_packages_admin_all on public.event_team_packages;
create policy event_team_packages_admin_all on public.event_team_packages
for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists event_team_packages_coordinator_select on public.event_team_packages;
create policy event_team_packages_coordinator_select on public.event_team_packages
for select to authenticated using (public.is_event_coordinator(event_id));
