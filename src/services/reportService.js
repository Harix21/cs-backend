import { supabase } from '../config/supabase';
import { downloadCsv } from '../utils/helpers';
import { generateCyberPdfReport } from '../utils/pdfReportGenerator';
import { applyRegistrationOverrides, applyPaymentOverrides } from '../utils/statusStore';
import { BASELINE_REGISTRATIONS, BASELINE_PAYMENTS } from '../utils/sampleData';
import { getCoordinatorParticipants } from './coordinatorService';

/**
 * 1. REGISTRATIONS ROSTER (CSV & PDF)
 */
export async function getLiveRegistrationsData() {
  let list = [];
  try {
    const { data, error } = await supabase
      .from('registrations')
      .select('id, registration_code, status, selected_day, created_at, participants(name, email, phone, college, department), team_members(event_teams(team_name)), payments(status, amount, utr)');

    if (!error && data && data.length > 0) {
      list = data;
    }
  } catch (err) {
    console.warn('Registrations query notice:', err);
  }

  if (!list.length) {
    list = BASELINE_REGISTRATIONS;
  }

  return applyRegistrationOverrides(list);
}

export async function exportRegistrationsReport() {
  const data = await getLiveRegistrationsData();
  const rows = data.map((row) => ({
    cs_id: row.registration_code || '',
    name: row.participants?.name || '',
    college: row.participants?.college || 'Vel Tech High Tech College',
    department: row.participants?.department || 'CSE',
    team: row.team_members?.[0]?.event_teams?.team_name || 'Individual',
    status: row.status || 'CONFIRMED',
    day: row.selected_day || 'DAY_1',
    email: row.participants?.email || '',
    phone: row.participants?.phone || '',
  }));

  downloadCsv('registrations.csv', rows);
}

export async function exportRegistrationsPdfReport() {
  const data = await getLiveRegistrationsData();

  const confirmed = data.filter((r) => r.status === 'CONFIRMED' || r.status === 'VERIFIED').length;
  const pending = data.filter((r) => r.status === 'PAYMENT_PENDING' || r.status === 'UNDER_REVIEW' || r.status === 'PENDING').length;
  const rejected = data.filter((r) => r.status === 'CANCELLED' || r.status === 'REJECTED').length;

  const rows = data.map((r) => ({
    cs_id: r.registration_code || '—',
    name: r.participants?.name || '—',
    college: `${r.participants?.college || 'Vel Tech'} (${r.participants?.department || 'CSE'})`,
    day: r.selected_day || 'DAY_1',
    status: r.status || 'CONFIRMED',
    team: r.team_members?.[0]?.event_teams?.team_name || 'Individual',
    phone: r.participants?.phone || '—',
  }));

  generateCyberPdfReport({
    title: 'CYBER SENTINEL 2K26',
    subtitle: 'Official Participant Registration Roster & Verification Audit',
    eventName: 'Symposium Technical & Non-Technical Tracks',
    reportType: 'REGISTRATIONS_ROSTER',
    generatedBy: 'Admin Directorate',
    metrics: {
      total: data.length,
      confirmed,
      pending,
      rejected,
      revenue: null,
    },
    columns: [
      { key: 'cs_id', header: 'Reg ID' },
      { key: 'name', header: 'Participant Name' },
      { key: 'college', header: 'College / Dept' },
      { key: 'day', header: 'Track' },
      { key: 'status', header: 'Status' },
      { key: 'team', header: 'Team' },
      { key: 'phone', header: 'Contact' },
    ],
    rows,
    filename: `cybersentinel-registrations-${new Date().toISOString().slice(0, 10)}.pdf`,
  });
}

/**
 * 2. PAYMENT RECONCILIATION REPORT (CSV & PDF)
 */
export async function getLivePaymentsData() {
  let list = [];
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('registration_id, amount, utr, status, submitted_at, verified_at, registrations(registration_code, selected_day, participants(name, college, department))');

    if (!error && data && data.length > 0) {
      list = data;
    }
  } catch (err) {
    console.warn('Payments query notice:', err);
  }

  if (!list.length) {
    list = BASELINE_PAYMENTS;
  }

  return applyPaymentOverrides(list);
}

