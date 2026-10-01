import { supabase } from '../config/supabase.js';

const STORAGE_KEY = 'cs_status_overrides';
const BROADCAST_CHANNEL_NAME = 'cs_realtime_sync';

// BroadcastChannel for cross-tab realtime synchronization
let broadcastChannel = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  } catch {
    broadcastChannel = null;
  }
}

/**
 * Retrieve persistent status overrides from localStorage.
 */
export function getStatusOverrides() {
  if (typeof window === 'undefined') return { registrations: {}, payments: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { registrations: {}, payments: {} };
    const parsed = JSON.parse(raw);
    return {
      registrations: parsed.registrations || {},
      payments: parsed.payments || {},
    };
  } catch {
    return { registrations: {}, payments: {} };
  }
}

/**
 * Save and broadcast a registration and payment status update.
 */
export function saveStatusOverride(registrationId, regStatus, paymentStatus, meta = {}) {
  if (!registrationId) return;

  const current = getStatusOverrides();
  const timestamp = new Date().toISOString();

  if (regStatus) {
    current.registrations[registrationId] = {
      status: regStatus,
      updated_at: timestamp,
      ...meta,
    };
  }

  if (paymentStatus) {
    current.payments[registrationId] = {
      status: paymentStatus,
      updated_at: timestamp,
      ...meta,
    };
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch (err) {
    console.warn('Could not persist status override to localStorage:', err);
  }

  const payload = {
    registrationId,
    regStatus,
    paymentStatus,
    meta,
    timestamp: Date.now(),
  };

  // 1. Dispatch custom events on current window
  if (typeof window !== 'undefined') {
    if (regStatus) {
      window.dispatchEvent(
        new CustomEvent('cs:registration-updated', { detail: payload })
      );
    }
    if (paymentStatus) {
      window.dispatchEvent(
        new CustomEvent('cs:payment-updated', { detail: payload })
      );
    }
  }

  // 2. Broadcast to other tabs via BroadcastChannel
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(payload);
    } catch {
      // ignore
    }
  }
}

/**
 * Apply status overrides to an array of registration records.
 */
export function applyRegistrationOverrides(registrations = []) {
  const { registrations: regOverrides, payments: payOverrides } = getStatusOverrides();
  if (!Object.keys(regOverrides).length && !Object.keys(payOverrides).length) {
    return registrations;
  }

  return registrations.map((r) => {
    const regId = r.id || r.registration_id;
    const override = regOverrides[regId] || regOverrides[r.registration_code];
    const payOverride = payOverrides[regId] || payOverrides[r.registration_code];

    let newStatus = r.status;
    if (override?.status) {
      newStatus = override.status;
    }

    let updatedPayments = r.payments;
    if (Array.isArray(updatedPayments)) {
      updatedPayments = updatedPayments.map((p) => {
        if (payOverride?.status) {
          return { ...p, status: payOverride.status };
        }
        return p;
      });
    } else if (payOverride?.status) {
      updatedPayments = updatedPayments
        ? { ...updatedPayments, status: payOverride.status }
        : { status: payOverride.status };
    }

    return {
      ...r,
      status: newStatus,
      payments: updatedPayments,
    };
  });
}

/**
 * Apply status overrides to an array of payment records.
 */
export function applyPaymentOverrides(payments = []) {
  const { payments: payOverrides, registrations: regOverrides } = getStatusOverrides();
  if (!Object.keys(payOverrides).length && !Object.keys(regOverrides).length) {
    return payments;
  }

  return payments.map((p) => {
    const regId = p.registration_id || p.id;
    const payOverride = payOverrides[regId] || payOverrides[p.id];
    const regOverride = regOverrides[regId] || regOverrides[p.id];

    let newStatus = p.status;
    let newReason = p.rejection_reason;

    if (payOverride?.status) {
      newStatus = payOverride.status;
      if (payOverride.reason) {
        newReason = payOverride.reason;
      }
    }

    let updatedRegistrations = p.registrations;
    if (updatedRegistrations && regOverride?.status) {
      updatedRegistrations = {
        ...updatedRegistrations,
        status: regOverride.status,
      };
    }

    return {
      ...p,
      status: newStatus,
      rejection_reason: newReason,
      registrations: updatedRegistrations,
    };
  });
}

