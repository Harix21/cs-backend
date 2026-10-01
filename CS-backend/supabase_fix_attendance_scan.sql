-- Run after supabase_schema_final.sql and register2/supabase/add_main_attendance.sql.
-- Provides authenticated scan inspection before an operator confirms attendance.

create or replace function public.inspect_attendance_scan(
  p_qr_token uuid,
  p_event_id uuid default null,
  p_day text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
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

  select r.id, p.name, p.email, p.phone, p.college, p.department, p.year,
         r.registration_code, r.selected_day, r.status::text
    into v_registration_id, v_name, v_email, v_phone, v_college, v_department,
         v_year, v_code, v_selected_day, v_status
  from public.registrations r
  join public.participants p on p.id = r.participant_id
  where r.qr_token = p_qr_token;

  if v_registration_id is null then
    return jsonb_build_object('success', false, 'code', 'INVALID_QR', 'message', 'This QR code is not valid.');
  end if;

  if p_event_id is not null then
    select e.name, e.code, e.day::text
      into v_event_name, v_event_code, v_event_day
    from public.events e where e.id = p_event_id;

    if not exists (select 1 from public.event_registrations er where er.registration_id = v_registration_id and er.event_id = p_event_id and er.active) then
      return jsonb_build_object('success', false, 'code', 'NOT_REGISTERED', 'message', 'Participant is not registered for this event.', 'registration_code', v_code, 'participant_name', v_name);
    end if;

    select a.scanned_at into v_existing from public.attendance a
    where a.registration_id = v_registration_id and a.event_id = p_event_id and a.status = 'PRESENT';
  else
    if p_day not in ('DAY_1', 'DAY_2') then
      return jsonb_build_object('success', false, 'code', 'INVALID_DAY', 'message', 'Select a valid attendance day.');
    end if;
    if not (v_selected_day = 'BOTH' or v_selected_day = p_day) then
      return jsonb_build_object('success', false, 'code', 'WRONG_DAY', 'message', 'Participant is not registered for this day.', 'registration_code', v_code, 'participant_name', v_name);
    end if;

    select a.scanned_at into v_existing from public.main_attendance a
    where a.registration_id = v_registration_id and a.day = p_day and a.status = 'PRESENT';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'code', e.code, 'name', e.name, 'day', e.day)), '[]'::jsonb)
    into v_events
  from public.event_registrations er join public.events e on e.id = er.event_id
  where er.registration_id = v_registration_id and er.active = true;

  return jsonb_build_object(
    'success', true,
    'code', case when v_existing is null then 'READY' else 'ALREADY_PRESENT' end,
    'message', case when v_existing is null then 'Participant verified. Confirm attendance.' else 'Participant already checked in.' end,
    'registration_id', v_registration_id,
    'qr_token', p_qr_token,
    'registration_code', v_code,
    'participant', jsonb_build_object('name', v_name, 'email', v_email, 'phone', v_phone, 'college', v_college, 'department', v_department, 'year', v_year),
    'registration', jsonb_build_object('status', v_status, 'selected_day', v_selected_day),
    'event', case when p_event_id is null then null else jsonb_build_object('id', p_event_id, 'code', v_event_code, 'name', v_event_name, 'day', v_event_day) end,
    'events', v_events,
    'attendance', case when v_existing is null then null else jsonb_build_object('scanned_at', v_existing) end
  );
end;
$$;

create or replace function public.inspect_registration_attendance(
  p_registration_code text,
  p_event_id uuid default null,
  p_day text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token uuid;
begin
  select qr_token into v_token from public.registrations where registration_code = upper(trim(p_registration_code));
  if v_token is null then
    return jsonb_build_object('success', false, 'code', 'INVALID_REGISTRATION', 'message', 'Registration ID was not found.');
  end if;
  return public.inspect_attendance_scan(v_token, p_event_id, p_day);
end;
$$;

revoke all on function public.inspect_attendance_scan(uuid, uuid, text) from public;
revoke all on function public.inspect_registration_attendance(text, uuid, text) from public;
grant execute on function public.inspect_attendance_scan(uuid, uuid, text) to authenticated;
grant execute on function public.inspect_registration_attendance(text, uuid, text) to authenticated;
