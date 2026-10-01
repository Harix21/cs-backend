import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function syncProfiles() {
  const { data: users, error: err } = await supabase.auth.admin.listUsers();
  if (err) {
    console.error("List users err", err);
    return;
  }
  
  for (const user of users.users) {
    if (user.email.endsWith('@gmail.com')) {
      const emailLower = user.email.toLowerCase();
      
      // Check if a profile exists for this exact email but with a DIFFERENT id
      const { data: wrongProfiles, error: checkErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', emailLower)
        .neq('id', user.id);
        
      if (wrongProfiles && wrongProfiles.length > 0) {
        console.log(`Found ${wrongProfiles.length} incorrect profile(s) for ${emailLower}. Deleting them...`);
        const { error: delErr } = await supabase
          .from('profiles')
          .delete()
          .eq('email', emailLower)
          .neq('id', user.id);
        if (delErr) {
          console.error(`Failed to delete old profiles for ${emailLower}:`, delErr);
        } else {
          console.log(`Deleted old profiles for ${emailLower}`);
        }
      }

      // Check if correct profile exists
      const { data: correctProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (!correctProfile) {
        console.log(`Creating correct profile for ${emailLower} (${user.id})`);
        const { error: insertErr } = await supabase.from('profiles').insert({
          id: user.id,
          email: emailLower,
          name: `${user.email.split('@')[0].toUpperCase()} Coordinator`,
          role: 'COORDINATOR',
          active: true
        });
        if (insertErr) {
          console.error(`Insert err for ${emailLower}:`, insertErr.message);
        } else {
          console.log(`Created correct profile for ${emailLower}`);
        }
      } else {
        console.log(`Correct profile already exists for ${emailLower}`);
      }
    }
  }
}

syncProfiles();
