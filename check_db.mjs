import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDb() {
  const { data: events, error: eErr } = await supabase.from('events').select('id, code, name');
  console.log('--- EVENTS ---');
  if (eErr) console.error(eErr);
  else console.log(events);

  // We don't have direct schema access easily via API, but we can try to check if there's a profiles or users table
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('*').limit(1);
  console.log('\n--- PROFILES TABLE EXISTS? ---');
  console.log(pErr ? pErr.message : 'Yes');
  
  const { data: users, error: uErr } = await supabase.from('users').select('*').limit(1);
  console.log('\n--- USERS TABLE EXISTS? ---');
  console.log(uErr ? uErr.message : 'Yes');
}

checkDb();
