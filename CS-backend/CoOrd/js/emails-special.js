import { supabase } from './supabase.js';

const eventSelect = document.querySelector('#event');
const sendAll = document.querySelector('#sendAll');
const recipients = document.querySelector('#recipients');
const sendButton = document.querySelector('#sendButton');
const result = document.querySelector('#result');
if (eventSelect && sendButton) {
  const { data: normalAssignments } = await supabase.from('event_coordinators').select('event_id,events(id,code,name)').eq('coordinator_user_id', (await supabase.auth.getSession()).data.session.user.id);
  const { data: specialAssignments } = await supabase.from('special_event_coordinators').select('special_event_id,special_events(id,code,name)').eq('coordinator_user_id', (await supabase.auth.getSession()).data.session.user.id);
  const normalEvents = (normalAssignments || []).map(row => row.events).filter(Boolean);
  const specialEvents = (specialAssignments || []).map(row => row.special_events).filter(Boolean);
  eventSelect.innerHTML = '<option value="">Select audience</option>' + normalEvents.map(event => `<option value="EVENT:${event.id}">${event.code} · ${event.name}</option>`).join('') + specialEvents.map(event => `<option value="SPECIAL:${event.id}">Special (${event.name})</option>`).join('');

  async function loadRecipients() {
    const [kind, id] = eventSelect.value.split(':');
    let registrations = [];
    if (kind === 'SPECIAL') {
      const { data } = await supabase.from('special_event_registrations').select('registrations(id,participants(name,email))').eq('special_event_id', id);
      registrations = (data || []).map(row => row.registrations).filter(Boolean);
    } else if (kind === 'EVENT') {
      const { data } = await supabase.from('event_registrations').select('registrations(id,participants(name,email))').eq('event_id', id);
      registrations = (data || []).map(row => row.registrations).filter(Boolean);
    }
    recipients.innerHTML = registrations.map(registration => `<label><input type="checkbox" value="${registration.id}" data-email="${registration.participants?.email || ''}"> ${registration.participants?.name || 'Participant'} · ${registration.participants?.email || ''}</label>`).join('') || '<p>No participants in this audience.</p>';
  }
  eventSelect.addEventListener('change', loadRecipients);
  const replacement = sendButton.cloneNode(true);
  sendButton.replaceWith(replacement);
  replacement.addEventListener('click', () => {
    const selected = [...recipients.querySelectorAll('input[type="checkbox"]:checked')];
    const targets = sendAll?.checked ? [...recipients.querySelectorAll('input[type="checkbox"]')] : selected;
    if (!targets.length) { result.textContent = 'Select at least one participant.'; return; }
    const url = new URL('https://mail.google.com/mail/');
    url.searchParams.set('view', 'cm');
    url.searchParams.set('fs', '1');
    url.searchParams.set('bcc', targets.map(input => input.dataset.email).filter(Boolean).join(','));
    url.searchParams.set('su', document.querySelector('#subject').value);
    url.searchParams.set('body', document.querySelector('#message').value);
    window.open(url.toString(), '_blank');
    result.textContent = 'Gmail compose opened with the selected audience.';
  });
}
