-- Profile-backed coordinator credentials. Run after supabase_schema_final.sql.
-- Coordinators use short-lived opaque request tokens instead of auth.users.

alter table public.profiles drop constraint if exists profiles_id_fkey;
alter table public.profiles add column if not exists password_hash text;

create table if not exists public.coordinator_sessions (
  token uuid primary key default gen_random_uuid(),
  coordinator_id uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null default now() + interval '12 hours',
  created_at timestamptz not null default now()
);

alter table public.coordinator_sessions enable row level security;

create or replace function public.current_actor_id()
returns uuid language sql stable security definer set search_path = public
as $$
  select coalesce(
    auth.uid(),
    (select coordinator_id from public.coordinator_sessions
     where token = nullif(current_setting('request.headers', true)::json->>'x-coordinator-token', '')::uuid
       and expires_at > now())
  );
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles where id = public.current_actor_id() and role = 'ADMIN' and active); $$;

create or replace function public.is_coordinator()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles where id = public.current_actor_id() and role = 'COORDINATOR' and active); $$;

create or replace function public.is_event_coordinator(p_event_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (
  select 1 from public.event_coordinators ec join public.profiles p on p.id = ec.coordinator_user_id
  where ec.event_id = p_event_id and ec.coordinator_user_id = public.current_actor_id()
    and p.active and p.role = 'COORDINATOR'
); $$;

create or replace function public.create_coordinator(p_name text, p_email text, p_password text)
returns uuid language plpgsql security definer set search_path = public, extensions
as $$
declare v_id uuid;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if length(trim(p_name)) < 2 or length(p_password) < 8 then raise exception 'Name and an 8 character password are required'; end if;
  insert into public.profiles(id,name,email,password_hash,role,active)
  values (gen_random_uuid(), trim(p_name), lower(trim(p_email)), crypt(p_password, gen_salt('bf')), 'COORDINATOR', true)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.coordinator_login(p_email text, p_password text)
returns jsonb language plpgsql security definer set search_path = public, extensions
as $$
declare v_profile public.profiles; v_token uuid;
begin
  select * into v_profile from public.profiles
  where lower(email)=lower(trim(p_email)) and role='COORDINATOR' and active
    and password_hash is not null and password_hash = crypt(p_password, password_hash);
  if not found then raise exception 'Invalid email or password'; end if;
  insert into public.coordinator_sessions(coordinator_id) values(v_profile.id) returning token into v_token;
  return jsonb_build_object('token',v_token,'profile',jsonb_build_object('id',v_profile.id,'name',v_profile.name,'email',v_profile.email,'role',v_profile.role,'active',v_profile.active));
end;
$$;

revoke all on function public.coordinator_login(text,text) from public;
grant execute on function public.coordinator_login(text,text) to anon, authenticated;
revoke all on function public.create_coordinator(text,text,text) from public;
grant execute on function public.create_coordinator(text,text,text) to authenticated;

drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select on public.profiles
for select to public using (id = public.current_actor_id());
alter policy events_authenticated_select on public.events to public;
drop policy if exists event_coordinators_self_select on public.event_coordinators;
create policy event_coordinators_self_select on public.event_coordinators
for select to public using (coordinator_user_id = public.current_actor_id());
alter policy participants_coordinator_select on public.participants to public;
alter policy registrations_coordinator_select on public.registrations to public;
alter policy payments_coordinator_select on public.payments to public;
alter policy event_registrations_coordinator_select on public.event_registrations to public;
alter policy event_teams_coordinator_select on public.event_teams to public;
alter policy team_members_coordinator_select on public.team_members to public;
alter policy attendance_coordinator_select on public.attendance to public;
alter policy announcements_coordinator_select on public.announcements to public;
alter policy email_logs_coordinator_select on public.email_logs to public;

drop policy if exists announcements_coordinator_insert on public.announcements;
create policy announcements_coordinator_insert on public.announcements
for insert to public with check (
  public.is_coordinator() and created_by = public.current_actor_id()
  and (target_scope = 'ALL' or (target_scope = 'EVENT' and target_event_id is not null and public.is_event_coordinator(target_event_id)))
);

grant execute on function public.inspect_attendance_scan(uuid,uuid,text) to anon;
grant execute on function public.inspect_registration_attendance(text,uuid,text) to anon;
grant execute on function public.record_attendance(uuid,uuid,uuid,text,timestamptz) to anon;
grant execute on function public.confirm_registration(uuid,uuid) to anon;