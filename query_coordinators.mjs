import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf-8')
    .split('\n')
    .filter(l => l && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0,i), l.slice(i+1)]; })
);

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('*').eq('email', 'UN@gmail.com');
  console.log("Profile:", profiles);

  if (profiles && profiles.length > 0) {
    const { data: ec, error: ecErr } = await supabase.from('event_coordinators').select('*, events(*)').eq('coordinator_user_id', profiles[0].id);
    console.log("Event Coordinators:", ec, ecErr);
    
    const { data: sec, error: secErr } = await supabase.from('special_event_coordinators').select('*, special_events(*)').eq('coordinator_user_id', profiles[0].id);
    console.log("Special Event Coordinators:", sec, secErr);
  }
}

check();
