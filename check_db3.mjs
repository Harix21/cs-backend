import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDb() {
  const { data: p } = await supabase.from('profiles').select('*').eq('email', 'PP@gmail.com');
  console.log('--- PROFILES FOR PP ---', p);
}

checkDb();
