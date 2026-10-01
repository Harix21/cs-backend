import { supabase } from './supabase.js';

function initRecipientFilters() {
  const recipients = document.querySelector('#recipients');
  if (!recipients || recipients.dataset.filtersReady) return;
  recipients.dataset.filtersReady = 'true';
  const toolbar = document.createElement('div');
  toolbar.className = 'toolbar recipient-filters';
  toolbar.innerHTML = '<input id="recipientSearch" type="search" placeholder="Search recipients..."><select id="recipientStatus"><option value="">All recipients</option><option value="verified">Only verified</option><option value="present">Present</option><option value="absent">Absent</option></select>';
  recipients.before(toolbar);
  const state = new Map();
  const render = () => {
    const query = document.querySelector('#recipientSearch').value.toLowerCase().trim();
    const status = document.querySelector('#recipientStatus').value;
    recipients.querySelectorAll('label').forEach(label => {
      const input = label.querySelector('input');
      const item = state.get(input?.dataset.email || input?.value);
      label.hidden = !( (!query || label.textContent.toLowerCase().includes(query)) && (!status || item?.[status]) );
      if (label.hidden && input) input.checked = false;
    });
  };
  const load = async () => {
    const { data } = await supabase.from('registrations').select('id,participants(email),payments(status),attendance(status)');
    state.clear();
    (data || []).forEach(registration => {
      const email = registration.participants?.email;
      const payment = Array.isArray(registration.payments) ? registration.payments[0] : registration.payments;
      const attendance = registration.attendance || [];
      state.set(email || registration.id, { verified: payment?.status === 'VERIFIED', present: attendance.some(item => item.status === 'PRESENT'), absent: !attendance.some(item => item.status === 'PRESENT') });
    });
    render();
  };
  const observer = new MutationObserver(load);
  observer.observe(recipients, { childList: true, subtree: true });
  const markFilter = () => { window.recipientFilterActive = Boolean(document.querySelector('#recipientSearch').value.trim() || document.querySelector('#recipientStatus').value); render(); };
  document.querySelector('#recipientSearch').oninput = markFilter;
  document.querySelector('#recipientStatus').onchange = markFilter;
  load();
}

initRecipientFilters();
if (!document.querySelector('#recipients')) {
  const pageObserver = new MutationObserver(() => {
    initRecipientFilters();
    if (document.querySelector('#recipients')) pageObserver.disconnect();
  });
  pageObserver.observe(document.body, { childList: true, subtree: true });
}
