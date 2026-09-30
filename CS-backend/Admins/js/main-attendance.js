let scannerBusy = false;
let pendingScan = null;

function extractQrToken(value) {
  try {
    const url = new URL(value, window.location.origin);
    const queryToken = url.searchParams.get("token");
    if (queryToken) return queryToken;
    const parts = url.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] || value.trim();
  } catch {
    const match = value.trim().match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
    return match ? match[0] : value.trim();
  }
}

function showScanModal(data, state, title) {
  const modal = document.getElementById("scanModal");
  document.getElementById("scanState").textContent = state;
  document.getElementById("scanTitle").textContent = title;
  const participant = data.participant || {};
  const events = (data.events || []).map(event => `${esc(event.code)} - ${esc(event.name)}`).join("<br>") || "No event registrations found";
  document.getElementById("scanParticipant").innerHTML = `<div class="scan-status ${state === "VERIFIED" ? "scan-ok" : state === "ALREADY SCANNED" ? "scan-existing" : "scan-invalid"}">${esc(data.message || title)}</div><dl><dt>Name</dt><dd>${esc(participant.name || data.participant_name)}</dd><dt>Registration ID</dt><dd>${esc(data.registration_code)}</dd><dt>College</dt><dd>${esc(participant.college)}</dd><dt>Department / Year</dt><dd>${esc(participant.department)} / ${esc(participant.year)}</dd><dt>Registered events</dt><dd>${events}</dd></dl>`;
  document.getElementById("confirmAttendance").hidden = state !== "VERIFIED";
  modal.hidden = false;
}

async function inspectScan({ qrToken, registrationCode } = {}) {
  if (scannerBusy) return;
  scannerBusy = true;
  try {
    const day = document.getElementById("attendanceDay").value;
    const args = registrationCode ? { p_registration_code: registrationCode, p_day: day } : { p_qr_token: qrToken, p_day: day };
    const { data, error } = await supabaseClient.rpc(registrationCode ? "inspect_registration_attendance" : "inspect_attendance_scan", args);
    if (error) throw error;
    if (!data?.success) {
      showScanModal(data || { message: error?.message }, data?.code === "ALREADY_PRESENT" ? "ALREADY SCANNED" : "INVALID", data?.code === "ALREADY_PRESENT" ? "Already scanned" : "QR not valid");
      return;
    }
    pendingScan = { qrToken: qrToken || data.qr_token || null, registrationCode: data.registration_code };
    if (!pendingScan.qrToken) throw new Error("The participant QR token was not returned. Please scan the QR again.");
    scannerBusy = false;
    showScanModal(data, data.code === "ALREADY_PRESENT" ? "ALREADY SCANNED" : "VERIFIED", data.code === "ALREADY_PRESENT" ? "Already scanned" : "Participant verified");
    document.getElementById("scanMessage").textContent = data.message;
  } catch (error) {
    showScanModal({ message: error.message }, "INVALID", "QR not valid");
  } finally {
    setTimeout(() => { scannerBusy = false; }, 900);
  }
}

async function recordMainAttendance() {
  if (!pendingScan?.qrToken || scannerBusy) return;
  scannerBusy = true;
  const message = document.getElementById("scanMessage");
  const details = document.getElementById("scanDetails");
  try {
    const token = pendingScan.qrToken;
    const day = document.getElementById("attendanceDay").value;
    const { data, error } = await supabaseClient.rpc("record_main_attendance", {
      p_qr_token: token,
      p_day: day
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.message || "Attendance rejected.");

    message.textContent = data.message || "Attendance recorded.";
    details.innerHTML = `<strong>${esc(data.registration_code)}</strong><br>${esc(data.participant_name)}<br>${esc(data.day)}<br>${new Date(data.scanned_at).toLocaleString()}`;
    document.getElementById("scanModal").hidden = true;
    pendingScan = null;
  } catch (error) {
    message.textContent = "Scan rejected";
    details.textContent = error.message || "Unable to record attendance.";
  } finally {
    setTimeout(() => { scannerBusy = false; }, 900);
  }
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  }[character]));
}

const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
scanner.render(text => inspectScan({ qrToken: extractQrToken(text) }), () => {});
document.getElementById("confirmAttendance").onclick = recordMainAttendance;
document.getElementById("closeScanModal").onclick = () => { document.getElementById("scanModal").hidden = true; pendingScan = null; };
document.getElementById("lookupRegistration").onclick = () => {
  const code = document.getElementById("registrationId").value.trim();
  if (code) inspectScan({ registrationCode: code });
};
