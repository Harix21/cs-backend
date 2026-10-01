import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Base public client (for public operations & Admin Supabase Auth)
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'cs_admin_auth',
  },
});

// Coordinator dynamic client constructor with x-coordinator-token header support
export function getCoordinatorClient(token) {
  const coordinatorToken =
    token ||
    (() => {
      try {
        const stored = JSON.parse(localStorage.getItem('coordinatorSession') || 'null');
        return stored?.token || '';
      } catch {
        return '';
      }
    })();

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
    },
    global: {
      headers: coordinatorToken ? { Authorization: `Bearer ${coordinatorToken}` } : {},
    },
  });
}
