
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
const json=(b:any,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"Content-Type":"application/json",...cors}});
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 try{
  const auth=req.headers.get("Authorization")||"";
  const anon=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_ANON_KEY")!,{global:{headers:{Authorization:auth}}});
  const {data:{user}}=await anon.auth.getUser();
  if(!user)return json({error:"Authentication required."},401);
  const body=await req.json();
  const {data,error}=await anon.rpc("record_main_attendance",{p_qr_token:body.qr_token,p_day:body.day});
  if(error)return json({error:error.message},400);
  if(!data.success)return json(data,400);
  return json(data);
 }catch(e){return json({error:e instanceof Error?e.message:"Unexpected error"},500)}
});
