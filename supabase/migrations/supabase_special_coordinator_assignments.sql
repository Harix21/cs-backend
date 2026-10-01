-- Special-event coordinator assignment and access migration.
-- Run after supabase_special_events.sql. Existing SQL files are unchanged.

create table if not exists public.special_event_coordinators (
  id uuid primary key default gen_random_uuid(),
  special_event_id uuid not null references public.special_events(id) on delete cascade,
  coordinator_user_id uuid not null references public.profiles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  unique (special_event_id, coordinator_user_id)
);

create index if not exists special_event_coordinators_event_idx
  on public.special_event_coordinators(special_event_id);
create index if not exists special_event_coordinators_coordinator_idx
  on public.special_event_coordinators(coordinator_user_id);

alter table public.announcements add column if not exists target_special_event_id uuid references public.special_events(id) on delete set null;
alter table public.announcements drop constraint if exists announcements_target_scope_check;
alter table public.announcements add constraint announcements_target_scope_check
  check (target_scope in ('ALL', 'DAY', 'EVENT', 'SPECIAL', 'INDIVIDUAL'));

alter table public.special_event_coordinators enable row level security;
drop policy if exists special_event_coordinators_admin_all on public.special_event_coordinators;
create policy special_event_coordinators_admin_all on public.special_event_coordinators
for all to public using (public.is_admin()) with check (public.is_admin());
drop policy if exists special_event_coordinators_self_select on public.special_event_coordinators;
create policy special_event_coordinators_self_select on public.special_event_coordinators
for select to public using (coordinator_user_id = public.current_actor_id());

create or replace function public.is_special_event_coordinator(p_special_event_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.special_event_coordinators sec
    join public.profiles p on p.id = sec.coordinator_user_id
    where sec.special_event_id = p_special_event_id
      and sec.coordinator_user_id = public.current_actor_id()
      and p.role = 'COORDINATOR' and p.active
  );
$$;
grant execute on function public.is_special_event_coordinator(uuid) to public;

create or replace function public.special_registration_ids_for_actor()
returns setof uuid
language sql stable security definer set search_path = public
as $$
  select distinct ser.registration_id
  from public.special_event_registrations ser
  join public.special_event_coordinators sec on sec.special_event_id = ser.special_event_id
  join public.profiles p on p.id = sec.coordinator_user_id
  where sec.coordinator_user_id = public.current_actor_id()
    and p.role = 'COORDINATOR' and p.active;
$$;
grant execute on function public.special_registration_ids_for_actor() to public;

create or replace function public.special_participant_ids_for_actor()
returns setof uuid
language sql stable security definer set search_path = public
as $$
  select distinct r.participant_id
  from public.registrations r
  where r.id in (select public.special_registration_ids_for_actor());
$$;
grant execute on function public.special_participant_ids_for_actor() to public;

-- Coordinators assigned to a special event can see only its participants/payments.
drop policy if exists payments_special_coordinator_select on public.payments;
create policy payments_special_coordinator_select on public.payments
for select to public using (public.is_admin() or registration_id in (select public.special_registration_ids_for_actor()));

drop policy if exists registrations_special_coordinator_select on public.registrations;
create policy registrations_special_coordinator_select on public.registrations
for select to public using (public.is_admin() or id in (select public.special_registration_ids_for_actor()));

drop policy if exists participants_special_coordinator_select on public.participants;
create policy participants_special_coordinator_select on public.participants
for select to public using (public.is_admin() or id in (select public.special_participant_ids_for_actor()));

drop policy if exists special_event_registrations_special_coordinator_select on public.special_event_registrations;
create policy special_event_registrations_special_coordinator_select on public.special_event_registrations
for select to public using (public.is_admin() or public.is_special_event_coordinator(special_event_id));

drop policy if exists special_events_special_coordinator_select on public.special_events;
create policy special_events_special_coordinator_select on public.special_events
for select to public using (public.is_admin() or public.is_special_event_coordinator(id) or status = 'ACTIVE');

drop policy if exists announcements_special_coordinator_select on public.announcements;
create policy announcements_special_coordinator_select on public.announcements
for select to public using (
  public.is_admin() or (
    target_scope = 'SPECIAL' and target_special_event_id is not null
    and public.is_special_event_coordinator(target_special_event_id)
  )
);

drop policy if exists announcements_special_coordinator_insert on public.announcements;
create policy announcements_special_coordinator_insert on public.announcements
for insert to public with check (
  public.is_special_event_coordinator(target_special_event_id)
  and target_scope = 'SPECIAL'
  and created_by = public.current_actor_id()
);

-- Extend payment verification authorization to special-event coordinators.
create or replace function public.confirm_registration(
  p_registration_id uuid,
  p_verified_by uuid default null
) returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_day text;
  v_actor uuid := public.current_actor_id();
  v_special_allowed boolean;
begin
  if v_actor is null then raise exception 'Authentication required'; end if;
  select selected_day into v_day from public.registrations where id = p_registration_id for update;
  if v_day is null then raise exception 'Registration not found'; end if;
  select exists (
    select 1 from public.special_event_registrations ser
    where ser.registration_id = p_registration_id
      and public.is_special_event_coordinator(ser.special_event_id)
  ) into v_special_allowed;
  if not (
    public.is_admin() or v_special_allowed or (
      v_day <> 'SPECIAL' and exists (
        select 1 from public.event_coordinators ec
        join public.events e on e.id = ec.event_id
        where ec.coordinator_user_id = v_actor and e.status = 'ACTIVE'
          and (v_day = 'BOTH' or (v_day = 'DAY_1' and e.day = 'DAY_1') or (v_day = 'DAY_2' and e.day = 'DAY_2'))
      )
    )
  ) then raise exception 'Not authorized to verify this registration'; end if;

  update public.registrations set status = 'CONFIRMED', confirmed_at = now(), updated_at = now() where id = p_registration_id;
  update public.payments set status = 'VERIFIED', verified_by = coalesce(p_verified_by, v_actor), verified_at = now(), updated_at = now() where registration_id = p_registration_id;
  if v_day <> 'SPECIAL' then
    insert into public.event_registrations(registration_id, event_id)
    select p_registration_id, e.id from public.events e
    where e.status = 'ACTIVE' and (v_day = 'BOTH' or (v_day = 'DAY_1' and e.day = 'DAY_1') or (v_day = 'DAY_2' and e.day = 'DAY_2'))
    on conflict(registration_id, event_id) do nothing;
  end if;
  return true;
end;
$$;
grant execute on function public.confirm_registration(uuid, uuid) to public;
