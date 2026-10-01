const $ = selector => document.querySelector(selector);
const mode = document.body.dataset.teamMode;
const state = { identity: '', packages: { DAY_1: [], DAY_2: [] }, registration: null };
function esc(value) { return String(value ?? '').replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[character])); }
function message(text, type = 'error') { const box = $('#teamMessage'); box.className = `alert show ${type}`; box.textContent = text; showFeedback(type === 'success' ? (mode === 'create' ? 'Team created' : 'Team joined') : 'Team request failed', text, type); }
function selectedPackage() { return state.packages[$('#teamDay').value]?.find(item => item.id === $('#teamPackage').value); }
function renderPackages() {
  const day = $('#teamDay').value;
  const packages = state.packages[day] || [];
  $('#teamPackage').innerHTML = packages.map(item => `<option value="${esc(item.id)}">${item.events.map(event => esc(event.name)).join(' + ')} · ${item.size} members</option>`).join('') || '<option value="">No team packages on this day</option>';
  renderPackage();
}
function renderPackage() {
  const item = selectedPackage();
  $('#packageNote').textContent = item ? `This team is applicable only for: ${item.events.map(event => event.name).join(' and ')}. Exactly ${item.size} members are required.` : 'Select a day and team package.';
  if (mode !== 'create') return;
  const count = item?.size || 0;
  $('#memberFields').innerHTML = count > 1 ? `<h3>Other verified members (${count - 1})</h3>${Array.from({ length: count - 1 }, (_, index) => `<div class="member-input"><label>Member ${index + 2} email or Registration ID</label><input class="member-identity" placeholder="Email or Registration ID"></div>`).join('')}` : '';
}
async function request(body) {
  const response = await fetch(`${CS_CONFIG.SUPABASE_URL}/functions/v1/team-management`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${CS_CONFIG.SUPABASE_ANON_KEY}` }, body: JSON.stringify(body) });
  const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Team request failed.'); return data;
}
async function verifyMember() {
  const identity = $('#identity').value.trim(); if (!identity) return message('Enter a registered email or Registration ID.');
  const button = $('#verifyBtn'); button.disabled = true; button.textContent = 'Verifying...';
  try {
    const data = await request({ action: 'verify', identity });
    state.identity = identity; state.registration = data.registration; state.packages = data.packages;
    $('#memberStatus').innerHTML = `<strong>${esc(data.registration.participant_name)}</strong> · Registration ${esc(data.registration.registration_code)} · Payment verified`;
    $('#teamForm').hidden = false; $('#teamForm').classList.remove('hidden'); $('#teamDay').value = data.registration.selected_day === 'BOTH' ? '' : data.registration.selected_day; $('#teamPackage').innerHTML = '<option value="">Select a day first</option>'; message('Member verified. Select a day and package.', 'success');
  } catch (error) { message(error.message); } finally { button.disabled = false; button.textContent = 'Verify member'; }
}
async function submitTeam() {
  const item = selectedPackage(); if (!item) return message('Select a valid day and event team package.');
  const members = Array.from(document.querySelectorAll('.member-identity')).map(input => input.value.trim());
  if (mode === 'create' && members.some(value => !value)) return message(`Enter all ${item.size - 1} other team members.`);
  const button = $('#submitTeam'); button.disabled = true; button.textContent = mode === 'create' ? 'Checking members...' : 'Joining...';
  try {
    if (mode === 'create') {
      const selectedDay = $('#teamDay').value;
      const registrations = await Promise.all([state.identity, ...members].map(identity => request({ action: 'verify', identity })));
      const ineligible = registrations.find(data => data.registration.selected_day !== 'BOTH' && data.registration.selected_day !== selectedDay);
      if (ineligible) throw new Error(`${ineligible.registration.participant_name} is not registered for ${selectedDay.replace('_', ' ')}.`);
    }
    const data = await request({ action: mode, identity: state.identity, members, day: $('#teamDay').value, package_id: item.id, team_name: $('#teamName')?.value.trim(), team_code: $('#teamCode')?.value.trim() });
    message(data.message, 'success'); if (data.team?.team_code) $('#packageNote').textContent = `Team created. Share this code with your members: ${data.team.team_code}`;
  } catch (error) { message(error.message); } finally { button.disabled = false; button.textContent = mode === 'create' ? 'Create team' : 'Join team'; }
}
async function loadTeams() {
  const item = selectedPackage(); if (!item) { $('#teamResults').innerHTML = ''; return; }
  try {
    const data = await request({ action: 'list', identity: state.identity, day: $('#teamDay').value, package_id: item.id, search: $('#teamSearch')?.value.trim() });
    $('#teamResults').innerHTML = data.teams.length ? data.teams.map(team => `<article class="team-result"><div><h3>${esc(team.team_name)}</h3><p class="notice">Code: ${esc(team.team_code)} · Leader: ${esc(team.leader_name)} · ${team.member_count}/${team.max_members} members</p></div><span class="status ${team.full ? 'rejected' : 'verified'}">${team.full ? 'Full' : 'Open'}</span></article>`).join('') : '<p class="notice">No teams found for this package.</p>';
  } catch (error) { message(error.message); }
}
$('#verifyBtn').onclick = verifyMember;
$('#submitTeam').onclick = submitTeam;
$('#teamDay').onchange = () => { renderPackages(); if (mode === 'join') loadTeams(); };
$('#teamPackage').onchange = () => { renderPackage(); if (mode === 'join') loadTeams(); };
$('#teamSearch')?.addEventListener('input', loadTeams);
