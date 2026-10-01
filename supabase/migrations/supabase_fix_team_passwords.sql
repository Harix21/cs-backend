-- Run after supabase_schema_final.sql.
-- Stores only a SHA-256 team password hash; the password is never returned to clients.

alter table public.event_teams
  add column if not exists team_password_hash text;

create index if not exists event_teams_name_idx on public.event_teams (lower(team_name));
