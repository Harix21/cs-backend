// Requires the Supabase CDN script to be loaded before this file.
const supabaseClient = window.supabase
  ? window.supabase.createClient(
      window.SUPABASE_URL || SUPABASE_URL,
      window.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY
    )
  : null;

if (typeof window !== "undefined") {
  window.supabaseClient = supabaseClient;
}
