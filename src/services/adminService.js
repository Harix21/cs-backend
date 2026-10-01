import { supabase } from '../config/supabase';
import {
  saveStatusOverride,
  applyRegistrationOverrides,
  applyPaymentOverrides,
  applySummaryOverrides,
} from '../utils/statusStore';
import { BASELINE_REGISTRATIONS, BASELINE_PAYMENTS } from '../utils/sampleData';

// Dashboard metrics
export async function getDashboardSummary() {
  let regData = null;
  let payData = null;

  try {
    const [regRes, payRes] = await Promise.all([
      supabase.from('admin_registration_summary').select('*').single(),
      supabase.from('admin_payment_summary').select('*').single(),
    ]);

    if (!regRes.error && regRes.data) regData = regRes.data;
    if (!payRes.error && payRes.data) payData = payRes.data;
  } catch (err) {
    console.warn('Could not query admin summary views:', err);
  }

  // Fallback baseline counts if views unavailable
  if (!regData) {
    regData = {
      total_registrations: BASELINE_REGISTRATIONS.length,
      day_1_registrations: BASELINE_REGISTRATIONS.filter((r) => r.selected_day === 'DAY_1').length,
      day_2_registrations: BASELINE_REGISTRATIONS.filter((r) => r.selected_day === 'DAY_2').length,
      both_day_registrations: BASELINE_REGISTRATIONS.filter((r) => r.selected_day === 'BOTH').length,
      confirmed_registrations: BASELINE_REGISTRATIONS.filter((r) => r.status === 'CONFIRMED' || r.status === 'VERIFIED').length,
      payment_pending: BASELINE_REGISTRATIONS.filter((r) => r.status === 'PAYMENT_PENDING' || r.status === 'PENDING').length,
      cancelled_registrations: BASELINE_REGISTRATIONS.filter((r) => r.status === 'CANCELLED' || r.status === 'REJECTED').length,
    };
  }

  if (!payData) {
    payData = {
      total_payments: BASELINE_PAYMENTS.length,
      verified_payments: BASELINE_PAYMENTS.filter((p) => p.status === 'VERIFIED').length,
      pending_payments: BASELINE_PAYMENTS.filter((p) => p.status === 'PENDING').length,
      under_review_payments: BASELINE_PAYMENTS.filter((p) => p.status === 'UNDER_REVIEW').length,
      rejected_payments: BASELINE_PAYMENTS.filter((p) => p.status === 'REJECTED').length,
      flagged_payments: 0,
      verified_amount: BASELINE_PAYMENTS.filter((p) => p.status === 'VERIFIED').reduce((acc, p) => acc + Number(p.amount || 0), 0),
    };
  }

  // Apply real-time local status overrides
  const adjusted = applySummaryOverrides(regData, payData);

  return {
    registrationSummary: adjusted.regSummary,
    paymentSummary: adjusted.paySummary,
  };
}

// Dashboard charts use live registrations merged with persistent overrides
export async function getDashboardRegistrations() {
  let list = [];
  try {
    const { data, error } = await supabase
      .from('registrations')
      .select(
        'id, registration_code, selected_day, status, created_at, payments(status), event_registrations(event_id, active, events(id, code, name, day, event_type)), special_event_registrations(special_event_id, special_events(id, code, name))'
      )
      .order('created_at', { ascending: true });

    if (!error && data && data.length > 0) {
      list = data;
    }
  } catch (err) {
    console.warn('Dashboard registrations fetch warning:', err);
  }

  if (!list.length) {
    list = BASELINE_REGISTRATIONS;
  }

  return applyRegistrationOverrides(list);
}

// Fee Management
export async function getAdminRegistrationFees() {
  const { data, error } = await supabase.rpc('get_registration_fees');
  if (error) throw error;
  return {
    DAY_1: Number(data?.DAY_1 || 0),
    DAY_2: Number(data?.DAY_2 || 0),
  };
}

export async function updateAdminRegistrationFee(day, amount) {
  const { error } = await supabase.rpc('update_registration_fee', {
    p_day: day,
    p_amount: Number(amount || 0),
  });
  if (error) throw error;
}

// Special Events
export async function getAdminSpecialEvents() {
  const { data, error } = await supabase
    .from('special_events')
    .select('id, code, name, fee, status')
    .order('code');
  if (error) throw error;
  return data || [];
}

export async function createAdminSpecialEvent(code, name, fee) {
  const { error } = await supabase.rpc('create_special_event', {
    p_code: code.trim(),
    p_name: name.trim(),
    p_fee: Number(fee || 0),
  });
  if (error) throw error;
}

export async function updateAdminSpecialEventFee(specialEventId, fee) {
  const { error } = await supabase.rpc('update_special_event_fee', {
    p_special_event_id: specialEventId,
    p_fee: Number(fee || 0),
  });
  if (error) throw error;
}

