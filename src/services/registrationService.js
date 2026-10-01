import { SUPABASE_URL, SUPABASE_ANON_KEY, supabase } from '../config/supabase';

export async function getRegistrationFees() {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/get-registration-fees`, {
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Unable to load registration fees.');
  }
  return {
    DAY_1: Number(data.DAY_1 || 0),
    DAY_2: Number(data.DAY_2 || 0),
  };
}

export async function getSpecialEvents() {
  const { data, error } = await supabase.rpc('get_special_events');
  if (error) {
    // Fallback directly to special_events table if RPC fails
    const fallback = await supabase
      .from('special_events')
      .select('id, code, name, description, fee, status')
      .eq('status', 'ACTIVE')
      .order('code');
    if (fallback.error) throw fallback.error;
    return fallback.data || [];
  }
  return Array.isArray(data) ? data : [];
}

export async function submitRegistration({
  name,
  email,
  phone,
  college,
  department,
  year,
  selectedDay,
  specialEventCodes = [],
  utr,
  paymentScreenshotFile,
}) {
  const fd = new FormData();
  fd.append('name', name.trim());
  fd.append('email', email.trim());
  fd.append('phone', phone.trim());
  fd.append('college', college.trim());
  fd.append('department', department.trim());
  fd.append('year', year || '');
  fd.append('utr', utr.trim());
  fd.append('selected_day', selectedDay);
  fd.append('special_event_codes', JSON.stringify(specialEventCodes));
  fd.append('payment_screenshot', paymentScreenshotFile);

  const response = await fetch(`${SUPABASE_URL}/functions/v1/public-register`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: fd,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Registration submission failed.');
  }
  return data;
}

export async function checkRegistrationStatus(email, phone) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/check-registration`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      email: email.trim(),
      phone: phone.trim(),
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Unable to find registration record.');
  }
  return data;
}

export async function callTeamManagement(payload) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/team-management`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Team operation failed.');
  }
  return data;
}
