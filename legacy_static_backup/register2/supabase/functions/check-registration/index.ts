
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
const json=(b:any,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"Content-Type":"application/json",...cors}});

Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 try{
  const {email,phone}=await req.json();
  if(!email||!phone)return json({error:"Email and phone are required."},400);
  const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const {data:p,error:pe}=await db.from("participants").select("id,name,email,phone,college,department,year").eq("email",String(email).trim().toLowerCase()).eq("phone",String(phone).trim()).maybeSingle();
  if(pe||!p)return json({error:"No matching registration found."},404);

  const {data:r,error:re}=await db.from("registrations").select("id,registration_code,selected_day,status,qr_token,created_at").eq("participant_id",p.id).order("created_at",{ascending:false}).limit(1).maybeSingle();
  if(re||!r)return json({error:"No registration found."},404);
  const {data:pay}=await db.from("payments").select("amount,utr,status,rejection_reason").eq("registration_id",r.id).maybeSingle();
  const {data:teamAccess}=await db.from("event_registrations").select("events(id,code,name,day,event_type)").eq("registration_id",r.id).eq("active",true);
  const {data:specialAccess}=await db.from("special_event_registrations").select("special_events(id,code,name,fee)").eq("registration_id",r.id);
  const team_events=(teamAccess||[]).map((item:any)=>item.events).filter((event:any)=>event?.event_type==="TEAM");

  let team=null;
  const {data:members}=await db.from("team_members").select("team_id,member_role").eq("registration_id",r.id);
  if(members?.length){
   const tid=members[0].team_id;
   const {data:t}=await db.from("event_teams").select("id,team_code,team_name,status,event_id,events(name)").eq("id",tid).maybeSingle();
   if(t){
    const {data:ms}=await db.from("team_members").select("registration_id,member_role,participants(name)").eq("team_id",tid);
    team={team_code:t.team_code,team_name:t.team_name,status:t.status,event_name:(t as any).events?.name||"",members:(ms||[]).map((m:any)=>({name:m.participants?.name||"Member",member_role:m.member_role}))};
   }
  }
  const publicOrigin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/register2\/checking\/?(?:\?.*)?$/, "") || "";
  const qrBase = Deno.env.get("QR_VERIFY_BASE_URL") || `${publicOrigin}/verify/qr/`;
  const qr_url=pay?.status==="VERIFIED"&&r.status==="CONFIRMED"
    ? `${qrBase.replace(/\/$/, "")}/${r.qr_token}` : null;
  return json({
   participant:{name:p.name,college:p.college,department:p.department,year:p.year},
   registration:{registration_code:r.registration_code,selected_day:r.selected_day,status:r.status},
  team_events,
  special_events:(specialAccess||[]).map((item:any)=>item.special_events).filter(Boolean),
   payment:pay?{amount:pay.amount,status:pay.status,utr_masked:pay.utr?`${String(pay.utr).slice(0,4)}••••${String(pay.utr).slice(-3)}`:""}:null,
   team,qr_url
  });
 }catch(e){return json({error:e instanceof Error?e.message:"Unexpected error"},500)}
});
