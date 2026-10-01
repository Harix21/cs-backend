import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...cors } });

type Registration = { id: string; registration_code: string; selected_day: string; status: string; participant: { name: string; email: string } };
type EventRow = { id: string; code: string; name: string; day: string; event_type: string; min_team_size: number; max_team_size: number };

const findRegistration = async (db: any, identity: string): Promise<Registration | null> => {
  if (identity.includes("@")) {
    const { data } = await db.from("participants").select("name,email,registrations(id,registration_code,selected_day,status)").ilike("email", identity.toLowerCase()).maybeSingle();
    const row = data?.registrations?.[0];
    return row ? { ...row, participant: { name: data.name, email: data.email } } : null;
  }
  const { data } = await db.from("registrations").select("id,registration_code,selected_day,status,participants!inner(name,email)").eq("registration_code", identity.toUpperCase()).maybeSingle();
  return data ? { ...data, participant: data.participants } : null;
};

const verifiedRegistration = async (db: any, identity: string) => {
  const registration = await findRegistration(db, identity);
  if (!registration) throw new Error("user not found");
  const { data: payment } = await db.from("payments").select("status").eq("registration_id", registration.id).maybeSingle();
  if (registration.status !== "CONFIRMED" || payment?.status !== "VERIFIED") throw new Error(`${registration.participant.name} not yet verified`);
  return registration;
};

