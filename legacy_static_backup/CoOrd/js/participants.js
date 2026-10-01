import { supabase } from './supabase.js';
const { data: { session } } = await supabase.auth.getSession();
const eventFilter = document.querySelector('#eventFilter');
const search = document.querySelector('#search');
const rows = document.querySelector('#rows');
rows.closest('table')?.querySelector('thead tr')?.insertAdjacentHTML('beforeend', '<th>Details</th>');
const { data: assignments } = await supabase.from('event_coordinators').select('event_id,events(id,code,name,day)').eq('coordinator_user_id', session.user.id);
const { data: specialAssignments } = await supabase.from('special_event_coordinators').select('special_event_id,special_events(id,code,name)').eq('coordinator_user_id', session.user.id);
const events = (assignments || []).map(item => item.events).filter(Boolean);
const specialEvents = (specialAssignments || []).map(item => item.special_events).filter(Boolean);
eventFilter.innerHTML = '<option value="">All assigned events</option>' + events.map(event => `<option value="${event.id}">${event.code} · ${event.name}</option>`).join('') + specialEvents.map(event => `<option value="SPECIAL:${event.id}">Special (${event.name})</option>`).join('');
const normalEventIds = events.map(event => event.id);
const specialEventIds = specialEvents.map(event => event.id);
const [{ data: normalAccess }, { data: specialAccess }] = await Promise.all([
  normalEventIds.length ? supabase.from('event_registrations').select('registration_id').in('event_id', normalEventIds) : Promise.resolve({ data: [] }),
  specialEventIds.length ? supabase.from('special_event_registrations').select('registration_id').in('special_event_id', specialEventIds) : Promise.resolve({ data: [] })
]);
const allowedRegistrationIds = new Set([...(normalAccess || []), ...(specialAccess || [])].map(row => row.registration_id));
const assignedDays = new Set(events.map(event => event.day));
const { data: dayRegistrations } = assignedDays.size ? await supabase.from('registrations').select('id').or([...assignedDays].map(day => `selected_day.eq.${day}`).concat('selected_day.eq.BOTH').join(',')).order('created_at', { ascending: false }) : { data: [] };
const visibleRegistrationIds = new Set([...(dayRegistrations || []).map(row => row.id), ...allowedRegistrationIds]);
const { data, error } = await supabase.from('registrations').select('id,registration_code,selected_day,status,participants(name,email,college,department,phone,year),event_registrations(event_id),special_event_registrations(special_event_id,special_events(id,code,name))').in('id', [...visibleRegistrationIds]).order('created_at', { ascending: false });
const all = data || [];
function esc(value) { return String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character])); }
function render() {
  const query = search.value.toLowerCase();
  const eventId = eventFilter.value;
  const filtered = all.filter(registration => {
    const participant = registration.participants || {};
    const specialMatch = registration.special_event_registrations?.some(item => eventId === `SPECIAL:${item.special_event_id}` && specialEvents.some(event => event.id === item.special_event_id));
    const normalMatch = registration.event_registrations?.some(item => item.event_id === eventId && events.some(event => event.id === item.event_id));
    const dayMatch = registration.selected_day === 'BOTH' || events.some(event => event.day === registration.selected_day);
    const assignedMatch = dayMatch || registration.event_registrations?.some(item => events.some(event => event.id === item.event_id)) || registration.special_event_registrations?.some(item => specialEvents.some(event => event.id === item.special_event_id));
    return (!eventId ? assignedMatch : specialMatch || normalMatch || (eventId.startsWith('SPECIAL:') && specialEvents.some(event => event.id === eventId.slice(8)) && registration.selected_day === 'SPECIAL')) && (!query || `${registration.registration_code} ${participant.name} ${participant.email}`.toLowerCase().includes(query));
  });
  rows.innerHTML = filtered.map(registration => {
    const participant = registration.participants || {};
    storeDetails('participant', registration.id, { registration, participant });
    const specialLabel = (registration.special_event_registrations || []).map(item => `Special (${item.special_events?.name || item.special_events?.code || ''})`).join(', ');
    return `<tr><td>${esc(registration.registration_code)}</td><td>${esc(participant.name)}<br>${esc(participant.email)}</td><td class="wrap-text">${esc(participant.college)}</td><td>${esc(specialLabel || registration.selected_day)}</td><td><span class="badge">${esc(registration.status)}</span></td><td><button onclick="viewDetails('participant','${registration.id}','Participant details')">View</button></td></tr>`;
  }).join('') || '<tr><td colspan="6">No participants found for the selected event.</td></tr>';
}
if (error) rows.innerHTML = `<tr><td colspan="6">${esc(error.message)}</td></tr>`;
else { search.oninput = render; eventFilter.onchange = render; render(); }
