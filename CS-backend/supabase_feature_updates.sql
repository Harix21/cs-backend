-- New migration for day fees, readable team summaries, and strict team membership.
-- Run after the existing schema and migrations. Existing SQL files are unchanged.

create table if not exists public.registration_fees (
  day text primary key check (day in ('DAY_1', 'DAY_2')),
  amount numeric(10,2) not null check (amount >= 0),
  updated_at timestamptz not null default now()
);

insert into public.registration_fees(day, amount)
values ('DAY_1', 100), ('DAY_2', 100)
on conflict (day) do nothing;

alter table public.registration_fees enable row level security;
drop policy if exists registration_fees_public_select on public.registration_fees;
create policy registration_fees_public_select on public.registration_fees
for select to anon, authenticated using (true);

drop function if exists public.get_registration_fees();
create function public.get_registration_fees()
returns jsonb language sql stable security definer set search_path = public
as $$
  select jsonb_object_agg(day, amount order by day) from public.registration_fees;
$$;
grant execute on function public.get_registration_fees() to anon, authenticated;

drop function if exists public.update_registration_fee(text, numeric);
create function public.update_registration_fee(p_day text, p_amount numeric)
returns public.registration_fees language plpgsql security definer set search_path = public
as $$
declare result_row public.registration_fees;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if p_day not in ('DAY_1', 'DAY_2') or p_amount < 0 then raise exception 'A valid day and non-negative fee are required'; end if;
  insert into public.registration_fees(day, amount, updated_at)
  values (p_day, p_amount, now())
  on conflict (day) do update set amount = excluded.amount, updated_at = excluded.updated_at
  returning * into result_row;
  return result_row;
end;
$$;
grant execute on function public.update_registration_fee(text, numeric) to authenticated;

create or replace function public.lookup_staff_emails(p_ids uuid[])
returns table(id uuid, email text)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not (public.is_admin() or public.is_coordinator()) then
    raise exception 'Staff access required';
  end if;
  return query select p.id, p.email from public.profiles p where p.id = any(p_ids);
end;
$$;
grant execute on function public.lookup_staff_emails(uuid[]) to anon, authenticated;

create or replace function public.prevent_duplicate_registration_day()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if exists (
    select 1 from public.registrations existing
    where existing.participant_id = new.participant_id
      and existing.id <> new.id
      and (existing.selected_day = 'BOTH' or new.selected_day = 'BOTH' or existing.selected_day = new.selected_day)
      and existing.status <> 'CANCELLED'
  ) then
    raise exception 'This participant is already registered for the selected day';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_duplicate_registration_day on public.registrations;
create trigger prevent_duplicate_registration_day
before insert or update on public.registrations
for each row execute function public.prevent_duplicate_registration_day();

drop view if exists public.team_summary;
create view public.team_summary as
select
  et.id,
  et.team_code,
  et.team_name,
  e.code as event_code,
  e.name as event_name,
  e.day,
  et.leader_registration_id as team_leader_registration_id,
  leader.registration_code as team_leader_registration_code,
  et.max_members,
  count(tm.id)::integer as current_members,
  et.status
from public.event_teams et
join public.events e on e.id = et.event_id
left join public.registrations leader on leader.id = et.leader_registration_id
left join public.team_members tm on tm.team_id = et.id
group by et.id, et.team_code, et.team_name, e.code, e.name, e.day,
  et.leader_registration_id, leader.registration_code, et.max_members, et.status;

create or replace function public.prevent_duplicate_event_team_member()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  team_event uuid;
  participant_name text;
begin
  select event_id into team_event from public.event_teams where id = new.team_id;
  select p.name into participant_name
  from public.registrations r join public.participants p on p.id = r.participant_id
  where r.id = new.registration_id;
  if not exists (
    select 1 from public.registrations r
    join public.payments pay on pay.registration_id = r.id
    where r.id = new.registration_id and r.status = 'CONFIRMED' and pay.status = 'VERIFIED'
  ) then
    raise exception '% not yet verified', coalesce(participant_name, 'Participant');
  end if;
  if exists (
    select 1 from public.team_members tm
    join public.event_teams et on et.id = tm.team_id
    where tm.registration_id = new.registration_id
      and et.event_id = team_event
      and et.status <> 'DISBANDED'
      and tm.team_id <> new.team_id
  ) then
    raise exception '% already in team for the same event', coalesce(participant_name, 'Participant');
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_duplicate_event_team_member on public.team_members;
create trigger prevent_duplicate_event_team_member
before insert or update on public.team_members
for each row execute function public.prevent_duplicate_event_team_member();
