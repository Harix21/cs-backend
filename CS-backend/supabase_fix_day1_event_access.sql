-- Fix first payment verification for coordinator-scoped registrations.
-- Run this once in the Supabase SQL Editor after the main schema.

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
  if v_actor is null then
    raise exception 'Authentication required';
  end if;

  select selected_day
  into v_day
  from public.registrations
  where id = p_registration_id
  for update;

  if v_day is null then
    raise exception 'Registration not found';
  end if;

  -- On first verification event_registrations does not exist yet.
  if not (
    public.is_admin()
    or exists (
      select 1
      from public.event_coordinators ec
      join public.events e on e.id = ec.event_id
      where ec.coordinator_user_id = v_actor
        and e.status = 'ACTIVE'
        and (
          v_day = 'BOTH'
          or (v_day = 'DAY_1' and e.day = 'DAY_1')
          or (v_day = 'DAY_2' and e.day = 'DAY_2')
        )
    )
  ) then
    raise exception 'Not authorized to verify this registration';
  end if;

  update public.registrations
  set status = 'CONFIRMED',
      confirmed_at = now(),
      updated_at = now()
  where id = p_registration_id;

  update public.payments
  set status = 'VERIFIED',
      verified_by = coalesce(p_verified_by, v_actor),
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

revoke all on function public.confirm_registration(uuid, uuid) from public;
grant execute on function public.confirm_registration(uuid, uuid) to authenticated;

-- Make already-confirmed registrations visible for their active event days.
insert into public.event_registrations (registration_id, event_id)
select r.id, e.id
from public.registrations r
join public.events e on e.status = 'ACTIVE'
where r.status = 'CONFIRMED'
  and (
    r.selected_day = 'BOTH'
    or (r.selected_day = 'DAY_1' and e.day = 'DAY_1')
    or (r.selected_day = 'DAY_2' and e.day = 'DAY_2')
  )
on conflict (registration_id, event_id) do nothing;

-- Let coordinators see payment requests before verification when the
-- participant selected a day containing one of their assigned active events.
drop policy if exists payments_coordinator_select on public.payments;
create policy payments_coordinator_select
on public.payments
for select
to authenticated
using (
  public.is_coordinator()
  and exists (
    select 1
    from public.registrations r
    join public.events e
      on e.status = 'ACTIVE'
     and (
       r.selected_day = 'BOTH'
       or (r.selected_day = 'DAY_1' and e.day = 'DAY_1')
       or (r.selected_day = 'DAY_2' and e.day = 'DAY_2')
     )
    join public.event_coordinators ec
      on ec.event_id = e.id
    and ec.coordinator_user_id = public.current_actor_id()
    where r.id = payments.registration_id
  )
);

-- Allow the nested registration and participant details used by the payment
-- page under the same assigned-event/day scope before verification.
drop policy if exists registrations_coordinator_select on public.registrations;
create policy registrations_coordinator_select
on public.registrations
for select
to authenticated
using (
  public.is_coordinator()
  and exists (
    select 1
    from public.events e
    join public.event_coordinators ec
      on ec.event_id = e.id
    and ec.coordinator_user_id = public.current_actor_id()
    where e.status = 'ACTIVE'
      and (
        registrations.selected_day = 'BOTH'
        or (registrations.selected_day = 'DAY_1' and e.day = 'DAY_1')
        or (registrations.selected_day = 'DAY_2' and e.day = 'DAY_2')
      )
  )
);

drop policy if exists participants_coordinator_select on public.participants;
create policy participants_coordinator_select
on public.participants
for select
to authenticated
using (
  public.is_coordinator()
  and exists (
    select 1
    from public.registrations r
    join public.events e on e.status = 'ACTIVE'
    join public.event_coordinators ec
      on ec.event_id = e.id
    and ec.coordinator_user_id = public.current_actor_id()
    where r.participant_id = participants.id
      and (
        r.selected_day = 'BOTH'
        or (r.selected_day = 'DAY_1' and e.day = 'DAY_1')
        or (r.selected_day = 'DAY_2' and e.day = 'DAY_2')
      )
  )
);
