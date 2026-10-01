import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function checkProfiles() {
  const ids = [
    'ab767b9e-9b3a-4c9a-816a-b54aed439c25',
    'ae2cdd8f-e2e6-430f-ba0d-502c38797856',
    'd3e7cdcd-3490-40b5-8e9e-04aa8b869173'
  ];

  for (const id of ids) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id);

    console.log(`\nProfiles for id ${id}:`);
    console.log(data);
    if (error) console.error(error);
  }
}

checkProfiles();