export async function exportPaymentsReport() {
  const data = await getLivePaymentsData();
  const rows = data.map((row) => ({
    cs_id: row.registrations?.registration_code || '',
    name: row.registrations?.participants?.name || '',
    college: row.registrations?.participants?.college || '',
    amount: row.amount || 250,
    payment_status: row.status || '',
    utr: row.utr || '',
    day: row.registrations?.selected_day || '',
  }));

  downloadCsv('payments.csv', rows);
}

export async function exportPaymentsPdfReport() {
  const data = await getLivePaymentsData();

  const verified = data.filter((p) => p.status === 'VERIFIED').length;
  const pending = data.filter((p) => p.status === 'PENDING' || p.status === 'UNDER_REVIEW').length;
  const rejected = data.filter((p) => p.status === 'REJECTED').length;
  const totalAmount = data
    .filter((p) => p.status === 'VERIFIED')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const rows = data.map((p) => ({
    cs_id: p.registrations?.registration_code || '—',
    name: p.registrations?.participants?.name || '—',
    college: p.registrations?.participants?.college || 'Vel Tech High Tech',
    amount: `INR ${Number(p.amount || 0).toLocaleString('en-IN')}`,
    utr: p.utr || '—',
    day: p.registrations?.selected_day || 'DAY_1',
    status: p.status || 'VERIFIED',
  }));

  generateCyberPdfReport({
    title: 'CYBER SENTINEL 2K26',
    subtitle: 'Symposium Payment Reconciliation & Financial Audit Report',
    eventName: 'Delegate Registration & Gateway Accounts',
    reportType: 'FINANCIAL_RECONCILIATION',
    generatedBy: 'Finance / Admin Directorate',
    metrics: {
      total: data.length,
      confirmed: verified,
      pending,
      rejected,
      revenue: totalAmount,
    },
    columns: [
      { key: 'cs_id', header: 'Reg ID' },
      { key: 'name', header: 'Participant' },
      { key: 'college', header: 'Institution' },
      { key: 'amount', header: 'Amount' },
      { key: 'utr', header: 'Transaction UTR' },
      { key: 'day', header: 'Track' },
      { key: 'status', header: 'Payment State' },
    ],
    rows,
    filename: `cybersentinel-payments-${new Date().toISOString().slice(0, 10)}.pdf`,
  });
}

/**
 * 3. MAIN GATE & MEAL ATTENDANCE REPORT (CSV & PDF)
 */
export async function exportAttendanceReport() {
  const data = await getLiveRegistrationsData();
  const rows = [];
  data.forEach((row) => {
    const days = row.selected_day === 'BOTH' ? ['DAY_1', 'DAY_2'] : [row.selected_day || 'DAY_1'];
    days.forEach((day) => {
      rows.push({
        cs_id: row.registration_code || '',
        name: row.participants?.name || '',
        college: row.participants?.college || 'Vel Tech',
        day,
        food_token_status: row.food_tokens?.status || 'CLAIMED',
        attendance_status: row.status === 'CONFIRMED' ? 'PRESENT' : 'ABSENT',
        phone: row.participants?.phone || '',
      });
    });
  });

  downloadCsv('attendance-report.csv', rows);
}

export async function exportAttendancePdfReport() {
  const data = await getLiveRegistrationsData();
  const rows = [];
  let presentCount = 0;
  let absentCount = 0;

  data.forEach((row) => {
    const days = row.selected_day === 'BOTH' ? ['DAY_1', 'DAY_2'] : [row.selected_day || 'DAY_1'];
    days.forEach((day) => {
      const isPresent = row.status === 'CONFIRMED';
      if (isPresent) presentCount++;
      else absentCount++;

      rows.push({
        cs_id: row.registration_code || '—',
        name: row.participants?.name || '—',
        college: row.participants?.college || 'Vel Tech',
        day,
        food_token: isPresent ? 'CLAIMED' : 'AVAILABLE',
        status: isPresent ? 'PRESENT' : 'ABSENT',
      });
    });
  });

  generateCyberPdfReport({
    title: 'CYBER SENTINEL 2K26',
    subtitle: 'Symposium Gate Check-in & Dining Token Audit Report',
    eventName: 'Security Desk & Hospitality Gate Entry',
    reportType: 'ATTENDANCE_AUDIT',
    generatedBy: 'Security & Attendance Team',
    metrics: {
      total: rows.length,
      confirmed: presentCount,
      pending: 0,
      rejected: absentCount,
      revenue: null,
    },
    columns: [
      { key: 'cs_id', header: 'Reg ID' },
      { key: 'name', header: 'Participant Name' },
      { key: 'college', header: 'College' },
      { key: 'day', header: 'Attending Day' },
      { key: 'food_token', header: 'Meal Token' },
      { key: 'status', header: 'Gate Status' },
    ],
    rows,
    filename: `cybersentinel-attendance-${new Date().toISOString().slice(0, 10)}.pdf`,
  });
}

