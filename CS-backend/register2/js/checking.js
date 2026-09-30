
const $=s=>document.querySelector(s), form=$("#lookupForm"), alertBox=$("#alert"), result=$("#result");
function msg(m,t="error"){alertBox.className=`alert show ${t}`;alertBox.textContent=m;showFeedback(t === "success" ? "Registration found" : "Unable to check registration",m,t)}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function statusClass(s){return s==="VERIFIED"?"verified":(s==="REJECTED"?"rejected":"pending")}
function render(d){
 $("#name").textContent=d.participant.name;$("#code").textContent=d.registration.registration_code;
 $("#college").textContent=d.participant.college;$("#department").textContent=d.participant.department;
 $("#days").textContent=d.registration.selected_day;$("#regStatus").textContent=d.registration.status;
 $("#utr").textContent=d.payment?.utr_masked||"Hidden";$("#amount").textContent=d.payment?`₹${d.payment.amount}`:"—";
 $("#paymentStatus").innerHTML=`<span class="status ${statusClass(d.payment?.status)}">${esc(d.payment?.status||"PENDING")}</span>`;
 if(d.team){
  $("#teamArea").innerHTML=`<div class="team"><h3>${esc(d.team.team_name)}</h3><p class="notice">${esc(d.team.event_name)} • ${esc(d.team.team_code)} • ${esc(d.team.status)}</p>
  ${d.team.members.map(m=>`<div class="member"><span>${esc(m.name)}</span><span class="pill">${esc(m.member_role)}</span></div>`).join("")}</div>`;
 }else $("#teamArea").innerHTML=`<div class="team"><strong>No team currently linked.</strong><p class="notice">If you are eligible for a team event, use the Team page to create or join a team.</p></div>`;
    if(d.qr_url){
  $("#qrcode").innerHTML="";new QRCode($("#qrcode"),{text:d.qr_url,width:200,height:200});
  $("#qrSection").classList.remove("hidden");
    }else $("#qrSection").classList.add("hidden");
 result.classList.remove("hidden");result.scrollIntoView({behavior:"smooth"});
}
form.addEventListener("submit",async e=>{
 e.preventDefault();result.classList.add("hidden");$("#qrSection").classList.add("hidden");
 const email=$("#email").value.trim(),phone=$("#phone").value.trim();if(!email||!phone)return msg("Enter both email and phone.");
 const b=$("#checkBtn");b.disabled=true;b.textContent="Checking...";
 try{
  const r=await fetch(`${CS_CONFIG.SUPABASE_URL}/functions/v1/check-registration`,{method:"POST",
   headers:{"Content-Type":"application/json","Authorization":`Bearer ${CS_CONFIG.SUPABASE_ANON_KEY}`},
   body:JSON.stringify({email,phone})});
  const d=await r.json();if(!r.ok)throw new Error(d.error||"Unable to check registration.");
  render(d);msg(d.payment?.status==="VERIFIED"?"Registration verified. Your QR is ready.":"Registration found. Your QR will appear after payment verification.","success");
 }catch(err){msg(err.message)}finally{b.disabled=false;b.textContent="Check Registration"}
});
$("#downloadQr").onclick=()=>{const source=$("#qrcode canvas")||$("#qrcode img");if(!source)return;const canvas=document.createElement("canvas"),ctx=canvas.getContext("2d");canvas.width=1000;canvas.height=1220;ctx.fillStyle="#081522";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle="#5ee7ff";ctx.fillRect(0,0,canvas.width,14);ctx.fillStyle="#f3f8ff";ctx.font="800 42px Arial";ctx.fillText("CYBER SENTINEL",70,100);ctx.fillStyle="#91a6bd";ctx.font="24px Arial";ctx.fillText("OFFICIAL ENTRY PASS",70,142);ctx.fillStyle="#fff";ctx.fillRect(70,190,860,790);const qr=source instanceof HTMLCanvasElement?source:source;const drawQr=()=>{const size=640,x=(canvas.width-size)/2,y=265;ctx.drawImage(qr,x,y,size,size);ctx.fillStyle="#081522";ctx.font="800 32px Arial";ctx.textAlign="center";ctx.fillText($("#code").textContent,500,1050);ctx.font="28px Arial";ctx.fillStyle="#5ee7ff";ctx.fillText($("#days").textContent,500,1100);ctx.font="20px Arial";ctx.fillStyle="#91a6bd";ctx.fillText("Present this QR at the assigned attendance desk",500,1160);const a=document.createElement("a");a.href=canvas.toDataURL("image/png");a.download=`${$("#code").textContent}-${$("#days").textContent}-QR.png`;a.click()};if(source instanceof HTMLCanvasElement)drawQr();else{const image=new Image();image.onload=drawQr;image.src=source.src;}};
$("#printBtn").onclick=()=>window.print();
$("#downloadBtn").onclick=()=>{const blob=new Blob([$("#printArea").innerText],{type:"text/plain"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`${$("#code").textContent}-confirmation.txt`;a.click()};
