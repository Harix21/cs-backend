async function loadDashboard() {
  const [r, p] = await Promise.all([
    supabaseClient.from("admin_registration_summary").select("*").single(),
    supabaseClient.from("admin_payment_summary").select("*").single()
  ]);

  if (r.error || p.error) {
    document.getElementById("message").textContent =
      (r.error || p.error).message;
    return;
  }

  const x = r.data, y = p.data;
  document.getElementById("totalRegistrations").textContent = x.total_registrations;
  document.getElementById("day1").textContent = x.day_1_registrations;
  document.getElementById("day2").textContent = x.day_2_registrations;
  document.getElementById("bothDays").textContent = x.both_day_registrations;
  document.getElementById("confirmed").textContent = x.confirmed_registrations;
  document.getElementById("verifiedAmount").textContent =
    "₹" + Number(y.verified_amount).toLocaleString("en-IN", {minimumFractionDigits:2});
  document.getElementById("verifiedPayments").textContent = y.verified_payments;
  document.getElementById("pendingPayments").textContent = y.pending_payments;
  document.getElementById("reviewPayments").textContent = y.under_review_payments;
  document.getElementById("rejectedPayments").textContent = y.rejected_payments;
  document.getElementById("flaggedPayments").textContent = y.flagged_payments;
}
async function loadFees() {
  const { data, error } = await supabaseClient.rpc("get_registration_fees");
  if (error) { document.getElementById("feeMessage").textContent = error.message; return; }
  document.getElementById("day1Fee").value = Number(data?.DAY_1 || 0);
  document.getElementById("day2Fee").value = Number(data?.DAY_2 || 0);
}
async function saveFees() {
  const message = document.getElementById("feeMessage");
  for (const [day, id] of [["DAY_1", "day1Fee"], ["DAY_2", "day2Fee"]]) {
    const { error } = await supabaseClient.rpc("update_registration_fee", { p_day: day, p_amount: Number(document.getElementById(id).value || 0) });
    if (error) { message.textContent = error.message; return; }
  }
  message.textContent = "Registration fees updated.";
}
document.getElementById("saveFees")?.addEventListener("click", saveFees);
loadDashboard();
loadFees();
async function loadSpecialEvents() {
  const { data, error } = await supabaseClient.from('special_events').select('id,code,name,fee,status').order('code');
  const target = document.getElementById('specialEvents');
  if (error) { target.textContent = error.message; return; }
  target.innerHTML = (data || []).map(event => `<div><span>${event.code} · ${event.name}</span><b>₹${Number(event.fee).toFixed(2)}</b><button type="button" data-special-id="${event.id}">Save fee</button><input data-special-fee="${event.id}" type="number" min="0" step="0.01" value="${Number(event.fee)}"></div>`).join('') || '<div>No special events configured.</div>';
  target.querySelectorAll('[data-special-id]').forEach(button => button.addEventListener('click', async () => {
    const id = button.dataset.specialId;
    const fee = Number(target.querySelector(`[data-special-fee="${id}"]`).value || 0);
    const { error: updateError } = await supabaseClient.rpc('update_special_event_fee', { p_special_event_id: id, p_fee: fee });
    document.getElementById('specialMessage').textContent = updateError?.message || 'Special-event fee updated.';
    if (!updateError) loadSpecialEvents();
  }));
}
document.getElementById('addSpecialEvent')?.addEventListener('click', async () => {
  const { error } = await supabaseClient.rpc('create_special_event', { p_code: document.getElementById('specialCode').value, p_name: document.getElementById('specialName').value, p_fee: Number(document.getElementById('specialFee').value || 0) });
  document.getElementById('specialMessage').textContent = error?.message || 'Special event added.';
  if (!error) { document.getElementById('specialCode').value = ''; document.getElementById('specialName').value = ''; document.getElementById('specialFee').value = ''; loadSpecialEvents(); }
});
loadSpecialEvents();
