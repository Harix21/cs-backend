-- Food tokens, one-time admin scanning, and event certificate recipients.
-- Run after the existing attendance and special-event migrations.
-- Existing SQL files are unchanged.

create table if not exists public.food_tokens (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null unique references public.registrations(id) on delete cascade,
  scanned_by uuid references public.profiles(id) on delete set null,
  scanned_at timestamptz,
  status text not null default 'AVAILABLE' check (status in ('AVAILABLE', 'USED')),
  created_at timestamptz not null default now()
);

create index if not exists food_tokens_registration_idx on public.food_tokens(registration_id);
create index if not exists food_tokens_status_idx on public.food_tokens(status);

alter table public.food_tokens enable row level security;
drop policy if exists food_tokens_admin_all on public.food_tokens;
create policy food_tokens_admin_all on public.food_tokens
for all to public using (public.is_admin()) with check (public.is_admin());

-- Existing confirmed registrations receive exactly one token. New confirmations
-- should call this helper from the verification workflow.
insert into public.food_tokens(registration_id)
select id from public.registrations
where status = 'CONFIRMED'
on conflict (registration_id) do nothing;

create or replace function public.ensure_food_token(p_registration_id uuid)
returns public.food_tokens
language plpgsql security definer set search_path = public
as $$
declare result_row public.food_tokens;
begin
  insert into public.food_tokens(registration_id)
  values (p_registration_id)
  on conflict (registration_id) do update set registration_id = excluded.registration_id
  returning * into result_row;
  return result_row;
end;
$$;
grant execute on function public.ensure_food_token(uuid) to public;

create or replace function public.inspect_food_token(p_qr_token uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  actor uuid := public.current_actor_id();
  registration_row record;
  token_row public.food_tokens;
begin
  if actor is null or not public.is_admin() then
    return jsonb_build_object('success', false, 'code', 'NOT_AUTHORIZED', 'message', 'Admin authentication required.');
  end if;
  select r.id, r.registration_code, r.selected_day, r.status, p.name, p.email, p.phone, p.college
  into registration_row
  from public.registrations r join public.participants p on p.id = r.participant_id
  where r.qr_token = p_qr_token;
  if registration_row.id is null then
    return jsonb_build_object('success', false, 'code', 'INVALID_QR', 'message', 'Registration QR is not valid.');
  end if;
  select * into token_row from public.food_tokens where registration_id = registration_row.id;
  if token_row.id is null then
    insert into public.food_tokens(registration_id) values (registration_row.id) returning * into token_row;
  end if;
  return jsonb_build_object(
    'success', true,
    'code', case when token_row.status = 'USED' then 'ALREADY_USED' else 'READY' end,
    'message', case when token_row.status = 'USED' then 'Food token already used.' else 'Food token ready to issue.' end,
    'registration_code', registration_row.registration_code,
    'participant_name', registration_row.name,
    'email', registration_row.email,
    'phone', registration_row.phone,
    'college', registration_row.college,
    'selected_day', registration_row.selected_day,
    'registration_status', registration_row.status,
    'food_token_status', token_row.status,
    'scanned_at', token_row.scanned_at
  );
end;
$$;
grant execute on function public.inspect_food_token(uuid) to public;

create or replace function public.record_food_token(p_qr_token uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  actor uuid := public.current_actor_id();
  v_registration_id uuid;
  registration_code text;
  participant_name text;
  token_status text;
  used_at timestamptz;
begin
  if actor is null or not public.is_admin() then
    return jsonb_build_object('success', false, 'code', 'NOT_AUTHORIZED', 'message', 'Admin authentication required.');
  end if;
  select r.id, r.registration_code, p.name into v_registration_id, registration_code, participant_name
  from public.registrations r join public.participants p on p.id = r.participant_id
  where r.qr_token = p_qr_token and r.status = 'CONFIRMED'
  for update;
  if v_registration_id is null then
    return jsonb_build_object('success', false, 'code', 'INVALID_QR', 'message', 'QR is invalid or payment is not verified.');
  end if;
  insert into public.food_tokens(registration_id) values (v_registration_id)
  on conflict (registration_id) do nothing;
  select status, scanned_at into token_status, used_at from public.food_tokens where food_tokens.registration_id = v_registration_id for update;
  if token_status = 'USED' then
    return jsonb_build_object('success', false, 'code', 'ALREADY_USED', 'message', 'Food token already issued.', 'registration_code', registration_code, 'participant_name', participant_name, 'scanned_at', used_at);
  end if;
  update public.food_tokens
  set status = 'USED', scanned_by = actor, scanned_at = now()
  where food_tokens.registration_id = v_registration_id;
  return jsonb_build_object('success', true, 'code', 'ISSUED', 'message', 'Food token issued successfully.', 'registration_code', registration_code, 'participant_name', participant_name, 'scanned_at', now());
end;
$$;
grant execute on function public.record_food_token(uuid) to public;

create or replace function public.create_food_token_for_confirmed_registration()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.status = 'CONFIRMED' then
    insert into public.food_tokens(registration_id) values (new.id) on conflict (registration_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists create_food_token_for_confirmed_registration on public.registrations;
create trigger create_food_token_for_confirmed_registration
after insert or update of status on public.registrations
for each row execute function public.create_food_token_for_confirmed_registration();

-- Event attendance is the certificate source: only PRESENT records for the
-- selected event are eligible to receive that event's certificate email.
create or replace function public.event_certificate_recipients(p_event_id uuid)
returns table(registration_id uuid, registration_code text, participant_name text, email text, phone text, team_name text)
language sql stable security definer set search_path = public
as $$
  select distinct r.id, r.registration_code, p.name, p.email, p.phone,
    coalesce(et.team_name, '')
  from public.attendance a
  join public.registrations r on r.id = a.registration_id
  join public.participants p on p.id = r.participant_id
  left join public.team_members tm on tm.registration_id = r.id
  left join public.event_teams et on et.id = tm.team_id and et.event_id = p_event_id
  where a.event_id = p_event_id and a.status = 'PRESENT' and r.status = 'CONFIRMED';
$$;
grant execute on function public.event_certificate_recipients(uuid) to public;
