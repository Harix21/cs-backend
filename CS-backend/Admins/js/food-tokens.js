let pendingToken = null;
let busy = false;
function esc(value) { return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character])); }
function tokenFromQr(value) { try { const url = new URL(value, window.location.origin); return url.searchParams.get('token') || url.pathname.split('/').filter(Boolean).pop() || value.trim(); } catch { return value.trim(); } }
function showToken(data) {
  document.getElementById('tokenState').textContent = data.code;
  document.getElementById('tokenParticipant').innerHTML = `<div class="scan-status ${data.code === 'READY' ? 'scan-ok' : 'scan-existing'}">${esc(data.message)}</div><dl><dt>Registration</dt><dd>${esc(data.registration_code)}</dd><dt>Name</dt><dd>${esc(data.participant_name)}</dd><dt>Email</dt><dd>${esc(data.email)}</dd><dt>Phone</dt><dd>${esc(data.phone)}</dd><dt>College</dt><dd>${esc(data.college)}</dd><dt>Registration</dt><dd>${esc(data.selected_day)}</dd></dl>`;
  document.getElementById('issueToken').hidden = data.code !== 'READY';
  document.getElementById('tokenModal').hidden = false;
}
async function inspectToken(qrToken) {
  if (busy) return;
  busy = true;
  try { const { data, error } = await supabaseClient.rpc('inspect_food_token', { p_qr_token: qrToken }); if (error) throw error; if (!data?.success) throw new Error(data?.message || 'Unable to inspect QR.'); pendingToken = qrToken; showToken(data); } catch (error) { document.getElementById('message').textContent = error.message; } finally { busy = false; }
}
async function issueToken() {
  if (!pendingToken || busy) return;
  busy = true;
  try { const { data, error } = await supabaseClient.rpc('record_food_token', { p_qr_token: pendingToken }); if (error) throw error; document.getElementById('message').textContent = data.message; showToken(data); pendingToken = null; } catch (error) { document.getElementById('message').textContent = error.message; } finally { busy = false; }
}
document.getElementById('issueToken').onclick = issueToken;
document.getElementById('closeToken').onclick = () => { document.getElementById('tokenModal').hidden = true; pendingToken = null; };
document.getElementById('lookup').onclick = async () => { const code = document.getElementById('registrationId').value.trim(); if (!code) return; const { data, error } = await supabaseClient.from('registrations').select('qr_token').eq('registration_code', code.toUpperCase()).maybeSingle(); if (error || !data) { document.getElementById('message').textContent = error?.message || 'Registration not found.'; return; } inspectToken(data.qr_token); };
const scanner = new Html5QrcodeScanner('reader', { fps: 10, qrbox: 250 }, false); scanner.render(text => inspectToken(tokenFromQr(text)), () => {});
