import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function fixProfiles() {
  const { data: users, error: err } = await supabase.auth.admin.listUsers();
  if (err) {
    console.error("List users err", err);
    return;
  }
  
  for (const user of users.users) {
    if (user.email.endsWith('@gmail.com') && (user.email.length === 12 || user.email.length === 13)) {
      // It's likely one of our coordinators (e.g. UN@gmail.com, FTB@gmail.com)
      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id);
        
      if (!prof || prof.length === 0) {
        console.log(`Creating profile for ${user.email} (${user.id})`);
        const { error: insertErr } = await supabase.from('profiles').insert({
          id: user.id,
          email: user.email,
          name: `${user.email.split('@')[0]} Coordinator`,
          role: 'COORDINATOR',
          active: true
        });
        if (insertErr) {
          console.error(`Insert err for ${user.email}:`, insertErr.message);
        } else {
          console.log(`Created profile for ${user.email}`);
        }
      } else {
        console.log(`Profile already exists for ${user.email}`);
      }
    }
  }
}

fixProfiles();
