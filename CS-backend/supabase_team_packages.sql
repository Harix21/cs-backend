-- Team package support. Run after supabase_schema_final.sql and the secondary migrations.
-- A team package groups same-day team events with the same required member count.

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
