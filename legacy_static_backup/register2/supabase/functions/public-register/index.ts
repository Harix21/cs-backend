
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
const json=(body:any,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json",...cors}});

Deno.serve(async (req)=>{
 if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
 try{
  const form=await req.formData();
  const name=String(form.get("name")||"").trim(), email=String(form.get("email")||"").trim().toLowerCase();
  const phone=String(form.get("phone")||"").trim(), college=String(form.get("college")||"").trim();
  const department=String(form.get("department")||"").trim(), year=String(form.get("year")||"").trim();
  const selected_day=String(form.get("selected_day")||"").trim(), utr=String(form.get("utr")||"").trim();
  let special_event_codes:string[]=[];
  try { special_event_codes=JSON.parse(String(form.get("special_event_codes")||"[]")); } catch { return json({error:"Invalid special event selection."},400); }
  const file=form.get("payment_screenshot");
  if(!name||!email||!phone||!college||!department||!selected_day||!utr||!(file instanceof File))
    return json({error:"All required fields must be provided."},400);
  if(!["DAY_1","DAY_2","BOTH","SPECIAL"].includes(selected_day)) return json({error:"Invalid registration type."},400);
  if(selected_day==="SPECIAL" && !special_event_codes.length) return json({error:"Select at least one special event."},400);
  if(file.size>5*1024*1024) return json({error:"Screenshot exceeds 5 MB."},400);

  const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let amount=0;
  let specialEvents:any[]=[];
  if(selected_day==="SPECIAL"){
    const {data,error}=await admin.from("special_events").select("id,code,fee,status").in("code",special_event_codes.map(code=>String(code).trim().toUpperCase())).eq("status","ACTIVE");
    if(error) return json({error:"Special events are not configured."},500);
    specialEvents=data||[];
    if(specialEvents.length!==new Set(special_event_codes.map(code=>String(code).trim().toUpperCase())).size) return json({error:"One or more selected special events are unavailable."},409);
    const {data:existingParticipant}=await admin.from("participants").select("id").or(`email.eq.${email},phone.eq.${phone}`).limit(1).maybeSingle();
    if(existingParticipant){
      const {data:existingRegistrations}=await admin.from("registrations").select("id").eq("participant_id",existingParticipant.id);
      const {data:existingSpecial}=await admin.from("special_event_registrations").select("special_event_id").in("special_event_id",specialEvents.map(event=>event.id)).in("registration_id",(existingRegistrations||[]).map((registration:any)=>registration.id));
      if(existingSpecial?.length) return json({error:"This participant is already registered for one of the selected special events."},409);
    }
    amount=specialEvents.reduce((total,event)=>total+Number(event.fee||0),0);
  } else {
    const {data:feeRows,error:feeError}=await admin.from("registration_fees").select("day,amount");
    if(feeError) return json({error:"Registration fees are not configured."},500);
    const fees=Object.fromEntries((feeRows||[]).map((row:any)=>[row.day,Number(row.amount)])) as Record<string,number>;
    amount=selected_day==="BOTH" ? Number(fees.DAY_1||0)+Number(fees.DAY_2||0) : Number(fees[selected_day]||0);
  }

  const [{data:existingEmail,error:emailCheckError},{data:existingPhone,error:phoneCheckError},{data:existingUtr,error:utrCheckError}]=await Promise.all([
    admin.from("participants").select("id,registrations(selected_day,status)").ilike("email",email).limit(1).maybeSingle(),
    admin.from("participants").select("id,registrations(selected_day,status)").eq("phone",phone).limit(1).maybeSingle(),
    admin.from("payments").select("id").ilike("utr",utr).limit(1).maybeSingle()
  ]);
  if(emailCheckError||phoneCheckError||utrCheckError)
    return json({error:"Unable to validate existing registration details. Please try again."},500);
  if(existingEmail && existingPhone && existingEmail.id!==existingPhone.id)
    return json({error:"The email and phone belong to different existing registrations."},409);
  const existingParticipant=existingEmail||existingPhone;
  if(existingParticipant){
    const requestedDays=selected_day==='BOTH'?['DAY_1','DAY_2']:[selected_day];
    const overlaps=(existingParticipant.registrations||[]).some((registration:any)=>
      registration.selected_day==='BOTH' || requestedDays.some(day=>registration.selected_day===day)
    );
    if(overlaps) return json({error:`This participant is already registered for ${selected_day==='BOTH'?'one or both selected days':selected_day.replace('_',' ')}.`},409);
  }
  if(existingUtr) return json({error:"This UTR has already been submitted."},409);

  let participantId=existingParticipant?.id;
  if(!participantId){
    const {data:participant,error:pErr}=await admin.from("participants").insert({name,college,department,phone,email,year}).select("id").single();
    if(pErr){
      if(pErr.code==="23505"||pErr.message?.includes("participants_email_unique_idx"))
        return json({error:"This email is already registered."},409);
      if(pErr.message?.includes("participants_phone_unique_idx"))
        return json({error:"This phone number is already registered."},409);
      return json({error:pErr.message},400);
    }
    participantId=participant.id;
  }

  const {data: codeData,error:codeErr}=await admin.rpc("generate_registration_code");
  if(codeErr) return json({error:codeErr.message},500);

  const {data: registration,error:rErr}=await admin.from("registrations").insert({
    participant_id:participantId,registration_code:codeData,selected_day,status:"PAYMENT_PENDING"
  }).select("id,registration_code,qr_token").single();
  if(rErr) return json({error:rErr.message},400);

  if(selected_day==="SPECIAL"){
    const {error:specialRegistrationError}=await admin.from("special_event_registrations").insert(specialEvents.map(event=>({registration_id:registration.id,special_event_id:event.id})));
    if(specialRegistrationError){await admin.from("registrations").delete().eq("id",registration.id);return json({error:specialRegistrationError.message},400);}
  }

  const path=`${registration.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`;
  const bytes=new Uint8Array(await file.arrayBuffer());
  const {error:uErr}=await admin.storage.from("payment-screenshots").upload(path,bytes,{contentType:file.type||"image/*",upsert:false});
  if(uErr){await admin.from("registrations").delete().eq("id",registration.id);return json({error:"Could not store payment screenshot."},500)}

  const {error:payErr}=await admin.from("payments").insert({
    registration_id:registration.id,amount,utr,screenshot_path:path,status:"UNDER_REVIEW"
  });
  if(payErr){
    await admin.storage.from("payment-screenshots").remove([path]);
    await admin.from("registrations").delete().eq("id",registration.id);
    if(payErr.code==="23505"||payErr.message?.toLowerCase().includes("payments_utr_unique_idx"))
      return json({error:"This UTR has already been submitted."},409);
    return json({error:payErr.message},400);
  }

  return json({success:true,registration_code:registration.registration_code,status:"UNDER_REVIEW"});
 }catch(e){return json({error:e instanceof Error?e.message:"Unexpected error"},500)}
});