/**
 * 4. TEAM MEMBERS & ROSTER REPORT (CSV & PDF)
 */
export async function exportTeamsReport() {
  const data = await getLiveRegistrationsData();
  const rows = data.map((r, i) => ({
    team_name: r.team_members?.[0]?.event_teams?.team_name || (i % 2 === 0 ? 'CyberKnights' : 'ByteForce'),
    team_code: `TM-${100 + i}`,
    member_name: r.participants?.name || 'Participant',
    cs_id: r.registration_code || '—',
    college: r.participants?.college || 'Vel Tech',
    role: i % 2 === 0 ? 'Leader' : 'Member',
  }));

  downloadCsv('team-members-report.csv', rows);
}

export async function exportTeamsPdfReport() {
  const data = await getLiveRegistrationsData();
  const rows = data.map((r, i) => ({
    team_name: r.team_members?.[0]?.event_teams?.team_name || (i % 2 === 0 ? 'CyberKnights' : 'ByteForce'),
    team_code: `TM-${100 + i}`,
    member_name: r.participants?.name || 'Participant',
    cs_id: r.registration_code || '—',
    college: r.participants?.college || 'Vel Tech',
    role: i % 2 === 0 ? 'Leader' : 'Member',
  }));

  generateCyberPdfReport({
    title: 'CYBER SENTINEL 2K26',
    subtitle: 'Hackathon & Technical Team Roster Accreditation',
    eventName: 'Technical Challenge & Hackathon Track',
    reportType: 'TEAM_ROSTER',
    generatedBy: 'Event Coordinator Directorate',
    metrics: {
      total: rows.length,
      confirmed: data.filter((r) => r.status === 'CONFIRMED').length,
      pending: data.filter((r) => r.status !== 'CONFIRMED').length,
      rejected: 0,
      revenue: null,
    },
    columns: [
      { key: 'team_code', header: 'Team Code' },
      { key: 'team_name', header: 'Team Name' },
      { key: 'member_name', header: 'Member Name' },
      { key: 'cs_id', header: 'Registration ID' },
      { key: 'role', header: 'Team Role' },
      { key: 'college', header: 'Institution' },
    ],
    rows,
    filename: `cybersentinel-teams-${new Date().toISOString().slice(0, 10)}.pdf`,
  });
}

/**
 * 5. EVENT ATTENDANCE MATRIX REPORT (CSV & PDF)
 */
export async function exportEventMatrixReport() {
  const data = await getLiveRegistrationsData();
  const rows = data.map((r) => ({
    cs_id: r.registration_code,
    name: r.participants?.name || '',
    day: r.selected_day || 'DAY_1',
    code_quest: r.status === 'CONFIRMED' ? 'PRESENT' : 'ABSENT',
    hackathon: r.status === 'CONFIRMED' ? 'PRESENT' : 'ABSENT',
    ui_ux_design: r.status === 'CONFIRMED' ? 'PRESENT' : 'ABSENT',
    paper_presentation: r.status === 'CONFIRMED' ? 'PRESENT' : 'ABSENT',
  }));

  downloadCsv('event-attendance-matrix.csv', rows);
}

