-- Repair migration for infinite-recursion errors caused by special coordinator RLS.
-- Run this after supabase_special_coordinator_assignments.sql.

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

drop policy if exists payments_special_coordinator_select on public.payments;
create policy payments_special_coordinator_select on public.payments
for select to public using (public.is_admin() or registration_id in (select public.special_registration_ids_for_actor()));

drop policy if exists registrations_special_coordinator_select on public.registrations;
create policy registrations_special_coordinator_select on public.registrations
for select to public using (public.is_admin() or id in (select public.special_registration_ids_for_actor()));

drop policy if exists participants_special_coordinator_select on public.participants;
create policy participants_special_coordinator_select on public.participants
for select to public using (public.is_admin() or id in (select public.special_participant_ids_for_actor()));
