import { supabase } from './supabase.js';

const elements = {
  eventFilter: document.querySelector('#eventFilter'),
  status: document.querySelector('#status'),
  search: document.querySelector('#search'),
  rows: document.querySelector('#rows'),
  message: document.querySelector('#paymentMessage'),
  refresh: document.querySelector('#refreshPayments')
};
elements.rows.closest('table')?.querySelector('thead tr')?.insertAdjacentHTML('beforeend', '<th>Details</th>');

let session;
let assignedEvents = [];
let assignedSpecialEvents = [];
let allowedRegistrationIds = new Set();
let allPayments = [];
const QR_VERIFY_BASE_URL = `${window.location.origin}/verify/qr/`;

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
}

function setMessage(text, type = '') {
  elements.message.textContent = text;
  elements.message.style.color = type === 'error' ? '#b42318' : type === 'success' ? '#166534' : '#1d4ed8';
}

function extractEvent(payment) {
  const day = payment.registrations?.selected_day || '';
  const special = payment.registrations?.special_event_registrations?.map(item => item.special_events).filter(Boolean) || [];
  const selected = elements.eventFilter.value;
  const specialMatch = special.find(event => (!selected || selected === `SPECIAL:${event.id}`) && assignedSpecialEvents.some(assigned => assigned.id === event.id));
  if (specialMatch) return { ...specialMatch, label: `Special (${specialMatch.name})`, special: true };
  return assignedEvents.find(event => (!selected || event.id === selected) && (day === 'BOTH' || day === event.day));
}