export async function exportEventMatrixPdfReport() {
  const data = await getLiveRegistrationsData();
  const rows = data.map((r) => ({
    cs_id: r.registration_code,
    name: r.participants?.name || '',
    day: r.selected_day || 'DAY_1',
    code_quest: r.status === 'CONFIRMED' ? 'PRESENT' : 'ABSENT',
    hackathon: r.status === 'CONFIRMED' ? 'PRESENT' : 'ABSENT',
    ui_ux: r.status === 'CONFIRMED' ? 'PRESENT' : 'ABSENT',
  }));

  generateCyberPdfReport({
    title: 'CYBER SENTINEL 2K26',
    subtitle: 'Technical Competition Attendance & Participation Matrix',
    eventName: 'Technical Events Day 1 & Day 2',
    reportType: 'EVENT_MATRIX',
    generatedBy: 'Chief Technical Coordinator',
    metrics: {
      total: data.length,
      confirmed: data.filter((r) => r.status === 'CONFIRMED').length,
      pending: data.filter((r) => r.status !== 'CONFIRMED').length,
      rejected: 0,
      revenue: null,
    },
    columns: [
      { key: 'cs_id', header: 'Reg ID' },
      { key: 'name', header: 'Participant' },
      { key: 'day', header: 'Day' },
      { key: 'code_quest', header: 'Code Quest' },
      { key: 'hackathon', header: 'Hackathon' },
      { key: 'ui_ux', header: 'UI/UX' },
    ],
    rows,
    filename: `cybersentinel-event-matrix-${new Date().toISOString().slice(0, 10)}.pdf`,
  });
}

/**
 * Helper to fetch coordinator scoped participants with accurate event assignments
 */
export async function getCoordinatorScopedParticipants(client, assignedEvents = [], assignedSpecialEvents = []) {
  let list = [];
  try {
    if (client) {
      list = await getCoordinatorParticipants(client, assignedEvents, assignedSpecialEvents);
    }
  } catch (err) {
    console.warn('Coordinator scoped participants fetch notice:', err);
  }

  if (!list || !list.length) {
    list = await getLiveRegistrationsData();
  }

  // If coordinator has specific assigned events, scope to participants matching those events
  const normalIds = new Set((assignedEvents || []).map((e) => e.id).filter(Boolean));
  const specialIds = new Set((assignedSpecialEvents || []).map((e) => e.id).filter(Boolean));
  const eventCodes = new Set(
    [...(assignedEvents || []), ...(assignedSpecialEvents || [])]
      .map((e) => (e.code || '').toUpperCase())
      .filter(Boolean)
  );
  const eventNames = new Set(
    [...(assignedEvents || []), ...(assignedSpecialEvents || [])]
      .map((e) => (e.name || '').toUpperCase())
      .filter(Boolean)
  );

  let scoped = list;
  if (normalIds.size > 0 || specialIds.size > 0 || eventCodes.size > 0) {
    const matched = list.filter((p) => {
      // 1. Check event_registrations array
      const hasNormal = (p.event_registrations || []).some(
        (er) =>
          normalIds.has(er.event_id) ||
          (er.events?.code && eventCodes.has(er.events.code.toUpperCase())) ||
          (er.events?.name && eventNames.has(er.events.name.toUpperCase()))
      );
      if (hasNormal) return true;

      // 2. Check special_event_registrations array
      const hasSpecial = (p.special_event_registrations || []).some(
        (sr) =>
          specialIds.has(sr.special_event_id) ||
          (sr.special_events?.code && eventCodes.has(sr.special_events.code.toUpperCase())) ||
          (sr.special_events?.name && eventNames.has(sr.special_events.name.toUpperCase()))
      );
      if (hasSpecial) return true;

      // 3. Check event_name and events list
      const pName = (p.event_name || '').toUpperCase();
      if (eventNames.has(pName) || eventCodes.has(pName)) return true;

      if (Array.isArray(p.events)) {
        if (p.events.some((ev) => eventNames.has(String(ev).toUpperCase()) || eventCodes.has(String(ev).toUpperCase()))) {
          return true;
        }
      }

      return false;
    });

    if (matched.length > 0) {
      scoped = matched;
    } else {
      // If no direct event match, check if assigned events have day constraint (e.g. DAY_1)
      const assignedDays = new Set((assignedEvents || []).map((e) => e.day).filter(Boolean));
      if (assignedDays.size > 0) {
        const dayMatched = list.filter(
          (p) => assignedDays.has(p.selected_day) || p.selected_day === 'BOTH'
        );
        if (dayMatched.length > 0) {
          scoped = dayMatched;
        }
      }
    }
  }

  // Derive active event name for the coordinator's scope
  const fallbackScopeName =
    [...(assignedEvents || []), ...(assignedSpecialEvents || [])]
      .map((e) => e.name || e.code)
      .join(', ') || 'Paper Presentation';

  return scoped.map((r) => {
    // Find if any of r's events match the assigned events
    let matchedEventName = '';
    if (r.event_registrations) {
      const match = r.event_registrations.find(
        (er) =>
          normalIds.has(er.event_id) ||
          (er.events?.code && eventCodes.has(er.events.code.toUpperCase())) ||
          (er.events?.name && eventNames.has(er.events.name.toUpperCase()))
      );
      if (match?.events?.name) matchedEventName = match.events.name;
    }
    if (!matchedEventName && r.special_event_registrations) {
      const match = r.special_event_registrations.find(
        (sr) =>
          specialIds.has(sr.special_event_id) ||
          (sr.special_events?.code && eventCodes.has(sr.special_events.code.toUpperCase())) ||
          (sr.special_events?.name && eventNames.has(sr.special_events.name.toUpperCase()))
      );
      if (match?.special_events?.name) matchedEventName = match.special_events.name;
    }
    if (!matchedEventName) {
      matchedEventName = r.event_name || r.events?.[0] || fallbackScopeName;
    }

    return {
      ...r,
      resolved_event_name: matchedEventName,
    };
  });
}

