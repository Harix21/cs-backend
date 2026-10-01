import { supabase } from './supabase.js';
const { data: { session } } = await supabase.auth.getSession();
const { data: assignments } = await supabase.from('event_coordinators').select('event_id,events(id,code,name)').eq('coordinator_user_id', session.user.id);
const { data: specialAssignments } = await supabase.from('special_event_coordinators').select('special_event_id,special_events(id,code,name)').eq('coordinator_user_id', session.user.id);
const events = (assignments || []).map(row => row.events).filter(Boolean);
const specialEvents = (specialAssignments || []).map(row => row.special_events).filter(Boolean);
const eventSelect = document.querySelector('#event');
const recipientArea = document.createElement('div');
recipientArea.id = 'recipients';
eventSelect.closest('label')?.after(recipientArea);
eventSelect.innerHTML = '<option value="">All assigned participants</option>' + events.map(item => `<option value="EVENT:${item.id}">${item.code} · ${item.name}</option>`).join('') + specialEvents.map(item => `<option value="SPECIAL:${item.id}">Special (${item.name})</option>`).join('');
async function loadRecipients() {
  const selected = eventSelect.value;
  const [kind, selectedId] = selected.split(':');
  let access = [];
  if (kind === 'SPECIAL') access = (await supabase.from('special_event_registrations').select('registration_id').eq('special_event_id', selectedId)).data || [];
  else if (kind === 'EVENT') access = (await supabase.from('event_registrations').select('registration_id').eq('event_id', selectedId)).data || [];
  else {
    const normal = (await supabase.from('event_registrations').select('registration_id').in('event_id', events.map(item => item.id))).data || [];
    const special = (await supabase.from('special_event_registrations').select('registration_id').in('special_event_id', specialEvents.map(item => item.id))).data || [];
    access = [...normal, ...special];
  }
  const ids = [...new Set(access.map(row => row.registration_id))];
  const { data } = ids.length ? await supabase.from('registrations').select('id,participants(name,email)').in('id', ids) : { data: [] };
  recipientArea.innerHTML = (data || []).map(registration => `<label><input type="checkbox" value="${registration.id}" data-email="${registration.participants?.email || ''}"> ${registration.participants?.name || 'Participant'} · ${registration.participants?.email || ''}</label>`).join('') || '<p class="notice">No participants in this audience.</p>';
}
eventSelect.addEventListener('change', loadRecipients);
loadRecipients();
document.querySelector('#form').onsubmit = async event => {
  event.preventDefault();
  const selected = eventSelect.value;
  const [kind, selectedId] = selected.split(':');
  let access = [];
  if (kind === 'SPECIAL') {
    const response = await supabase.from('special_event_registrations').select('registration_id').eq('special_event_id', selectedId);
    access = response.data || [];
  } else if (kind === 'EVENT') {
    const response = await supabase.from('event_registrations').select('registration_id').eq('event_id', selectedId);
    access = response.data || [];
  } else {
    const response = await supabase.from('event_registrations').select('registration_id').in('event_id', events.map(item => item.id));
    access = response.data || [];
  }
  const selectedIds = [...document.querySelectorAll('#recipients label:not([hidden]) input:checked')].map(input => input.value);
  const visibleIds = [...document.querySelectorAll('#recipients label:not([hidden]) input')].map(input => input.value);
  const ids = window.recipientFilterActive ? visibleIds : selectedIds.length ? selectedIds : [...new Set((access || []).map(row => row.registration_id))];
  const { error } = await supabase.from('announcements').insert({ title: title.value, message: message.value, target_scope: kind === 'SPECIAL' ? 'SPECIAL' : kind === 'EVENT' ? 'EVENT' : 'ALL', target_event_id: kind === 'EVENT' ? selectedId : null, target_special_event_id: kind === 'SPECIAL' ? selectedId : null, created_by: session.user.id });
  if (error) { result.textContent = error.message; return; }
  const { data: recipients } = await supabase.from('registrations').select('participants(email)').in('id', ids);
  const u = new URL('https://mail.google.com/mail/');
  u.searchParams.set('view', 'cm'); u.searchParams.set('fs', '1');
  u.searchParams.set('bcc', (recipients || []).map(row => row.participants?.email).filter(Boolean).join(','));
  u.searchParams.set('su', title.value); u.searchParams.set('body', message.value);
  window.open(u, '_blank'); result.textContent = 'Announcement saved. Gmail compose opened; tap Send.';
};
