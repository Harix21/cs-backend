-- Coordinator event attendance repair.
-- Run after the existing coordinator migrations.
-- Uses the custom coordinator session header through current_actor_id().

create or replace function public.inspect_coordinator_event_attendance(
  p_qr_token uuid,
  p_event_id uuid
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  actor uuid := public.current_actor_id();
  v_registration_id uuid;
  v_code text;
  v_name text;
  v_email text;
  v_college text;
  v_department text;
  v_year text;
  v_existing timestamptz;
  v_event_name text;
  v_event_code text;
begin
  if actor is null or not public.is_event_coordinator(p_event_id) then
    return jsonb_build_object('success', false, 'code', 'NOT_AUTHORIZED', 'message', 'You are not assigned to this event.');
  end if;
  select r.id, r.registration_code, p.name, p.email, p.college, p.department, p.year
  into v_registration_id, v_code, v_name, v_email, v_college, v_department, v_year
  from public.registrations r join public.participants p on p.id = r.participant_id
  join public.event_registrations er on er.registration_id = r.id and er.event_id = p_event_id and er.active
  where r.qr_token = p_qr_token and r.status = 'CONFIRMED';
  select e.code, e.name into v_event_code, v_event_name from public.events e where e.id = p_event_id;
  if v_registration_id is null then
    return jsonb_build_object('success', false, 'code', 'NOT_REGISTERED', 'message', 'This confirmed participant is not registered for the assigned event.');
  end if;
  select scanned_at into v_existing from public.attendance where registration_id = v_registration_id and event_id = p_event_id and status = 'PRESENT';
  return jsonb_build_object(
    'success', true,
    'code', case when v_existing is null then 'READY' else 'ALREADY_PRESENT' end,
    'message', case when v_existing is null then 'Participant verified. Confirm attendance.' else 'Event attendance already recorded.' end,
    'qr_token', p_qr_token,
    'registration_code', v_code,
    'participant', jsonb_build_object('name', v_name, 'email', v_email, 'college', v_college, 'department', v_department, 'year', v_year),
    'event', jsonb_build_object('code', v_event_code, 'name', v_event_name),
    'attendance', case when v_existing is null then null else jsonb_build_object('scanned_at', v_existing) end
  );
end;
$$;

grant execute on function public.inspect_coordinator_event_attendance(uuid, uuid) to public;

create or replace function public.record_coordinator_event_attendance(
  p_qr_token uuid,
  p_event_id uuid
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  actor uuid := public.current_actor_id();
  v_registration_id uuid;
  v_code text;
  v_name text;
  v_existing timestamptz;
begin
  if actor is null or not public.is_event_coordinator(p_event_id) then
    return jsonb_build_object('success', false, 'code', 'NOT_AUTHORIZED', 'message', 'You are not assigned to this event.');
  end if;
  select r.id, r.registration_code, p.name into v_registration_id, v_code, v_name
  from public.registrations r join public.participants p on p.id = r.participant_id
  join public.event_registrations er on er.registration_id = r.id and er.event_id = p_event_id and er.active
  where r.qr_token = p_qr_token and r.status = 'CONFIRMED';
  if v_registration_id is null then
    return jsonb_build_object('success', false, 'code', 'NOT_REGISTERED', 'message', 'This confirmed participant is not registered for the assigned event.');
  end if;
  select scanned_at into v_existing from public.attendance where registration_id = v_registration_id and event_id = p_event_id and status = 'PRESENT';
  if v_existing is not null then
    return jsonb_build_object('success', false, 'code', 'ALREADY_PRESENT', 'message', 'Event attendance already recorded.', 'registration_code', v_code, 'participant_name', v_name, 'scanned_at', v_existing);
  end if;
  insert into public.attendance(registration_id, event_id, scanned_by, status)
  values (v_registration_id, p_event_id, actor, 'PRESENT')
  on conflict (registration_id, event_id) do update set status = 'PRESENT', scanned_by = actor, scanned_at = now();
  return jsonb_build_object('success', true, 'code', 'CHECKED_IN', 'message', 'Event attendance recorded successfully.', 'registration_code', v_code, 'participant_name', v_name, 'scanned_at', now());
end;
$$;

grant execute on function public.record_coordinator_event_attendance(uuid, uuid) to public;