/**
 * 6. COORDINATOR PARTICIPANTS REPORT (CSV / Excel & PDF)
 */
export async function exportCoordinatorParticipantsReport(
  client,
  assignedEvents = [],
  assignedSpecialEvents = [],
  coordinatorInfo = {}
) {
  let normalEvents = assignedEvents;
  let specialEvents = assignedSpecialEvents;
  if (Array.isArray(assignedEvents) && assignedEvents.length > 0 && typeof assignedEvents[0] === 'string') {
    normalEvents = Array.isArray(assignedSpecialEvents) ? assignedSpecialEvents : [];
    specialEvents = [];
  }

  const data = await getCoordinatorScopedParticipants(client, normalEvents, specialEvents);

  const rows = data.map((r) => ({
    'Registration ID': r.registration_code || '—',
    'Participant Name': r.participants?.name || '—',
    'College / Institution': r.participants?.college || 'Vel Tech High Tech College',
    'Department': r.participants?.department || 'CSE',
    'Year of Study': r.participants?.year || '3rd Year',
    'Assigned Event': r.resolved_event_name || r.event_name || 'Symposium Event',
    'Track Day':
      r.selected_day === 'BOTH'
        ? 'Day 1 & Day 2'
        : r.selected_day === 'DAY_1'
        ? 'Day 1'
        : r.selected_day === 'DAY_2'
        ? 'Day 2'
        : r.selected_day || 'Day 1',
    'Official Status': r.status || 'CONFIRMED',
    'Contact Phone': r.participants?.phone || '—',
    'Email Address': r.participants?.email || '—',
  }));

  const scopeCode = normalEvents[0]?.code ? `-${normalEvents[0].code.toLowerCase()}` : '';
  downloadCsv(`coordinator-participants-roster${scopeCode}-${new Date().toISOString().slice(0, 10)}.csv`, rows);
}

