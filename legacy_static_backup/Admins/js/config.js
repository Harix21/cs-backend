// Supabase project configuration
const SUPABASE_URL = "https://rkmzrgektehctcozagnk.supabase.co";

// Paste your Supabase ANON/PUBLISHABLE key here.
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrbXpyZ2VrdGVoY3Rjb3phZ25rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0MzQ5MzEsImV4cCI6MjEwNTAxMDkzMX0.fL3cLacrVLuGuxXsX5mOQ_aZHhEZFMlGnbVo-5eF3qA";

const QR_VERIFY_BASE_URL = `${window.location.origin}/verify/qr/`;

if (typeof window !== "undefined") {
  window.SUPABASE_URL = SUPABASE_URL;
  window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
  window.QR_VERIFY_BASE_URL = QR_VERIFY_BASE_URL;
}
