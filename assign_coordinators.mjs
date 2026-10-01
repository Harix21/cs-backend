import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf-8')
    .split('\n')
    .filter(l => l && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim()]; })
);

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data: profiles } = await supabase.from('profiles').select('*').eq('role', 'COORDINATOR');
  const { data: events } = await supabase.from('events').select('*');
  const { data: ecs } = await supabase.from('event_coordinators').select('*');

  const ecMap = new Set(ecs.map(ec => ec.coordinator_user_id));

  for (const p of profiles) {
    if (!ecMap.has(p.id)) {
      // Find event by email prefix
      const prefix = p.email.split('@')[0].toUpperCase();
      let event = events.find(e => e.code.toUpperCase() === prefix);
      
      // Handle special cases: uiux@gmail.com -> UX
      if (!event && p.email.startsWith('uiux')) {
        event = events.find(e => e.code === 'UX');
      }

      if (event) {
        console.log(`Assigning ${p.email} to event ${event.name}`);
        const { error } = await supabase.from('event_coordinators').insert({
          event_id: event.id,
          coordinator_user_id: p.id
        });
        if (error) console.error("Error inserting:", error);
      } else {
        console.log(`No event found for ${p.email}`);
      }
    }
  }
}

main();