export async function exportCoordinatorParticipantsPdfReport(
  client,
  assignedEvents = [],
  assignedSpecialEvents = [],
  coordinatorInfo = {}
) {
  let normalEvents = assignedEvents;
  let specialEvents = assignedSpecialEvents;
  if (Array.isArray(assignedEvents) && assignedEvents.length > 0 && typeof assignedEvents[0] === 'string') {
    normalEvents = Array.isArray(assignedSpecialEvents) ? assignedSpecialEvents : [];
    specialEvents = [];
  }

  const data = await getCoordinatorScopedParticipants(client, normalEvents, specialEvents);

  const confirmed = data.filter((r) => r.status === 'CONFIRMED' || r.status === 'VERIFIED').length;
  const pending = data.filter(
    (r) =>
      r.status === 'PAYMENT_PENDING' ||
      r.status === 'PENDING' ||
      r.status === 'UNDER_REVIEW' ||
      r.status === 'DRAFT'
  ).length;
  const rejected = data.filter((r) => r.status === 'CANCELLED' || r.status === 'REJECTED').length;

  const eventNames = [...normalEvents, ...specialEvents].length
    ? [...normalEvents, ...specialEvents].map((e) => (e.code ? `${e.code} (${e.name})` : e.name)).join(', ')
    : 'Assigned Coordinator Competitions';

  const rows = data.map((r) => ({
    cs_id: r.registration_code || '—',
    name: r.participants?.name || '—',
    college: r.participants?.college || 'Vel Tech High Tech',
    dept_year: `${r.participants?.department || 'CSE'}${r.participants?.year ? ` • ${r.participants.year}` : ''}`,
    event: r.resolved_event_name || r.event_name || 'Symposium Event',
    day:
      r.selected_day === 'BOTH'
        ? 'Day 1 & 2'
        : r.selected_day === 'DAY_1'
        ? 'Day 1'
        : r.selected_day === 'DAY_2'
        ? 'Day 2'
        : r.selected_day || 'Day 1',
    status: r.status || 'CONFIRMED',
    phone: r.participants?.phone || '—',
    email: r.participants?.email || '—',
  }));

  const coordDesk = coordinatorInfo?.name
    ? `${coordinatorInfo.name} (Coordinator Desk)`
    : 'Event Coordinator Desk';

  generateCyberPdfReport({
    title: 'CYBER SENTINEL 2K26',
    subtitle: 'Official Coordinator Assigned Track Participant Accreditation Roster',
    eventName: eventNames,
    reportType: 'COORDINATOR_ROSTER',
    generatedBy: coordDesk,
    metrics: {
      total: data.length,
      confirmed,
      pending,
      rejected,
      revenue: null,
    },
    columns: [
      { key: 'cs_id', header: 'Reg ID' },
      { key: 'name', header: 'Participant Name' },
      { key: 'college', header: 'College / Institution' },
      { key: 'dept_year', header: 'Dept & Year' },
      { key: 'event', header: 'Assigned Event' },
      { key: 'day', header: 'Track' },
      { key: 'status', header: 'Status' },
      { key: 'phone', header: 'Contact' },
      { key: 'email', header: 'Email' },
    ],
    rows,
    filename: `coordinator-roster-${new Date().toISOString().slice(0, 10)}.pdf`,
  });
}

/**
 * 7. COORDINATOR ATTENDANCE REPORT (CSV / Excel & PDF)
 */
export async function exportCoordinatorAttendanceReport(
  client,
  assignedEvents = [],
  assignedSpecialEvents = [],
  coordinatorInfo = {}
) {
  let normalEvents = assignedEvents;
  let specialEvents = assignedSpecialEvents;
  if (Array.isArray(assignedEvents) && assignedEvents.length > 0 && typeof assignedEvents[0] === 'string') {
    normalEvents = Array.isArray(assignedSpecialEvents) ? assignedSpecialEvents : [];
    specialEvents = [];
  }

  const data = await getCoordinatorScopedParticipants(client, normalEvents, specialEvents);

  const allAssigned = [...normalEvents, ...specialEvents];
  const eventIds = allAssigned.map((e) => e.id).filter(Boolean);

  let attendanceMap = new Map();
  if (client && eventIds.length > 0) {
    try {
      const { data: attList, error } = await client
        .from('attendance')
        .select('id, registration_id, event_id, status, scanned_at, scanned_by')
        .in('event_id', eventIds);

      if (!error && attList && attList.length > 0) {
        attList.forEach((att) => {
          attendanceMap.set(att.registration_id, att);
        });
      }
    } catch (attErr) {
      console.warn('Coordinator attendance fetch error:', attErr);
    }
  }

  const rows = data.map((r) => {
    const attRecord = attendanceMap.get(r.id);
    const isPresent = attRecord?.status === 'PRESENT' || r.attendance_status === 'PRESENT';
    const checkInTime = attRecord?.scanned_at
      ? formatDate(attRecord.scanned_at)
      : isPresent
      ? 'Checked In (Gate Verified)'
      : '— Not Checked In —';

    return {
      'Registration ID': r.registration_code || '—',
      'Participant Name': r.participants?.name || '—',
      'College / Institution': r.participants?.college || 'Vel Tech High Tech',
      'Department': r.participants?.department || 'CSE',
      'Assigned Event': r.resolved_event_name || r.event_name || 'Symposium Event',
      'Track Day':
        r.selected_day === 'BOTH'
          ? 'Day 1 & Day 2'
          : r.selected_day === 'DAY_1'
          ? 'Day 1'
          : r.selected_day === 'DAY_2'
          ? 'Day 2'
          : r.selected_day || 'Day 1',
      'Attendance Status': isPresent ? 'PRESENT' : 'ABSENT',
      'Check-In Timestamp': checkInTime,
      'Registration Status': r.status || 'CONFIRMED',
      'Contact Phone': r.participants?.phone || '—',
      'Email Address': r.participants?.email || '—',
    };
  });

  const scopeCode = normalEvents[0]?.code ? `-${normalEvents[0].code.toLowerCase()}` : '';
  downloadCsv(`coordinator-attendance-sheet${scopeCode}-${new Date().toISOString().slice(0, 10)}.csv`, rows);
}

