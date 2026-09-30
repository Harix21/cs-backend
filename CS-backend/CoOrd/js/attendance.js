import { supabase } from './supabase.js';

const { data: sessionData } = await supabase.auth.getSession();
const session = sessionData.session;
const eventSelect = document.querySelector('#eventSelect');
const reader = document.querySelector('#reader');
const scanResult = document.querySelector('#scanResult');
const rows = document.querySelector('#rows');
rows.closest('table')?.querySelector('thead tr')?.insertAdjacentHTML('beforeend', '<th>Scanned By</th>');
rows.closest('table')?.querySelector('thead tr')?.insertAdjacentHTML('beforeend', '<th>Details</th>');
let scanner;
let scannerBusy = false;
let pendingScan = null;

function qrToken(text) {
  try {
    const url = new URL(text, window.location.origin);
    const token = url.searchParams.get('token');
    if (token) return token;
    const parts = url.pathname.split('/').filter(Boolean);
    return parts[parts.length - 1] || text.trim();
  } catch {
    const match = text.trim().match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
    return match ? match[0] : text.trim();
  }
}

function showRowsMessage(message) {
  rows.innerHTML = `<tr><td colspan="6">${escapeHtml(message)}</td></tr>`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
}

async function load() {
  if (!eventSelect.value) {
    showRowsMessage('Select an event to view attendance.');
    return;
  }
  const { data, error } = await supabase
    .from('attendance')
    .select('registration_id,scanned_at,status,scanned_by,registrations(registration_code,participants(name)),profiles:scanned_by(email)')
    .eq('event_id', eventSelect.value)
    .order('scanned_at', { ascending: false })
    .limit(50);
  if (error) {
    showRowsMessage(error.message);
    return;
  }
  const staffIds = [...new Set((data || []).map(record => record.scanned_by).filter(Boolean))];
  const { data: staff } = staffIds.length ? await supabase.rpc('lookup_staff_emails', { p_ids: staffIds }) : { data: [] };
  const staffEmails = new Map((staff || []).map(profile => [profile.id, profile.email]));
  rows.innerHTML = (data || []).map(record => { const detailId = `${record.registration_id}-${record.scanned_at}`; const scannedBy = staffEmails.get(record.scanned_by) || record.scanned_by || '—'; storeDetails('attendance', detailId, { ...record, scanned_by_email: scannedBy }); return `<tr><td>${escapeHtml(record.registrations?.registration_code || record.registration_id)}</td><td>${escapeHtml(record.registrations?.participants?.name)}</td><td>${new Date(record.scanned_at).toLocaleString()}</td><td>${escapeHtml(record.status)}</td><td class="wrap-text">${escapeHtml(scannedBy)}</td><td><button onclick="viewDetails('attendance','${detailId}','Attendance details')">View</button></td></tr>`; }).join('') || '<tr><td colspan="6">No attendance records for this event.</td></tr>';
}

async function startScanner() {
  if (scanner) {
    try { await scanner.stop(); } catch {}
    scanner = null;
  }
  if (!eventSelect.value) {
    reader.innerHTML = '';
    scanResult.textContent = 'Select an event before scanning.';
    await load();
    return;
  }
  scanner = new Html5Qrcode('reader');
  scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: 250 }, text => inspectScan({ qrToken: qrToken(text) })).catch(error => {
    scanResult.textContent = error.message || 'Unable to start camera scanner.';
  });
  await load();
}

function setupAttendanceMethods() {
  eventSelect.style.display = 'none';
  reader.hidden = false;
  const scannerCard = reader.closest('.scanner');
  const heading = scannerCard?.querySelector('h2');
  if (heading) heading.textContent = 'Event Attendance';
  if (document.querySelector('#attendanceMethods')) return;
  const controls = document.createElement('div');
  controls.id = 'attendanceMethods';
  eventSelect.insertAdjacentElement('afterend', controls);
  const manual = document.createElement('div');
  manual.id = 'manualEntry';
  manual.className = 'attendance-manual';
  manual.hidden = false;
  manual.innerHTML = '<input id="registrationId" placeholder="CS-1256"><button id="lookupRegistration" type="button">Find participant</button>';
  reader.insertAdjacentElement('beforebegin', manual);
  document.querySelector('#lookupRegistration').onclick = () => { const code = document.querySelector('#registrationId').value.trim(); if (code) inspectScan({ registrationCode: code }); };
}

function ensureScanModal() {
  if (document.querySelector('#scanModal')) return;
  setupAttendanceMethods();
  document.body.insertAdjacentHTML('beforeend', '<div id="scanModal" class="scan-modal" hidden><div class="scan-modal-box"><div class="scan-modal-head"><div><small id="scanState">SCAN RESULT</small><h2 id="scanTitle">Participant details</h2></div><button id="closeScanModal" type="button">Close</button></div><div id="scanParticipant" class="scan-participant"></div><div class="scan-modal-actions"><button id="confirmAttendance" type="button">Mark event attendance</button></div></div></div>');
  document.querySelector('#confirmAttendance').addEventListener('click', recordAttendance);
  document.querySelector('#closeScanModal').addEventListener('click', () => { document.querySelector('#scanModal').hidden = true; pendingScan = null; });
}

