import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...cors } });
const templates: Record<string, { subject: string; body: string }> = {
  REGISTRATION_CONFIRMED: { subject: "Cyber Sentinel registration confirmed", body: "Hello {{name}},\n\nYour Cyber Sentinel registration {{registration}} has been confirmed.\n\nSelected day: {{day}}\n\nYour QR pass: {{qr_url}}\n\nPlease keep your QR pass ready at the venue." },
  PAYMENT_REMINDER: { subject: "Cyber Sentinel payment update", body: "Hello {{name}},\n\nYour payment for registration {{registration}} is currently {{status}}. Please check the registration portal for the latest update." },
  EVENT_ANNOUNCEMENT: { subject: "Cyber Sentinel event announcement", body: "Hello {{name}},\n\n{{message}}\n\nRegards,\nCyber Sentinel Team" }
  ,EVENT_CERTIFICATE: { subject: "Cyber Sentinel certificate - {{event_name}}", body: "Hello {{name}},\n\nYou participated in {{event_name}}. Your event certificate is attached or available from the Cyber Sentinel team.\n\nTeam: {{team}}\nRegistration: {{registration}}\n\nRegards,\nCyber Sentinel Team" }
};
const fill = (text: string, values: Record<string, string>) => text.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] || "");

Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const auth = request.headers.get("Authorization") || "";
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const userDb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userDb.auth.getUser();
    if (!user) return json({ error: "Authentication required." }, 401);
    const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (!profile || !["ADMIN", "COORDINATOR"].includes(profile.role)) return json({ error: "Staff access required." }, 403);

    const body = await request.json();
    const templateType = String(body.template_type || "REGISTRATION_CONFIRMED");
    const template = templates[templateType];
    if (!template) return json({ error: "Unknown email template." }, 400);
    const ids = Array.isArray(body.registration_ids) ? body.registration_ids : [];
    const selectedEvent = body.event_id ? String(body.event_id) : null;
    let query = db.from("registrations").select("id,registration_code,selected_day,status,qr_token,participants(name,email)");
    if (templateType === "EVENT_CERTIFICATE" && selectedEvent) {
      const { data: attendance } = await db.from("attendance").select("registration_id").eq("event_id", selectedEvent).eq("status", "PRESENT");
      query = query.in("id", (attendance || []).map(row => row.registration_id));
    }
    if (body.all === true) query = query.not("id", "is", null);
    else if (ids.length) query = query.in("id", ids);
    else return json({ error: "Select at least one recipient or choose all." }, 400);
    const { data: registrations, error } = await query;
    if (error) throw error;
    if (profile.role === "COORDINATOR") {
      const { data: assignments } = await db.from("event_coordinators").select("event_id").eq("coordinator_user_id", user.id);
      const allowed = new Set((assignments || []).map(row => row.event_id));
      if (selectedEvent && !allowed.has(selectedEvent)) return json({ error: "You are not assigned to this event." }, 403);
    }
    const apiKey = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("MAIL_FROM");
    if (!apiKey || !from) return json({ error: "Email delivery is not configured. Set RESEND_API_KEY and MAIL_FROM." }, 503);
    const results = [];
    for (const registration of registrations || []) {
      const participant = (registration as any).participants;
      const origin = request.headers.get("origin") || request.headers.get("referer")?.replace(/\/[^/]*$/, "") || "";
      const qrBase = Deno.env.get("QR_VERIFY_BASE_URL") || `${origin}/verify/qr/`;
      let eventName = "the selected event";
      if (selectedEvent) { const { data: event } = await db.from("events").select("name").eq("id", selectedEvent).maybeSingle(); eventName = event?.name || eventName; }
      let teamName = "Individual";
      if (selectedEvent) { const { data: member } = await db.from("team_members").select("team_id").eq("registration_id", registration.id).maybeSingle(); if (member) { const { data: team } = await db.from("event_teams").select("team_name").eq("id", member.team_id).eq("event_id", selectedEvent).maybeSingle(); teamName = team?.team_name || teamName; } }
      const values = { name: participant?.name || "Participant", registration: registration.registration_code, day: registration.selected_day, status: registration.status, message: String(body.message || ""), qr_url: `${qrBase.replace(/\/$/, "")}/${registration.qr_token}`, event_name: eventName, team: teamName };
      const subject = fill(String(body.subject || template.subject), values);
      const text = fill(String(body.message || template.body), values);
      const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ from, to: [participant.email], subject, text }) });
      const sent = await response.json();
      await db.from("email_logs").insert({ recipient: participant.email, template_type: templateType, related_registration_id: registration.id, status: response.ok ? "SENT" : "FAILED", provider_message_id: sent.id || null, error_message: response.ok ? null : JSON.stringify(sent), sent_at: response.ok ? new Date().toISOString() : null });
      results.push({ registration_id: registration.id, email: participant.email, sent: response.ok });
    }
    return json({ success: true, sent: results.filter(item => item.sent).length, failed: results.filter(item => !item.sent).length, results });
  } catch (error) { return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500); }
});