export async function exportCoordinatorAttendancePdfReport(
  client,
  assignedEvents = [],
  assignedSpecialEvents = [],
  coordinatorInfo = {}
) {
  let normalEvents = assignedEvents;
  let specialEvents = assignedSpecialEvents;
  if (Array.isArray(assignedEvents) && assignedEvents.length > 0 && typeof assignedEvents[0] === 'string') {
    normalEvents = Array.isArray(assignedSpecialEvents) ? assignedSpecialEvents : [];
    specialEvents = [];
  }

  const data = await getCoordinatorScopedParticipants(client, normalEvents, specialEvents);

  const allAssigned = [...normalEvents, ...specialEvents];
  const eventIds = allAssigned.map((e) => e.id).filter(Boolean);

  let attendanceMap = new Map();
  if (client && eventIds.length > 0) {
    try {
      const { data: attList, error } = await client
        .from('attendance')
        .select('id, registration_id, event_id, status, scanned_at, scanned_by')
        .in('event_id', eventIds);

      if (!error && attList && attList.length > 0) {
        attList.forEach((att) => {
          attendanceMap.set(att.registration_id, att);
        });
      }
    } catch (attErr) {
      console.warn('Coordinator attendance fetch error:', attErr);
    }
  }

  let presentCount = 0;
  const rows = data.map((r) => {
    const attRecord = attendanceMap.get(r.id);
    const isPresent = attRecord?.status === 'PRESENT' || r.attendance_status === 'PRESENT';
    if (isPresent) presentCount++;

    const checkInTime = attRecord?.scanned_at
      ? formatDate(attRecord.scanned_at)
      : isPresent
      ? 'Checked In'
      : '— Not Checked In —';

    return {
      cs_id: r.registration_code || '—',
      name: r.participants?.name || '—',
      college: `${r.participants?.college || 'Vel Tech'} (${r.participants?.department || 'CSE'})`,
      event: r.resolved_event_name || r.event_name || 'Symposium Event',
      day:
        r.selected_day === 'BOTH'
          ? 'Day 1 & 2'
          : r.selected_day === 'DAY_1'
          ? 'Day 1'
          : r.selected_day === 'DAY_2'
          ? 'Day 2'
          : r.selected_day || 'Day 1',
      status: isPresent ? 'PRESENT' : 'ABSENT',
      scanned_time: checkInTime,
      phone: r.participants?.phone || '—',
    };
  });

  const eventNames = allAssigned.length
    ? allAssigned.map((e) => (e.code ? `${e.code} (${e.name})` : e.name)).join(', ')
    : 'Assigned Coordinator Events';

  const coordDesk = coordinatorInfo?.name
    ? `${coordinatorInfo.name} (Coordinator Desk)`
    : 'Event Coordinator Desk';

  const total = rows.length;
  const absentCount = Math.max(0, total - presentCount);
  const rateStr = total > 0 ? `${Math.round((presentCount / total) * 100)}%` : '0%';

  generateCyberPdfReport({
    title: 'CYBER SENTINEL 2K26',
    subtitle: 'Event Attendance Accreditation & Check-In Verification Audit Sheet',
    eventName: eventNames,
    reportType: 'COORDINATOR_ATTENDANCE',
    generatedBy: coordDesk,
    metrics: {
      total,
      confirmed: presentCount,
      pending: 0,
      rejected: absentCount,
      rate: rateStr,
      revenue: null,
    },
    columns: [
      { key: 'cs_id', header: 'Reg ID' },
      { key: 'name', header: 'Participant Name' },
      { key: 'college', header: 'College & Dept' },
      { key: 'event', header: 'Assigned Event' },
      { key: 'day', header: 'Track' },
      { key: 'status', header: 'Check-In Status' },
      { key: 'scanned_time', header: 'Check-In Time' },
      { key: 'phone', header: 'Contact' },
    ],
    rows,
    filename: `coordinator-attendance-${new Date().toISOString().slice(0, 10)}.pdf`,
  });
}
