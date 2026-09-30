# Cyber Sentinel Coordinator Portal
Plain HTML/CSS/JavaScript pages:
login, dashboard, participants, payments, teams, attendance, announcements, emails, reports.

Setup:
1. Edit js/config.js with your Supabase URL and anon key.
2. Create coordinator Auth users.
3. Add matching public.profiles rows with role='COORDINATOR' and active=true.
4. Assign events using event_coordinators.
5. Keep RLS enabled. Frontend filtering is not security.
6. Attendance expects record_attendance RPC.
7. Teams expects team_summary view.
8. Never expose service_role in frontend.
