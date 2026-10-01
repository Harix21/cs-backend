import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const stored = JSON.parse(localStorage.getItem('coordinatorSession') || 'null');
const token = stored?.token;
export const coordinatorProfile = stored?.profile || null;
export const coordinatorSession = coordinatorProfile
  ? { user: { id: coordinatorProfile.id, email: coordinatorProfile.email } }
  : null;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: { headers: token ? { 'x-coordinator-token': token } : {} }
});

supabase.auth.getSession = async () => ({ data: { session: coordinatorSession }, error: null });
supabase.auth.signOut = async () => {
  localStorage.removeItem('coordinatorSession');
  return { error: null };
};