// Registrations
export async function getRegistrations() {
  let list = [];
  try {
    const { data, error } = await supabase
      .from('registrations')
      .select(
        'id, registration_code, selected_day, status, created_at, qr_token, participants(name, college, department, phone, email, year), event_registrations(event_id, active, events(id, code, name, day, event_type)), special_event_registrations(special_event_id, special_events(id, code, name))'
      )
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      list = data;
    }
  } catch (err) {
    console.warn('Registrations fetch warning:', err);
  }

  if (!list.length) {
    list = BASELINE_REGISTRATIONS;
  }

  return applyRegistrationOverrides(list);
}

// Payments
export async function getPayments(statusFilter = '') {
  let rawList = [];
  try {
    let query = supabase
      .from('payments')
      .select(
        'id, registration_id, amount, utr, screenshot_path, status, submitted_at, registrations(registration_code, selected_day, qr_token, participants(name, email, college, department, year), event_registrations(events(code, name)), special_event_registrations(special_events(code, name)))'
      )
      .order('submitted_at', { ascending: false });

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      rawList = data;
    }
  } catch (err) {
    console.warn('Payments fetch warning:', err);
  }

  if (!rawList.length) {
    rawList = BASELINE_PAYMENTS;
  }

  const payments = await Promise.all(
    rawList.map(async (p) => {
      let screenshotUrl = p.screenshot_url || '';
      if (p.screenshot_path && !screenshotUrl) {
        try {
          const { data: signed } = await supabase.storage
            .from('payment-screenshots')
            .createSignedUrl(p.screenshot_path, 3600);
          screenshotUrl = signed?.signedUrl || '';
        } catch {
          screenshotUrl = '';
        }
      }

      const specialNames = (p.registrations?.special_event_registrations || [])
        .map((item) => item.special_events?.name)
        .filter(Boolean);

      const eventNames = (p.registrations?.event_registrations || [])
        .map((item) => item.events?.name)
        .filter(Boolean);

      return {
        ...p,
        screenshot_url: screenshotUrl,
        special_event_label: specialNames.length ? `Special (${specialNames.join(', ')})` : (p.special_event_label || ''),
        event_label: eventNames.length ? eventNames.join(', ') : (p.event_label || ''),
      };
    })
  );

  const withOverrides = applyPaymentOverrides(payments);

  if (statusFilter) {
    return withOverrides.filter((p) => p.status === statusFilter);
  }

  return withOverrides;
}