function render() {
  const query = elements.search.value.trim().toLowerCase();
  const selectedStatus = elements.status.value;
  const selectedEvent = elements.eventFilter.value;
  const filtered = allPayments.filter(payment => {
    if (!allowedRegistrationIds.has(payment.registration_id)) return false;
    const event = extractEvent(payment);
    const eventMatches = !selectedEvent || (event && event.id === selectedEvent);
    const text = `${payment.utr || ''} ${payment.registrations?.registration_code || ''} ${payment.registrations?.participants?.name || ''} ${payment.registrations?.participants?.email || ''}`.toLowerCase();
    return eventMatches && (!selectedStatus || payment.status === selectedStatus) && (!query || text.includes(query));
  });

  elements.rows.innerHTML = filtered.map(payment => {
    const event = extractEvent(payment);
    const registrationId = payment.registration_id;
    const detailId = `${registrationId}-${payment.submitted_at || ''}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    storeDetails('payment', detailId, payment);
    const action = payment.status === 'VERIFIED'
      ? `<span>Verified</span><button class="action-button" data-action="send" data-id="${esc(registrationId)}">Send confirmation</button>`
      : `<button class="action-button verify-button" data-action="verify" data-id="${esc(registrationId)}">Verify</button><button class="action-button reject-button" data-action="reject" data-id="${esc(registrationId)}">Reject</button>`;
    const actionCell = `<div class="payment-actions">${action}</div>`;
    const screenshot = payment.screenshot_url ? `<button type="button" class="image-preview-trigger" onclick="openImagePreview('${esc(payment.screenshot_url)}')"><img src="${esc(payment.screenshot_url)}" alt="Payment proof" style="width:110px;height:70px;object-fit:cover;border-radius:4px"></button>` : '—';
    return `<tr><td>${esc(payment.registrations?.registration_code)}</td><td>${esc(payment.registrations?.participants?.name)}<br>${esc(payment.registrations?.participants?.email)}</td><td class="wrap-text">${esc(payment.registrations?.participants?.college)}</td><td>${esc(event?.label || event?.code || 'Assigned event')}</td><td>${esc(event?.special ? 'SPECIAL' : payment.registrations?.selected_day)}</td><td>₹${Number(payment.amount || 0).toFixed(2)}</td><td class="wrap-text">${esc(payment.utr || '-')}</td><td>${screenshot}</td><td><span class="badge">${esc(payment.status)}</span></td><td>${actionCell}</td><td><button class="action-button" data-action="view" data-id="${esc(detailId)}">View</button></td></tr>`;
  }).join('') || '<tr><td colspan="11">No payment requests found for this event.</td></tr>';
}

async function loadPayments() {
  setMessage('Loading payment requests...', 'info');
  const { data, error } = await supabase
    .from('payments')
    .select('registration_id,amount,utr,status,screenshot_path,submitted_at,registrations(registration_code,selected_day,qr_token,participants(name,email,college,department),event_registrations(events(code,name)),special_event_registrations(special_events(id,code,name)))')
    .order('submitted_at', { ascending: false });
  if (error) {
    setMessage(error.message, 'error');
    elements.rows.innerHTML = `<tr><td colspan="9">${esc(error.message)}</td></tr>`;
    return;
  }
  allPayments = await Promise.all((data || []).map(async payment => {
    if (!payment.screenshot_path) return payment;
    const { data: signed } = await supabase.storage.from('payment-screenshots').createSignedUrl(payment.screenshot_path, 3600);
    return { ...payment, screenshot_url: signed?.signedUrl || '' };
  }));
  setMessage(`${allPayments.length} payment request(s) loaded.`, 'success');
  render();
}

async function verifyPayment(registrationId) {
  if (!window.confirm('Verify this payment?')) return;
  setMessage('Verifying payment...', 'info');
  const { error } = await supabase.rpc('confirm_registration', {
    p_registration_id: registrationId,
    p_verified_by: session.user.id
  });
  if (error) {
    setMessage(error.message, 'error');
    return;
  }
  setMessage('Payment verified and event access created.', 'success');
  await loadPayments();
}

async function rejectPayment(registrationId) {
  const reason = window.prompt('Rejection reason:');
  if (!reason?.trim()) return;
  setMessage('Rejecting payment...', 'info');
  const { error } = await supabase.rpc('reject_payment', {
    p_registration_id: registrationId,
    p_reason: reason.trim(),
    p_rejected_by: session.user.id
  });
  if (error) {
    setMessage(error.message, 'error');
    return;
  }
  setMessage('Payment rejected.', 'success');
  await loadPayments();
}

function sendPaymentConfirmation(registrationId) {
  const payment = allPayments.find(item => item.registration_id === registrationId);
  if (!payment || payment.status !== 'VERIFIED') { setMessage('Only verified payments can receive confirmation.', 'error'); return; }
  const registration = payment.registrations;
  const participant = registration.participants;
  const subject = `Cyber Sentinel registration confirmed - ${registration.registration_code}`;
  const body = `Dear ${participant.name},\n\nYour payment has been verified and your Cyber Sentinel registration is confirmed.\n\nRegistration ID: ${registration.registration_code}\nRegistered day: ${registration.selected_day}\nCollege: ${participant.college}\nDepartment: ${participant.department || 'Not provided'}\nPayment amount: ₹${Number(payment.amount || 0).toFixed(2)}\n\nYour QR pass: ${QR_VERIFY_BASE_URL}${registration.qr_token}\n\nPlease present this QR pass at the event entry desk.\n\nRegards,\nCyber Sentinel Team`;
  const url = new URL('https://mail.google.com/mail/'); url.searchParams.set('view', 'cm'); url.searchParams.set('fs', '1'); url.searchParams.set('to', participant.email); url.searchParams.set('su', subject); url.searchParams.set('body', body); window.open(url.toString(), '_blank');
}

elements.rows.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  const id = button.dataset.id;
  if (action === 'view') viewDetails('payment', id, 'Payment details');
  if (action === 'verify') verifyPayment(id);
  if (action === 'reject') rejectPayment(id);
  if (action === 'send') sendPaymentConfirmation(id);
});
elements.search.addEventListener('input', render);
elements.status.addEventListener('change', render);
elements.eventFilter.addEventListener('change', render);
elements.refresh.addEventListener('click', loadPayments);

const sessionResult = await supabase.auth.getSession();
session = sessionResult.data.session;
if (!session) {
  setMessage('Your coordinator session has expired. Please log in again.', 'error');
} else {
  const { data: assigned, error: assignedError } = await supabase
    .from('event_coordinators')
    .select('event_id,events(id,code,name,day)')
    .eq('coordinator_user_id', session.user.id);
  const { data: specialAssigned, error: specialAssignedError } = await supabase
    .from('special_event_coordinators')
    .select('special_event_id,special_events(id,code,name)')
    .eq('coordinator_user_id', session.user.id);
  if (assignedError || specialAssignedError) {
    setMessage((assignedError || specialAssignedError).message, 'error');
  } else {
    assignedEvents = (assigned || []).map(item => item.events).filter(Boolean);
    assignedSpecialEvents = (specialAssigned || []).map(item => item.special_events).filter(Boolean);
    const normalEventIds = assignedEvents.map(event => event.id);
    const specialEventIds = assignedSpecialEvents.map(event => event.id);
    const [{ data: normalAccess }, { data: specialAccess }] = await Promise.all([
      normalEventIds.length ? supabase.from('event_registrations').select('registration_id').in('event_id', normalEventIds) : Promise.resolve({ data: [] }),
      specialEventIds.length ? supabase.from('special_event_registrations').select('registration_id').in('special_event_id', specialEventIds) : Promise.resolve({ data: [] })
    ]);
    allowedRegistrationIds = new Set([...(normalAccess || []), ...(specialAccess || [])].map(row => row.registration_id));
    elements.eventFilter.innerHTML = '<option value="">All assigned events</option>' + assignedEvents
      .map(event => `<option value="${esc(event.id)}">${esc(event.code)} · ${esc(event.name)}</option>`).join('') + assignedSpecialEvents
      .map(event => `<option value="SPECIAL:${esc(event.id)}">Special (${esc(event.name)})</option>`).join('');
    await loadPayments();
  }
}
