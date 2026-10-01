
const $=s=>document.querySelector(s), form=$("#registrationForm"), alertBox=$("#alert"), btn=$("#submitBtn");
let fees={DAY_1:0,DAY_2:0};
let specialEvents=[];
function alertMsg(m,t="error"){alertBox.className=`alert show ${t}`;alertBox.textContent=m;showFeedback(t === "success" ? "Registration submitted" : "Registration failed",m,t)}
function updateFee(){const day=document.querySelector('input[name="day"]:checked')?.value;if(!day)return;const amount=day==="BOTH"?fees.DAY_1+fees.DAY_2:day==="SPECIAL"?[...document.querySelectorAll('input[name="special_event"]:checked')].reduce((sum,input)=>sum+Number(input.dataset.fee||0),0):fees[day];$("#fee").textContent=`₹${amount.toFixed(2)}`}
document.querySelectorAll('input[name="day"]').forEach(x=>x.addEventListener("change",updateFee));
fetch(`${CS_CONFIG.SUPABASE_URL}/functions/v1/get-registration-fees`,{headers:{Authorization:`Bearer ${CS_CONFIG.SUPABASE_ANON_KEY}`}}).then(async r=>{const data=await r.json();if(!r.ok)throw new Error(data.error||"Unable to load registration fees.");return data}).then(data=>{fees={DAY_1:Number(data.DAY_1||0),DAY_2:Number(data.DAY_2||0)};updateFee()}).catch(()=>alertMsg("Registration fees are temporarily unavailable."));
fetch(`${CS_CONFIG.SUPABASE_URL}/rest/v1/rpc/get_special_events`,{method:"POST",headers:{apikey:CS_CONFIG.SUPABASE_ANON_KEY,Authorization:`Bearer ${CS_CONFIG.SUPABASE_ANON_KEY}`}}).then(r=>r.json()).then(data=>{specialEvents=Array.isArray(data)?data:[];$("#specialEvents").innerHTML=specialEvents.map(event=>`<label class="event"><input type="checkbox" name="special_event" value="${event.code}" data-fee="${event.fee}"><strong>${event.code} · ${event.name}</strong><small>${event.description||"Special event"} · ₹${Number(event.fee).toFixed(2)}</small></label>`).join("");document.querySelectorAll('input[name="special_event"]').forEach(input=>input.addEventListener("change",updateFee));}).catch(()=>{});
document.querySelectorAll('input[name="day"]').forEach(input=>input.addEventListener("change",()=>$("#specialEvents").hidden=input.value!=="SPECIAL"));
form.addEventListener("submit",async e=>{
 e.preventDefault(); alertBox.className="alert"; const day=document.querySelector('input[name="day"]:checked')?.value;
 if(!day)return alertMsg("Please select a registration option.");
 const selectedSpecialEvents=[...document.querySelectorAll('input[name="special_event"]:checked')].map(input=>input.value);
 if(day==="SPECIAL"&&!selectedSpecialEvents.length)return alertMsg("Please select at least one special event.");
 const file=$("#paymentScreenshot").files[0]; if(!file)return alertMsg("Please upload your payment screenshot.");
 if(file.size>5*1024*1024)return alertMsg("Payment screenshot must be 5 MB or smaller.");
 btn.disabled=true;btn.textContent="Submitting...";
 try{
  const fd=new FormData();
  ["name","email","phone","college","department","year","utr"].forEach(id=>fd.append(id,$("#"+id).value.trim()));
    fd.append("selected_day",day);fd.append("special_event_codes",JSON.stringify(selectedSpecialEvents));fd.append("payment_screenshot",file);
  const url=`${CS_CONFIG.SUPABASE_URL}/functions/v1/public-register`;
  const r=await fetch(url,{method:"POST",headers:{Authorization:`Bearer ${CS_CONFIG.SUPABASE_ANON_KEY}`},body:fd});
  const data=await r.json(); if(!r.ok)throw new Error(data.error||"Registration failed.");
  localStorage.setItem("cs_last_registration",JSON.stringify({code:data.registration_code,email:$("#email").value.trim(),phone:$("#phone").value.trim()}));
    form.reset();$("#specialEvents").hidden=true;$("#fee").textContent="—";
  alertMsg(`Registration submitted successfully. Registration ID: ${data.registration_code}. Payment status: UNDER_REVIEW. Use the Checking page later to view the verified pass.`,"success");
 }catch(err){alertMsg(err.message)}finally{btn.disabled=false;btn.textContent="Submit Registration"}
});