const packagesForDay = (events: EventRow[], day: string) => {
  const groups = new Map<string, EventRow[]>();
  events.filter(event => event.day === day && event.event_type === "TEAM").forEach(event => {
    const key = String(event.max_team_size);
    groups.set(key, [...(groups.get(key) || []), event]);
  });
  return Array.from(groups.entries()).map(([key, group]) => ({
    id: `${day}:${key}`,
    day,
    size: group[0].max_team_size,
    events: group.map(event => ({ id: event.id, code: event.code, name: event.name }))
  }));
};

Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await request.json();
    const action = String(body.action || "");
    const identity = String(body.identity || "").trim();
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (action === "verify") {
      const registration = await verifiedRegistration(db, identity);
      const { data: events, error } = await db.from("events").select("id,code,name,day,event_type,min_team_size,max_team_size").eq("status", "ACTIVE").order("code");
      if (error) throw error;
      return json({ success: true, registration: { id: registration.id, registration_code: registration.registration_code, selected_day: registration.selected_day, participant_name: registration.participant.name }, packages: { DAY_1: packagesForDay(events || [], "DAY_1"), DAY_2: packagesForDay(events || [], "DAY_2") } });
    }

    const registration = await verifiedRegistration(db, identity);
    const day = String(body.day || "");
    if (!["DAY_1", "DAY_2"].includes(day) || !(registration.selected_day === "BOTH" || registration.selected_day === day)) throw new Error(`${registration.participant.name} is not registered for the selected day.`);

    const { data: allEvents, error: eventError } = await db.from("events").select("id,code,name,day,event_type,min_team_size,max_team_size").eq("status", "ACTIVE").eq("day", day);
    if (eventError) throw eventError;
    const packages = packagesForDay(allEvents || [], day);
    const selectedPackage = packages.find(item => item.id === body.package_id);
    if (!selectedPackage) throw new Error("Select a valid team event package.");

    if (action === "create") {
      const memberIdentities = Array.isArray(body.members) ? body.members.map((value: unknown) => String(value || "").trim()).filter(Boolean) : [];
      const uniqueIdentities = Array.from(new Set([identity, ...memberIdentities]));
      if (uniqueIdentities.length !== selectedPackage.size) throw new Error(`This package requires exactly ${selectedPackage.size} verified members.`);
      const members = [];
      for (const memberIdentity of uniqueIdentities) {
        const member = await verifiedRegistration(db, memberIdentity);
        if (!(member.selected_day === "BOTH" || member.selected_day === day)) throw new Error(`${member.participant.name} is not registered for the selected day.`);
        members.push(member);
      }
      const memberIds = members.map(member => member.id);
      const packageEventIds = selectedPackage.events.map(event => event.id);
      const { data: existing } = await db.from("team_members").select("registration_id,participants(name),event_teams!inner(event_id)").in("registration_id", memberIds).in("event_teams.event_id", packageEventIds);
      if (existing?.length) {
        const names = existing.map((row: any) => row.participants?.name || "Unknown member").join(", ");
        throw new Error(`${names} already in team for the same event`);
      }
      const teamName = String(body.team_name || "").trim();
      if (!teamName) throw new Error("Enter a team name.");
      const { data: team, error: teamError } = await db.from("event_teams").insert({ event_id: selectedPackage.events[0].id, team_code: `${day}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, team_name: teamName, leader_registration_id: registration.id, max_members: selectedPackage.size }).select("id,team_code,team_name").single();
      if (teamError) throw teamError;
      const { error: packageError } = await db.from("event_team_packages").insert(selectedPackage.events.map(event => ({ team_id: team.id, event_id: event.id })));
      if (packageError) throw packageError;
      const { error: memberError } = await db.from("team_members").insert(members.map((member, index) => ({ team_id: team.id, registration_id: member.id, member_role: index === 0 ? "LEADER" : "MEMBER" })));
      if (memberError) throw memberError;
      return json({ success: true, message: `Team created for ${selectedPackage.events.map(event => event.name).join(" and ")}.`, team: { ...team, package_events: selectedPackage.events } });
    }

    if (action === "list") {
      const { data: teams, error } = await db.from("event_team_packages").select("team_id,event_teams(id,team_code,team_name,status,max_members,leader_registration_id,team_members(count))").in("event_id", selectedPackage.events.map(event => event.id));
      if (error) throw error;
      const seen = new Set<string>();
      const results = [];
      for (const row of teams || []) {
        const team = row.event_teams as any;
        if (!team || seen.has(team.id)) continue;
        seen.add(team.id);
        const count = team.team_members?.[0]?.count || 0;
        const { data: leader } = await db.from("registrations").select("participants(name)").eq("id", team.leader_registration_id).maybeSingle();
        results.push({ team_code: team.team_code, team_name: team.team_name, leader_name: leader?.participants?.name || "Team leader", member_count: count, max_members: team.max_members, full: count >= team.max_members || team.status !== "OPEN" });
      }
      return json({ success: true, teams: results });
    }

    if (action === "join") {
      const teamCode = String(body.team_code || "").trim().toUpperCase();
      const { data: team } = await db.from("event_teams").select("id,team_code,team_name,status,max_members,team_members(count)").eq("team_code", teamCode).maybeSingle();
      if (!team || team.status !== "OPEN") throw new Error("Open team was not found.");
      const count = team.team_members?.[0]?.count || 0;
      if (count >= team.max_members) throw new Error("This team is already full.");
      const { data: packageRows } = await db.from("event_team_packages").select("event_id").eq("team_id", team.id);
      if (!(packageRows || []).some((row: any) => selectedPackage.events.some(event => event.id === row.event_id))) throw new Error("This team belongs to a different event package.");
      const packageEventIds = selectedPackage.events.map(event => event.id);
      const { data: existing } = await db.from("team_members").select("participants(name),event_teams!inner(event_id)").eq("registration_id", registration.id).in("event_teams.event_id", packageEventIds).maybeSingle();
      if (existing) throw new Error(`${(existing as any).participants?.name || registration.participant.name} already in team for the same event`);
      const { error } = await db.from("team_members").insert({ team_id: team.id, registration_id: registration.id, member_role: "MEMBER" });
      if (error) throw error;
      return json({ success: true, message: `Joined ${team.team_name}.` });
    }
    return json({ error: "Unsupported team action." }, 400);
  } catch (error) {
    const details = error as { message?: string; details?: string; hint?: string; code?: string };
    const message = error instanceof Error
      ? error.message
      : details?.message || details?.details || details?.hint || (details?.code ? `Request failed (${details.code}).` : "Team request failed.");
    return json({ error: message }, 400);
  }
});
