let allPayments=[];
function renderPayments(){
  const b=document.getElementById("paymentRows");
  const q=(document.getElementById("paymentSearch")?.value||"").toLowerCase().trim();
  const filtered=allPayments.filter(p=>{
    const registration=p.registrations||{}, participant=registration.participants||{};
    return !q||[registration.registration_code,participant.name,participant.email,participant.college,p.utr,p.status,p.event_label,p.special_event_label].join(" ").toLowerCase().includes(q);
  });
  b.innerHTML=filtered.map((p,index)=>{const detailId=`${p.id||p.registration_id}-${index}`;storeDetails("payment",detailId,p);return `<tr>
    <td>${esc(p.registrations?.registration_code||p.registration_id)}${p.special_event_label?`<br><small>${esc(p.special_event_label)}</small>`:''}${p.event_label?`<br><small>${esc(p.event_label)}</small>`:''}</td><td>₹${Number(p.amount).toFixed(2)}</td>
    <td>${esc(p.utr)}</td><td>${p.screenshot_url?`<button type="button" class="image-preview-trigger" onclick="openImagePreview('${esc(p.screenshot_url)}')"><img src="${esc(p.screenshot_url)}" alt="Payment proof" style="width:110px;height:70px;object-fit:cover;border-radius:4px"></button>`:'—'}</td>
    <td>${esc(p.status)}</td>
    <td><button onclick="viewDetails('payment','${detailId}','Payment details')">View</button>
    <button onclick="verifyPayment('${p.registration_id}')">Verify</button>
    <button onclick="rejectPayment('${p.registration_id}')">Reject</button>
    ${p.status==='VERIFIED'?`<button onclick="sendPaymentConfirmation('${p.registration_id}')">Send confirmation</button>`:''}</td>
  </tr>`}).join("")||'<tr><td colspan="7">No payments found.</td></tr>';
}
async function loadPayments(){
  let q=supabaseClient.from("payments")
    .select("id,registration_id,amount,utr,screenshot_path,status,submitted_at,registrations(registration_code,selected_day,qr_token,participants(name,email,college,department,year),event_registrations(events(code,name)),special_event_registrations(special_events(code,name)))")
    .order("submitted_at",{ascending:false});
  const status=document.getElementById("paymentStatus").value;
  if(status) q=q.eq("status",status);
  const {data,error}=await q;
  const b=document.getElementById("paymentRows");
  if(error){b.innerHTML='<tr><td colspan="6">'+error.message+'</td></tr>';return;}
  const payments=await Promise.all((data||[]).map(async p=>{
    if(!p.screenshot_path) return p;
    const {data:signed}=await supabaseClient.storage.from('payment-screenshots').createSignedUrl(p.screenshot_path,3600);
    const specialNames=(p.registrations?.special_event_registrations||[]).map(item=>item.special_events?.name).filter(Boolean);
    const eventNames=(p.registrations?.event_registrations||[]).map(item=>item.events?.name).filter(Boolean);
    return {...p,screenshot_url:signed?.signedUrl||'',special_event_label:specialNames.length?`Special (${specialNames.join(', ')})`:'',event_label:eventNames.join(', ')};
  }));
  allPayments=payments;renderPayments();
}
async function sendPaymentConfirmation(registrationId){
  const {data,error}=await supabaseClient.from('payments').select('amount,status,registrations(registration_code,selected_day,qr_token,participants(name,email,college,department,year))').eq('registration_id',registrationId).maybeSingle();
  if(error||!data||data.status!=='VERIFIED'){alert('Only verified payments can receive confirmation.');return;}
  const r=data.registrations,p=r.participants,qr=`${window.QR_VERIFY_BASE_URL||`${window.location.origin}/verify/qr/`}${r.qr_token}`;
  const subject=`Cyber Sentinel registration confirmed - ${r.registration_code}`;
  const body=`Dear ${p.name},\n\nYour payment has been verified and your Cyber Sentinel registration is confirmed.\n\nRegistration ID: ${r.registration_code}\nRegistered day: ${r.selected_day}\nCollege: ${p.college}\nDepartment: ${p.department}\nYear: ${p.year||'Not provided'}\nPayment amount: ₹${Number(data.amount).toFixed(2)}\n\nYour QR pass: ${qr}\n\nPlease present this QR pass at the event entry desk.\n\nRegards,\nCyber Sentinel Team`;
  const url=new URL('https://mail.google.com/mail/');url.searchParams.set('view','cm');url.searchParams.set('fs','1');url.searchParams.set('to',p.email);url.searchParams.set('su',subject);url.searchParams.set('body',body);window.open(url.toString(),'_blank');
}
async function verifyPayment(id){
  if(!confirm("Verify this payment?")) return;
  const {data:{user}}=await supabaseClient.auth.getUser();
  const {error}=await supabaseClient.rpc("confirm_registration",{p_registration_id:id,p_verified_by:user.id});
  if(error) alert(error.message); else {alert("Payment verified.");loadPayments();}
}
async function rejectPayment(id){
  const reason=prompt("Rejection reason:");
  if(!reason) return;
  const {data:{user}}=await supabaseClient.auth.getUser();
  const {error}=await supabaseClient.rpc("reject_payment",{p_registration_id:id,p_reason:reason,p_rejected_by:user.id});
  if(error) alert(error.message); else {alert("Payment rejected.");loadPayments();}
}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));}
document.getElementById("paymentStatus").addEventListener("change",loadPayments);
document.getElementById("paymentSearch")?.addEventListener("input",renderPayments);
loadPayments();
