let allRegistrations = [];
async function loadRegistrations() {
  const {data, error} = await supabaseClient
    .from("registrations")
    .select("id,registration_code,selected_day,status,participants(name,college,department,phone)")
    .order("created_at", {ascending:false});
  if(error){document.getElementById("rows").innerHTML='<tr><td colspan="8">'+error.message+'</td></tr>';return;}
  allRegistrations=data||[]; render();
}
function render(){
  const q=document.getElementById("search").value.toLowerCase();
  const d=document.getElementById("dayFilter").value;
  const s=document.getElementById("statusFilter").value;
  const rows=allRegistrations.filter(r=>{
    const p=r.participants||{};
    return (!d||r.selected_day===d)&&(!s||r.status===s)&&
      (!q||[r.registration_code,p.name,p.college,p.department,p.phone].join(" ").toLowerCase().includes(q));
  });
  document.getElementById("rows").innerHTML=rows.map((r,index)=>{
    const p=r.participants||{};
    const id=`${r.id||r.registration_code}-${index}`;storeDetails("registration",id,{...r,participant:p});
    return `<tr><td>${esc(r.registration_code)}</td><td>${esc(p.name)}</td><td class="wrap-text">${esc(p.college)}</td><td>${esc(p.department)}</td><td>${esc(p.phone)}</td><td>${esc(r.selected_day)}</td><td>${esc(r.status)}</td><td><button onclick="viewDetails('registration','${id}','Registration details')">View</button></td></tr>`;
  }).join("")||'<tr><td colspan="8">No registrations found.</td></tr>';
}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));}
document.getElementById("search").addEventListener("input",render);
document.getElementById("dayFilter").addEventListener("change",render);
document.getElementById("statusFilter").addEventListener("change",render);
loadRegistrations();
