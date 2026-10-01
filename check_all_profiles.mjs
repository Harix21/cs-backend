import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function checkProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('email', '%@gmail.com');
  
  if (error) {
    console.error(error);
  } else {
    console.log("All profiles with @gmail.com:");
    console.log(data);
  }
}

checkProfiles();
