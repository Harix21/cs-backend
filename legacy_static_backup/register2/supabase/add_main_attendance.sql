
-- CYBER SENTINEL ADD-ON FOR REGISTRATION + CHECKING + ADMIN MAIN ATTENDANCE
-- Run AFTER supabase_schema_final.sql.
-- This does not recreate the existing tables.

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

-- Secure RPC for ADMIN main attendance.
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
  where r.qr_token=p_qr_token
    and r.status='CONFIRMED';

  if v_registration_id is null then
    return jsonb_build_object('success',false,'code','INVALID_QR','message','Invalid QR or registration is not confirmed.');
  end if;

  if not (
    v_selected_day='BOTH'
    or (v_selected_day='DAY_1' and p_day='DAY_1')
    or (v_selected_day='DAY_2' and p_day='DAY_2')
  ) then
    return jsonb_build_object('success',false,'code','WRONG_DAY','message','Participant is not registered for this day.');
  end if;

  select scanned_at into v_existing
  from public.main_attendance
  where registration_id=v_registration_id and day=p_day and status='PRESENT';

  if v_existing is not null then
    return jsonb_build_object('success',false,'code','ALREADY_PRESENT','message','Main attendance already recorded.',
      'registration_code',v_code,'participant_name',v_name,'scanned_at',v_existing);
  end if;

  insert into public.main_attendance(registration_id,day,scanned_by,status)
  values(v_registration_id,p_day,v_actor,'PRESENT')
  on conflict(registration_id,day) do update
    set status='PRESENT',scanned_by=v_actor,scanned_at=now();

  return jsonb_build_object('success',true,'code','CHECKED_IN','message','Main attendance recorded successfully.',
    'registration_code',v_code,'participant_name',v_name,'day',p_day,'scanned_at',now());
end;
$$;

revoke all on function public.record_main_attendance(uuid,text) from public;
grant execute on function public.record_main_attendance(uuid,text) to authenticated;

-- IMPORTANT:
-- The existing confirm_registration() hardening authorizes coordinators using
-- event_registrations. Before first payment verification those rows may not exist.
-- Replace that authorization with a selected-day/event-scope check in production.
