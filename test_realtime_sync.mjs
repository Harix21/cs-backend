import { createClient } from '@supabase/supabase-js';

// Setup Mock Browser environment for testing browser utilities in Node
const storage = new Map();
global.localStorage = {
  getItem: (key) => storage.get(key) || null,
  setItem: (key, val) => storage.set(key, String(val)),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear(),
};

const listeners = new Map();
global.window = {
  addEventListener: (event, handler) => {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(handler);
  },
  removeEventListener: (event, handler) => {
    if (listeners.has(event)) listeners.get(event).delete(handler);
  },
  dispatchEvent: (event) => {
    const list = listeners.get(event.type);
    if (list) list.forEach(cb => cb(event));
    return true;
  },
};
global.CustomEvent = class CustomEvent {
  constructor(type, eventInitDict) {
    this.type = type;
    this.detail = eventInitDict ? eventInitDict.detail : null;
  }
};
global.BroadcastChannel = class BroadcastChannel {
  constructor(name) { this.name = name; }
  postMessage() {}
  close() {}
};

async function runTests() {
  console.log('🧪 Starting Real-Time Status & Dashboard Test Suite...\n');

  // Import application modules
  const { 
    saveStatusOverride, 
    getStatusOverrides, 
    applyRegistrationOverrides, 
    applyPaymentOverrides, 
    applySummaryOverrides,
    subscribeToRealtimeUpdates
  } = await import('./src/utils/statusStore.js');

  const { BASELINE_REGISTRATIONS, BASELINE_PAYMENTS } = await import('./src/utils/sampleData.js');
  const { getRegistrationStatusCounts, getTrackCounts } = await import('./src/utils/dashboardMetrics.js');

  console.log(`✓ Loaded ${BASELINE_REGISTRATIONS.length} baseline registrations and ${BASELINE_PAYMENTS.length} baseline payments.`);

  // TEST 1: Initial Dashboard Metrics
  const initialCounts = getRegistrationStatusCounts(BASELINE_REGISTRATIONS);
  console.log('\n--- Initial Status Counts ---');
  console.log('Total:', initialCounts.total);
  console.log('Verified:', initialCounts.verified);
  console.log('Pending:', initialCounts.pending);
  console.log('Rejected:', initialCounts.rejected);

  const initialPending = BASELINE_REGISTRATIONS.find(r => r.status === 'PAYMENT_PENDING' || r.status === 'UNDER_REVIEW');
  if (!initialPending) {
    throw new Error('No pending registration found for testing!');
  }
  console.log(`\nTesting with Pending Registration: [${initialPending.registration_code}] (ID: ${initialPending.id})`);

  // TEST 2: Realtime Subscription Listener Verification
  let realtimeFired = false;
  let eventDetailReceived = null;
  const unsubscribe = subscribeToRealtimeUpdates((evt) => {
    realtimeFired = true;
    eventDetailReceived = evt;
  });

  // TEST 3: Verify & Confirm Action
  console.log('\n--- Executing Action: Accept & Verify ---');
  saveStatusOverride(initialPending.id, 'CONFIRMED', 'VERIFIED');

  if (!realtimeFired) {
    throw new Error('FAILED: Realtime update event was NOT dispatched or received!');
  }
  console.log('✓ Realtime event successfully triggered listener with detail:', eventDetailReceived);

  // Check stored overrides
  const overrides = getStatusOverrides();
  if (!overrides.registrations[initialPending.id] || overrides.registrations[initialPending.id].status !== 'CONFIRMED') {
    throw new Error('FAILED: Override not saved properly in persistent store');
  }
  console.log('✓ Override persisted in storage:', overrides.registrations[initialPending.id]);

  // TEST 4: Recalculate Registration List with Overrides
  const updatedList = applyRegistrationOverrides(BASELINE_REGISTRATIONS);
  const updatedPending = updatedList.find(r => r.id === initialPending.id);
  if (updatedPending.status !== 'CONFIRMED' || updatedPending.payments?.status !== 'VERIFIED') {
    throw new Error(`FAILED: Registration status not updated! Got ${updatedPending.status}`);
  }
  console.log(`✓ Registration [${initialPending.registration_code}] updated to:`, updatedPending.status);

  // TEST 5: Recalculate Status Counts for Dashboard Cards & Charts
  const updatedCounts = getRegistrationStatusCounts(updatedList);
  console.log('\n--- Updated Status Counts After Verification ---');
  console.log('Total:', updatedCounts.total);
  console.log('Verified:', updatedCounts.verified, `(+${updatedCounts.verified - initialCounts.verified})`);
  console.log('Pending:', updatedCounts.pending, `(-${initialCounts.pending - updatedCounts.pending})`);
  console.log('Rejected:', updatedCounts.rejected);

  if (updatedCounts.verified !== initialCounts.verified + 1) {
    throw new Error('FAILED: Verified count did not increment!');
  }
  if (updatedCounts.pending !== initialCounts.pending - 1) {
    throw new Error('FAILED: Pending count did not decrement!');
  }
  console.log('✓ Dashboard Status Counts incremented and decremented with 100% precision!');

  // TEST 6: Recalculate Summary Overview
  const initialRegSummary = {
    total_registrations: BASELINE_REGISTRATIONS.length,
    confirmed_registrations: initialCounts.verified,
    payment_pending: initialCounts.pending,
    cancelled_registrations: initialCounts.rejected
  };
  const initialPaySummary = {
    total_payments: BASELINE_PAYMENTS.length,
    verified_payments: initialCounts.verified,
    pending_payments: initialCounts.pending,
    under_review_payments: 0,
    rejected_payments: initialCounts.rejected,
    verified_amount: 5000
  };

  const adjustedSummary = applySummaryOverrides(initialRegSummary, initialPaySummary);
  console.log('\n--- Adjusted Summary Output ---');
  console.log('Confirmed Registrations in Summary:', adjustedSummary.regSummary.confirmed_registrations);
  console.log('Pending Registrations in Summary:', adjustedSummary.regSummary.payment_pending);
  console.log('Verified Payments in Summary:', adjustedSummary.paySummary.verified_payments);

  if (adjustedSummary.regSummary.confirmed_registrations !== initialRegSummary.confirmed_registrations + 1) {
    throw new Error('FAILED: Summary confirmed count did not match expected value!');
  }
  console.log('✓ Summary overview correctly reflects real-time status change!');

  // TEST 7: Reject Action
  console.log('\n--- Executing Action: Reject ---');
  saveStatusOverride(initialPending.id, 'CANCELLED', 'REJECTED', { reason: 'Invalid transaction receipt' });
  const rejectedList = applyRegistrationOverrides(BASELINE_REGISTRATIONS);
  const rejectedItem = rejectedList.find(r => r.id === initialPending.id);
  const countsAfterReject = getRegistrationStatusCounts(rejectedList);

  console.log('Item Status after Reject:', rejectedItem.status);
  console.log('Rejected Count in Dashboard:', countsAfterReject.rejected);
  if (rejectedItem.status !== 'CANCELLED') {
    throw new Error('FAILED: Rejected item status not CANCELLED');
  }
  if (countsAfterReject.rejected !== initialCounts.rejected + 1) {
    throw new Error('FAILED: Rejected count did not increment!');
  }
  console.log('✓ Reject action verified and dashboard counts updated in real time!');

  unsubscribe();
  console.log('\n🎉 ALL 7 TEST SUITES PASSED FLAWLESSLY!');
  process.exit(0);
}

runTests().catch(err => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});
