-- Remove the obsolete team password feature.
alter table if exists public.event_teams drop column if exists team_password_hash;
