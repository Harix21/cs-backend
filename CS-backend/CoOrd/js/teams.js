import { supabase } from './supabase.js';
const { data: { session } } = await supabase.auth.getSession();
const eventFilter = document.querySelector('#eventFilter');
const teamStatus = document.querySelector('#teamStatus');
const rows = document.querySelector('#rows');
rows.closest('table')?.querySelector('thead tr')?.insertAdjacentHTML('beforeend', '<th>Details</th>');
const { data: assignments } = await supabase.from('event_coordinators').select('event_id,events(id,code,name)').eq('coordinator_user_id', session.user.id);
const events = (assignments || []).map(item => item.events).filter(Boolean);
eventFilter.innerHTML = '<option value="">All assigned events</option>' + events.map(event => `<option value="${event.id}">${event.code} · ${event.name}</option>`).join('');
const { data, error } = await supabase.from('team_summary').select('*');
const all = await Promise.all((data || []).map(async team => {
  const { data: members } = await supabase.from('team_members').select('member_role,registrations(registration_code,participants(name))').eq('team_id', team.id);
  return { ...team, team_members: (members || []).map(member => ({ role: member.member_role, cs_id: member.registrations?.registration_code, name: member.registrations?.participants?.name })) };
}));
function esc(value) { return String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character])); }
function render() {
  const eventId = eventFilter.value;
  const status = teamStatus.value;
  const filtered = all.filter(team => (!eventId || team.event_id === eventId) && (!status || team.status === status));
  rows.innerHTML = filtered.map(team => { storeDetails('team', team.id, team); return `<tr><td>${esc(team.team_code)}<br>${esc(team.team_name)}</td><td>${esc(team.event_name || team.event_id)}</td><td>${esc(team.team_leader_registration_code || team.leader_registration_id || '-')}</td><td>${team.member_count || team.current_members || 0}/${team.max_members}</td><td><span class="badge">${esc(team.status)}</span></td><td><button type="button" onclick="viewDetails('team','${team.id}','Team details')">View</button></td></tr>`; }).join('') || '<tr><td colspan="6">No teams found for the selected event.</td></tr>';
}
if (error) rows.innerHTML = `<tr><td colspan="6">${esc(error.message)}</td></tr>`;
else { eventFilter.onchange = render; teamStatus.onchange = render; render(); }
