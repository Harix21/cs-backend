let allAttendance=[];
function renderAttendance() {
  const rows=document.getElementById('attendanceRows');
  const q=(document.getElementById('attendanceSearch')?.value||'').toLowerCase().trim();
  const filtered=allAttendance.filter(record=>!q||[record.registrations?.registration_code,record.registration_id,record.events?.name,record.event_id,record.scanned_by_email,record.scanned_by,record.status].join(' ').toLowerCase().includes(q));
  rows.innerHTML=filtered.map(record=>{
    storeDetails('attendance',record.id,record);
    return `<tr><td>${esc(record.registrations?.registration_code||record.registration_id)}</td><td>${esc(record.events?.name||record.event_id)}</td><td>${new Date(record.scanned_at).toLocaleString()}</td><td class="wrap-text">${esc(record.scanned_by_email||record.scanned_by||'—')}</td><td>${esc(record.status)}</td><td><button type="button" onclick="viewDetails('attendance','${esc(record.id)}','Attendance details')">View</button></td></tr>`;
  }).join('')||'<tr><td colspan="6">No attendance records found.</td></tr>';
}
async function loadAttendance() {
  const rows = document.getElementById('attendanceRows');
  if (!document.getElementById('attendanceSearch')) {
    const toolbar=document.createElement('div');
    toolbar.className='toolbar';
    toolbar.innerHTML='<input id="attendanceSearch" type="search" placeholder="Search registration, event, scanner, status...">';
    rows.closest('.table-wrap').before(toolbar);
    toolbar.querySelector('input').addEventListener('input',renderAttendance);
  }
  let query = supabaseClient.from('attendance')
    .select('id,registration_id,event_id,scanned_at,status,scanned_by,device_id,events(name),registrations(registration_code)')
    .order('scanned_at', { ascending: false });
  const { data, error } = await query;
  if (error) {
    rows.innerHTML = `<tr><td colspan="6">${esc(error.message)}</td></tr>`;
    return;
  }
  const records = await Promise.all((data || []).map(async record => {
    if (!record.scanned_by) return record;
    const { data: profile } = await supabaseClient.from('profiles').select('email').eq('id', record.scanned_by).maybeSingle();
    return { ...record, scanned_by_email: profile?.email || '' };
  }));
  allAttendance=records;renderAttendance();
}
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}
loadAttendance();