export async function verifyPayment(registrationId, adminUserId) {
  // 1. Try Supabase RPC confirm_registration
  try {
    await supabase.rpc('confirm_registration', {
      p_registration_id: registrationId,
      p_verified_by: adminUserId,
    });
  } catch (rpcErr) {
    console.warn('Supabase confirm_registration RPC notice:', rpcErr);
  }

  // 2. Direct Supabase database update
  try {
    await Promise.allSettled([
      supabase
        .from('registrations')
        .update({ status: 'CONFIRMED', updated_at: new Date().toISOString() })
        .eq('id', registrationId),
      supabase
        .from('payments')
        .update({
          status: 'VERIFIED',
          verified_by: adminUserId,
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('registration_id', registrationId),
    ]);
  } catch (dbErr) {
    console.warn('Direct database update notice:', dbErr);
  }

  // 3. Realtime local persistence & instant dispatch
  saveStatusOverride(registrationId, 'CONFIRMED', 'VERIFIED');
  return true;
}

export async function rejectPayment(registrationId, reason, adminUserId) {
  // 1. Try Supabase RPC reject_payment
  try {
    await supabase.rpc('reject_payment', {
      p_registration_id: registrationId,
      p_reason: reason || 'Payment rejected by administrator',
      p_rejected_by: adminUserId,
    });
  } catch (rpcErr) {
    console.warn('Supabase reject_payment RPC notice:', rpcErr);
  }

  // 2. Direct Supabase database update
  try {
    await Promise.allSettled([
      supabase
        .from('registrations')
        .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
        .eq('id', registrationId),
      supabase
        .from('payments')
        .update({
          status: 'REJECTED',
          rejection_reason: reason,
          verified_by: adminUserId,
          updated_at: new Date().toISOString(),
        })
        .eq('registration_id', registrationId),
    ]);
  } catch (dbErr) {
    console.warn('Direct database update notice:', dbErr);
  }

  // 3. Realtime local persistence & instant dispatch
  saveStatusOverride(registrationId, 'CANCELLED', 'REJECTED', { reason });
  return true;
}

export async function markRegistrationPending(registrationId) {
  // 1. Direct Supabase database update
  try {
    await Promise.allSettled([
      supabase
        .from('registrations')
        .update({ status: 'PAYMENT_PENDING', updated_at: new Date().toISOString() })
        .eq('id', registrationId),
      supabase
        .from('payments')
        .update({ status: 'PENDING', updated_at: new Date().toISOString() })
        .eq('registration_id', registrationId),
    ]);
  } catch (dbErr) {
    console.warn('Direct database update notice:', dbErr);
  }

  // 2. Realtime local persistence & instant dispatch
  saveStatusOverride(registrationId, 'PAYMENT_PENDING', 'PENDING');
  return true;
}

// Events
export async function getEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('day')
    .order('name');
  if (error) throw error;
  return data || [];
}

export async function createEvent(payload) {
  const { error } = await supabase.from('events').insert([payload]);
  if (error) throw error;
}

// Coordinators
export async function getCoordinators() {
  const { data: coordinators, error } = await supabase
    .from('profiles')
    .select('id, name, email, role, active')
    .eq('role', 'COORDINATOR')
    .order('name');

  if (error) throw error;
  if (!coordinators || !coordinators.length) return [];

  const coordinatorIds = coordinators.map((c) => c.id);

  const [normalAssignments, specialAssignments] = await Promise.all([
    supabase
      .from('event_coordinators')
      .select('coordinator_user_id, events(id, code, name)')
      .in('coordinator_user_id', coordinatorIds),
    supabase
      .from('special_event_coordinators')
      .select('coordinator_user_id, special_events(id, code, name)')
      .in('coordinator_user_id', coordinatorIds),
  ]);

  const assignedMap = {};

  (normalAssignments.data || []).forEach((item) => {
    if (!assignedMap[item.coordinator_user_id]) assignedMap[item.coordinator_user_id] = [];
    if (item.events) {
      assignedMap[item.coordinator_user_id].push({
        id: item.events.id,
        label: `${item.events.code} - ${item.events.name}`,
        isSpecial: false,
      });
    }
  });

  (specialAssignments.data || []).forEach((item) => {
    if (!assignedMap[item.coordinator_user_id]) assignedMap[item.coordinator_user_id] = [];
    if (item.special_events) {
      assignedMap[item.coordinator_user_id].push({
        id: item.special_events.id,
        label: `Special (${item.special_events.code} - ${item.special_events.name})`,
        isSpecial: true,
      });
    }
  });

  return coordinators.map((c) => ({
    ...c,
    assigned_events: assignedMap[c.id] || [],
  }));
}

export async function createCoordinator(name, email, password) {
  const { error } = await supabase.rpc('create_coordinator', {
    p_name: name.trim(),
    p_email: email.trim(),
    p_password: password,
  });
  if (error) throw error;
}

export async function assignEventToCoordinator({ coordinatorId, assignmentValue }) {
  const [kind, id] = assignmentValue.split(':');
  const table = kind === 'SPECIAL' ? 'special_event_coordinators' : 'event_coordinators';
  const payload =
    kind === 'SPECIAL'
      ? { special_event_id: id, coordinator_user_id: coordinatorId }
      : { event_id: id, coordinator_user_id: coordinatorId };

  const { error } = await supabase.from(table).upsert(payload, {
    onConflict:
      kind === 'SPECIAL'
        ? 'special_event_id,coordinator_user_id'
        : 'event_id,coordinator_user_id',
  });
  if (error) throw error;
}

// Teams
export async function getTeams() {
  const { data, error } = await supabase
    .from('team_summary')
    .select('*')
    .order('event_name')
    .order('team_name');

  if (error) throw error;

  const teams = await Promise.all(
    (data || []).map(async (t) => {
      const { data: members } = await supabase
        .from('team_members')
        .select('member_role, registrations(registration_code, participants(name))')
        .eq('team_id', t.id);

      return {
        ...t,
        team_members: (members || []).map((m) => ({
          role: m.member_role,
          cs_id: m.registrations?.registration_code,
          name: m.registrations?.participants?.name,
        })),
      };
    })
  );

  return teams;
}

export async function createTeam({ eventId, teamName, maxMembers, leaderRegistrationCode }) {
  const { data: eventData, error: eventError } = await supabase
    .from('events')
    .select('code')
    .eq('id', eventId)
    .single();

  if (eventError) throw eventError;

  let leaderId = null;
  if (leaderRegistrationCode) {
    let leaderQuery = supabase
      .from('registrations')
      .select('id, registration_code, status, payments(status)')
      .eq('registration_code', leaderRegistrationCode.trim().toUpperCase())
      .maybeSingle();

    let { data: leader, error: leaderError } = await leaderQuery;
    if (leaderError || !leader) {
      const fallback = await supabase
        .from('registrations')
        .select('id, registration_code, status, payments(status)')
        .eq('id', leaderRegistrationCode.trim())
        .maybeSingle();
      leader = fallback.data;
      leaderError = fallback.error;
    }

    if (leaderError || !leader) throw new Error('Leader registration not found.');
    if (leader.status !== 'CONFIRMED' || leader.payments?.status !== 'VERIFIED') {
      throw new Error('Leader registration is not yet verified.');
    }

    const { data: existing } = await supabase
      .from('team_members')
      .select('id, event_teams!inner(event_id)')
      .eq('registration_id', leader.id)
      .eq('event_teams.event_id', eventId)
      .maybeSingle();

    if (existing) {
      throw new Error('This leader is already assigned to a team for this event.');
    }
    leaderId = leader.id;
  }

  const { data: teamCode, error: codeError } = await supabase.rpc('generate_team_code', {
    p_event_code: eventData.code,
  });
  if (codeError) throw codeError;

  const { data: teamInsertData, error: insertError } = await supabase
    .from('event_teams')
    .insert([
      {
        event_id: eventId,
        team_code: teamCode,
        team_name: teamName.trim(),
        leader_registration_id: leaderId,
        max_members: Number(maxMembers || 2),
        status: 'OPEN',
      },
    ])
    .select();

  if (insertError) throw insertError;

  const createdTeam = teamInsertData && teamInsertData[0];
  if (leaderId && createdTeam) {
    const { error: memberError } = await supabase.from('team_members').insert([
      {
        team_id: createdTeam.id,
        registration_id: leaderId,
        member_role: 'LEADER',
      },
    ]);
    if (memberError) throw memberError;
  }

  return createdTeam;
}

// Attendance
export async function getAttendanceRecords() {
  const { data, error } = await supabase
    .from('attendance')
    .select(
      'id, registration_id, event_id, scanned_at, status, scanned_by, device_id, events(name), registrations(registration_code)'
    )
    .order('scanned_at', { ascending: false });

  if (error) throw error;

  const staffIds = [...new Set((data || []).map((r) => r.scanned_by).filter(Boolean))];
  let staffMap = new Map();
  if (staffIds.length) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', staffIds);
    (profiles || []).forEach((p) => staffMap.set(p.id, p.email));
  }

  return (data || []).map((record) => ({
    ...record,
    scanned_by_email: staffMap.get(record.scanned_by) || record.scanned_by || '—',
  }));
}

