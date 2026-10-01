-- Special-event registration migration.
-- Run after the existing schema and supabase_feature_updates.sql.
-- Existing SQL files are unchanged.

create table if not exists public.special_events (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  fee numeric(10,2) not null check (fee >= 0),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE', 'COMPLETED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.special_event_registrations (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  special_event_id uuid not null references public.special_events(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (registration_id, special_event_id)
);

create index if not exists special_event_registrations_registration_idx
  on public.special_event_registrations(registration_id);
create index if not exists special_event_registrations_event_idx
  on public.special_event_registrations(special_event_id);

alter table public.registrations drop constraint if exists registrations_selected_day_check;
alter table public.registrations add constraint registrations_selected_day_check
  check (selected_day in ('DAY_1', 'DAY_2', 'BOTH', 'SPECIAL'));

alter table public.special_events enable row level security;
alter table public.special_event_registrations enable row level security;

drop policy if exists special_events_public_select on public.special_events;
create policy special_events_public_select on public.special_events
for select to anon, authenticated using (status = 'ACTIVE' or public.is_admin());

drop policy if exists special_events_admin_all on public.special_events;
create policy special_events_admin_all on public.special_events
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists special_event_registrations_admin_all on public.special_event_registrations;
create policy special_event_registrations_admin_all on public.special_event_registrations
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists special_event_registrations_staff_select on public.special_event_registrations;
create policy special_event_registrations_staff_select on public.special_event_registrations
for select to authenticated using (
  public.is_admin() or exists (
    select 1 from public.registrations r
    where r.id = special_event_registrations.registration_id
      and public.is_coordinator()
  )
);

create or replace function public.get_special_events()
returns setof public.special_events
language sql stable security definer set search_path = public
as $$
  select * from public.special_events where status = 'ACTIVE' order by code;
$$;
grant execute on function public.get_special_events() to anon, authenticated;

create or replace function public.create_special_event(
  p_code text, p_name text, p_fee numeric, p_description text default null
) returns public.special_events
language plpgsql security definer set search_path = public
as $$
declare result_row public.special_events;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if nullif(trim(p_code), '') is null or nullif(trim(p_name), '') is null or p_fee < 0 then
    raise exception 'Code, name, and a non-negative fee are required';
  end if;
  insert into public.special_events(code, name, fee, description)
  values (upper(trim(p_code)), trim(p_name), p_fee, nullif(trim(p_description), ''))
  returning * into result_row;
  return result_row;
end;
$$;
grant execute on function public.create_special_event(text, text, numeric, text) to authenticated;

create or replace function public.update_special_event_fee(p_special_event_id uuid, p_fee numeric)
returns public.special_events
language plpgsql security definer set search_path = public
as $$
declare result_row public.special_events;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if p_fee < 0 then raise exception 'Fee cannot be negative'; end if;
  update public.special_events set fee = p_fee, updated_at = now()
  where id = p_special_event_id returning * into result_row;
  if result_row.id is null then raise exception 'Special event not found'; end if;
  return result_row;
end;
$$;
grant execute on function public.update_special_event_fee(uuid, numeric) to authenticated;

-- Replace the day duplicate trigger so SPECIAL registrations can coexist,
-- while the same special event remains unique through the join-table constraint.
create or replace function public.prevent_duplicate_registration_day()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.selected_day <> 'SPECIAL' and exists (
    select 1 from public.registrations existing
    where existing.participant_id = new.participant_id
      and existing.id <> new.id
      and existing.selected_day <> 'SPECIAL'
      and (existing.selected_day = 'BOTH' or new.selected_day = 'BOTH' or existing.selected_day = new.selected_day)
      and existing.status <> 'CANCELLED'
  ) then
    raise exception 'This participant is already registered for the selected day';
  end if;
  return new;
end;
$$;

-- Grant the portal's service-role-backed registration flow access to the join data.
grant select, insert on public.special_event_registrations to service_role;

create or replace function public.prevent_duplicate_special_event_registration()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if exists (
    select 1
    from public.special_event_registrations existing
    join public.registrations existing_registration on existing_registration.id = existing.registration_id
    join public.registrations new_registration on new_registration.id = new.registration_id
    where existing.special_event_id = new.special_event_id
      and existing.registration_id <> new.registration_id
      and existing_registration.participant_id = new_registration.participant_id
      and existing_registration.status <> 'CANCELLED'
  ) then
    raise exception 'This participant is already registered for the selected special event';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_duplicate_special_event_registration on public.special_event_registrations;
create trigger prevent_duplicate_special_event_registration
before insert or update on public.special_event_registrations
for each row execute function public.prevent_duplicate_special_event_registration();

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
  select selected_day into v_day from public.registrations where id = p_registration_id for update;
  if v_day is null then raise exception 'Registration not found'; end if;

  if not (
    public.is_admin()
    or (
      v_day <> 'SPECIAL'
      and exists (
        select 1 from public.event_coordinators ec
        join public.events e on e.id = ec.event_id
        where ec.coordinator_user_id = v_actor and e.status = 'ACTIVE'
          and (v_day = 'BOTH' or (v_day = 'DAY_1' and e.day = 'DAY_1') or (v_day = 'DAY_2' and e.day = 'DAY_2'))
      )
    )
  ) then raise exception 'Not authorized to verify this registration'; end if;

  update public.registrations
  set status = 'CONFIRMED', confirmed_at = now(), updated_at = now()
  where id = p_registration_id;
  update public.payments
  set status = 'VERIFIED', verified_by = coalesce(p_verified_by, v_actor), verified_at = now(), updated_at = now()
  where registration_id = p_registration_id;

  if v_day <> 'SPECIAL' then
    insert into public.event_registrations(registration_id, event_id)
    select p_registration_id, e.id from public.events e
    where e.status = 'ACTIVE'
      and (v_day = 'BOTH' or (v_day = 'DAY_1' and e.day = 'DAY_1') or (v_day = 'DAY_2' and e.day = 'DAY_2'))
    on conflict(registration_id, event_id) do nothing;
  end if;
  return true;
end;
$$;
grant execute on function public.confirm_registration(uuid, uuid) to authenticated;
