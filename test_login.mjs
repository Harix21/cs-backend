import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function testLogin(email, password) {
  console.log(`\nTesting login for ${email}...`);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error(`❌ Auth Error: ${error.message}`);
    return;
  }
  
  console.log(`✅ Auth successful for ${data.user.id}`);
  
  // Test profile fetch
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (profileErr) {
    console.error(`❌ Profile Error: ${profileErr.message}`);
  } else if (profile) {
    console.log(`✅ Profile found: Role=${profile.role}, Active=${profile.active}`);
  } else {
    console.error(`❌ Profile not found for ID ${data.user.id}`);
  }
}

async function runTests() {
  await testLogin('UN@gmail.com', 'Cybersentinel@techUN');
  await testLogin('PP@gmail.com', 'Cybersentinel@techPP');
  await testLogin('TC@gmail.com', 'Cybersentinel@nonTC');
}

runTests();
