import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDb() {
  const { data: p } = await supabase.from('profiles').select('*').limit(1);
  console.log('--- PROFILES ---', p);
  
  const { data: e } = await supabase.from('events').select('*').limit(1);
  console.log('--- EVENTS ---', e);
  
  const { data: ec } = await supabase.from('event_coordinators').select('*').limit(1);
  console.log('--- EVENT_COORDINATORS ---', ec);
}

checkDb();