function showScanModal(data, state, title) {
  const participant = data.participant || {};
  const events = (data.events || []).map(event => `${escapeHtml(event.code)} - ${escapeHtml(event.name)}`).join('<br>') || 'No event registrations found';
  document.querySelector('#scanState').textContent = state;
  document.querySelector('#scanTitle').textContent = title;
  document.querySelector('#scanParticipant').innerHTML = `<div class="scan-status ${state === 'VERIFIED' ? 'scan-ok' : state === 'ALREADY SCANNED' ? 'scan-existing' : 'scan-invalid'}">${escapeHtml(data.message || title)}</div><dl><dt>Name</dt><dd>${escapeHtml(participant.name || data.participant_name)}</dd><dt>Registration ID</dt><dd>${escapeHtml(data.registration_code)}</dd><dt>College</dt><dd>${escapeHtml(participant.college)}</dd><dt>Department / Year</dt><dd>${escapeHtml(participant.department)} / ${escapeHtml(participant.year)}</dd><dt>Eligible events</dt><dd>${events}</dd></dl>`;
  const confirmButton = document.querySelector('#confirmAttendance');
  confirmButton.hidden = state !== 'VERIFIED';
  confirmButton.disabled = state !== 'VERIFIED' || !pendingScan?.qrToken;
  document.querySelector('#scanModal').hidden = false;
}

async function inspectScan({ qrToken: token, registrationCode } = {}) {
  if (scannerBusy || !eventSelect.value) return;
  scannerBusy = true;
  try {
    let qrToken = token;
    if (registrationCode) {
      const { data: registration, error: registrationError } = await supabase.from('registrations').select('qr_token').eq('registration_code', registrationCode.toUpperCase()).maybeSingle();
      if (registrationError || !registration) throw registrationError || new Error('Registration ID was not found.');
      qrToken = registration.qr_token;
    }
    const { data, error } = await supabase.rpc('inspect_coordinator_event_attendance', { p_qr_token: qrToken, p_event_id: eventSelect.value });
    if (error) throw error;
    if (!data?.success) {
      showScanModal(data || { message: error.message }, data?.code === 'ALREADY_PRESENT' ? 'ALREADY SCANNED' : 'INVALID', data?.code === 'ALREADY_PRESENT' ? 'Already scanned' : 'QR not valid');
      return;
    }
    pendingScan = { qrToken: qrToken || data.qr_token || null, registrationCode: data.registration_code || null };
    if (!pendingScan.qrToken) throw new Error('The participant QR token was not returned. Please scan the QR again.');
    scannerBusy = false;
    showScanModal(data, data.code === 'ALREADY_PRESENT' ? 'ALREADY SCANNED' : 'VERIFIED', data.code === 'ALREADY_PRESENT' ? 'Already scanned' : 'Participant verified');
    scanResult.textContent = data.message;
  } catch (error) {
    showScanModal({ message: error.message }, 'INVALID', 'QR not valid');
  } finally {
    setTimeout(() => { scannerBusy = false; }, 900);
  }
}

async function recordAttendance() {
  if (!pendingScan?.qrToken || scannerBusy) return;
  scannerBusy = true;
  try {
    const { data, error } = await supabase.rpc('record_coordinator_event_attendance', { p_qr_token: pendingScan.qrToken, p_event_id: eventSelect.value });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.message || 'Attendance was not recorded.');
    scanResult.textContent = data.message || 'Attendance processed';
    document.querySelector('#scanModal').hidden = true;
    pendingScan = null;
    await load();
  } catch (error) {
    scanResult.textContent = error.message || 'Unable to mark attendance.';
    const state = document.querySelector('#scanState');
    const participant = document.querySelector('#scanParticipant');
    if (state) state.textContent = 'ERROR';
    if (participant) participant.insertAdjacentHTML('afterbegin', `<div class="scan-status scan-invalid">${escapeHtml(error.message || 'Unable to mark attendance.')}</div>`);
  } finally {
    scannerBusy = false;
  }
}

if (!session) {
  scanResult.textContent = 'Coordinator session expired. Please log in again.';
} else {
  const { data, error } = await supabase
    .from('event_coordinators')
    .select('event_id,events(id,code,name)')
    .eq('coordinator_user_id', session.user.id);
  if (error) {
    scanResult.textContent = error.message;
  } else {
    ensureScanModal();
    const events = (data || []).map(item => item.events).filter(Boolean);
    eventSelect.innerHTML = '<option value="">Select event</option>' + events
      .map(event => `<option value="${escapeHtml(event.id)}">${escapeHtml(event.code)} · ${escapeHtml(event.name)}</option>`).join('');
    eventSelect.value = events[0]?.id || '';
    const assignedLabel = document.querySelector('#assignedEvent') || document.createElement('p');
    assignedLabel.id = 'assignedEvent';
    assignedLabel.className = 'badge';
    assignedLabel.textContent = events[0] ? `${events[0].code} · ${events[0].name}` : 'No assigned event';
    if (!assignedLabel.parentElement) eventSelect.insertAdjacentElement('beforebegin', assignedLabel);
    setupAttendanceMethods();
    scanner = new Html5QrcodeScanner('reader', { fps: 10, qrbox: { width: 250, height: 250 } }, false);
    scanner.render(text => inspectScan({ qrToken: qrToken(text) }), () => {});
    await load();
  }
}