/**
 * Apply status overrides to database summary metrics.
 */
export function applySummaryOverrides(regSummary, paySummary) {
  if (!regSummary && !paySummary) return { regSummary, paySummary };

  const { registrations: regOverrides, payments: payOverrides } = getStatusOverrides();
  const overrideEntries = Object.entries(regOverrides);
  if (!overrideEntries.length) return { regSummary, paySummary };

  const adjustedReg = regSummary ? { ...regSummary } : null;
  const adjustedPay = paySummary ? { ...paySummary } : null;

  overrideEntries.forEach(([_, data]) => {
    const s = String(data.status || '').toUpperCase();
    if (s === 'CONFIRMED' || s === 'VERIFIED') {
      if (adjustedReg && adjustedReg.payment_pending > 0) {
        adjustedReg.confirmed_registrations = Number(adjustedReg.confirmed_registrations || 0) + 1;
        adjustedReg.payment_pending = Math.max(0, Number(adjustedReg.payment_pending || 0) - 1);
      }
      if (adjustedPay && adjustedPay.under_review_payments > 0) {
        adjustedPay.verified_payments = Number(adjustedPay.verified_payments || 0) + 1;
        adjustedPay.under_review_payments = Math.max(0, Number(adjustedPay.under_review_payments || 0) - 1);
      }
    } else if (s === 'CANCELLED' || s === 'REJECTED') {
      if (adjustedReg && adjustedReg.payment_pending > 0) {
        adjustedReg.cancelled_registrations = Number(adjustedReg.cancelled_registrations || 0) + 1;
        adjustedReg.payment_pending = Math.max(0, Number(adjustedReg.payment_pending || 0) - 1);
      }
      if (adjustedPay && adjustedPay.under_review_payments > 0) {
        adjustedPay.rejected_payments = Number(adjustedPay.rejected_payments || 0) + 1;
        adjustedPay.under_review_payments = Math.max(0, Number(adjustedPay.under_review_payments || 0) - 1);
      }
    }
  });

  return { regSummary: adjustedReg, paySummary: adjustedPay };
}

/**
 * Unified realtime subscriber for React components.
 * Listens to:
 * 1. Window events ('cs:registration-updated', 'cs:payment-updated')
 * 2. Cross-tab BroadcastChannel
 * 3. Supabase Realtime postgres_changes channel
 */
export function subscribeToRealtimeUpdates(onUpdateCallback) {
  if (typeof window === 'undefined' || typeof onUpdateCallback !== 'function') {
    return () => {};
  }

  // 1. Local window listeners
  const handleWindowEvent = (e) => {
    onUpdateCallback(e.detail || {});
  };

  window.addEventListener('cs:registration-updated', handleWindowEvent);
  window.addEventListener('cs:payment-updated', handleWindowEvent);

  // 2. BroadcastChannel cross-tab listener
  let channelListener = null;
  if (broadcastChannel) {
    channelListener = (e) => {
      onUpdateCallback(e.data || {});
    };
    broadcastChannel.addEventListener('message', channelListener);
  }

  // 3. Supabase Realtime postgres_changes subscription
  let supabaseChannel = null;
  try {
    supabaseChannel = supabase
      .channel(`cs_realtime_${Math.random().toString(36).substring(2, 9)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'registrations' },
        (payload) => {
          onUpdateCallback({ type: 'supabase_registration', payload });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments' },
        (payload) => {
          onUpdateCallback({ type: 'supabase_payment', payload });
        }
      )
      .subscribe();
  } catch (err) {
    console.warn('Supabase Realtime subscription error:', err);
  }

  // Unsubscribe cleanup
  return () => {
    window.removeEventListener('cs:registration-updated', handleWindowEvent);
    window.removeEventListener('cs:payment-updated', handleWindowEvent);

    if (broadcastChannel && channelListener) {
      broadcastChannel.removeEventListener('message', channelListener);
    }

    if (supabaseChannel) {
      try {
        supabase.removeChannel(supabaseChannel);
      } catch {
        // ignore
      }
    }
  };
}
