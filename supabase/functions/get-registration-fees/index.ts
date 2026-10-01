import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...cors } });

Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "GET") return json({ error: "Method not allowed." }, 405);

  try {
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data, error } = await db.from("registration_fees").select("day,amount");
    if (error) throw error;
    const fees = Object.fromEntries((data || []).map((row: { day: string; amount: number }) => [row.day, Number(row.amount)]));
    return json({ DAY_1: fees.DAY_1 ?? 0, DAY_2: fees.DAY_2 ?? 0 });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unable to load registration fees." }, 500);
  }
});
