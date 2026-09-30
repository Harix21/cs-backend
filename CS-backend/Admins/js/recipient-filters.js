(() => {
  const recipients = document.querySelector('#recipients');
  if (!recipients) return;
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
      const textMatch = !query || label.textContent.toLowerCase().includes(query);
      const statusMatch = !status || item?.[status];
      label.hidden = !(textMatch && statusMatch);
      if (label.hidden && input) input.checked = false;
    });
  };
  const load = async () => {
    const emails = [...recipients.querySelectorAll('input')].map(input => input.dataset.email || input.value).filter(Boolean);
    if (!emails.length) return render();
    const { data } = await supabaseClient.from('registrations').select('id,participants(email),payments(status),attendance(status)');
    state.clear();
    (data || []).forEach(registration => {
      const email = registration.participants?.email;
      const payment = Array.isArray(registration.payments) ? registration.payments[0] : registration.payments;
      const attendance = registration.attendance || [];
      state.set(email, { verified: payment?.status === 'VERIFIED', present: attendance.some(item => item.status === 'PRESENT'), absent: !attendance.some(item => item.status === 'PRESENT') });
    });
    render();
  };
  const observer = new MutationObserver(load);
  observer.observe(recipients, { childList: true, subtree: true });
  document.querySelector('#recipientSearch').oninput = render;
  document.querySelector('#recipientStatus').onchange = render;
  load();
})();