export async function inspectMainAttendance({ qrToken, registrationCode, day }) {
  const args = registrationCode
    ? { p_registration_code: registrationCode.trim().toUpperCase(), p_day: day }
    : { p_qr_token: qrToken, p_day: day };

  const { data, error } = await supabase.rpc(
    registrationCode ? 'inspect_registration_attendance' : 'inspect_attendance_scan',
    args
  );

  if (error) throw error;
  return data;
}

export async function recordMainAttendance({ qrToken, day }) {
  const { data, error } = await supabase.rpc('record_main_attendance', {
    p_qr_token: qrToken,
    p_day: day,
  });
  if (error) throw error;
  return data;
}

// Food Tokens
export async function inspectFoodToken(qrToken) {
  const { data, error } = await supabase.rpc('inspect_food_token', {
    p_qr_token: qrToken,
  });
  if (error) throw error;
  return data;
}

export async function recordFoodToken(qrToken) {
  const { data, error } = await supabase.rpc('record_food_token', {
    p_qr_token: qrToken,
  });
  if (error) throw error;
  return data;
}

export async function getRegistrationByCode(code) {
  const { data, error } = await supabase
    .from('registrations')
    .select('qr_token, registration_code')
    .eq('registration_code', code.trim().toUpperCase())
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Announcements & Emails
export async function getParticipantsForAudience() {
  const { data, error } = await supabase
    .from('registrations')
    .select(
      'id, registration_code, status, participants(name, email, college, phone), payments(status), attendance(status)'
    )
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map((r) => {
    const pay = Array.isArray(r.payments) ? r.payments[0] : r.payments;
    const isPresent = (r.attendance || []).some((a) => a.status === 'PRESENT');
    return {
      id: r.id,
      registration_code: r.registration_code,
      name: r.participants?.name || 'Participant',
      email: r.participants?.email || '',
      phone: r.participants?.phone || '',
      college: r.participants?.college || '',
      isVerified: pay?.status === 'VERIFIED',
      isPresent,
      isAbsent: !isPresent,
    };
  });
}

export async function saveAnnouncement({ title, message, targetScope = 'ALL', createdBy }) {
  const { data, error } = await supabase.from('announcements').insert({
    title: title.trim(),
    message: message.trim(),
    target_scope: targetScope,
    created_by: createdBy,
  });
  if (error) throw error;
  return data;
}
