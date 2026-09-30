
# Cyber Sentinel — Registration + Checking + Main Attendance

This package is built for the uploaded `supabase_schema_final.sql`.

## Included
- registration/index.html — real multipart registration client
- checking/index.html — email + phone checking client
- admin/main-attendance.html — Admin scans the same QR for main/day attendance
- coordinator/event-attendance.html — coordinator scans the same QR for a selected event
- supabase/add_main_attendance.sql — adds main_attendance and secure Admin RPC
- supabase/functions/public-register — creates participant, registration and UNDER_REVIEW payment, uploads screenshot
- supabase/functions/check-registration — secure lookup and returns QR only when VERIFIED/CONFIRMED
- supabase/functions/record-main-attendance — authenticated Admin main attendance endpoint

## IMPORTANT
1. Run `supabase/add_main_attendance.sql` after your existing schema.
2. Run the repository root migration `supabase_fix_attendance_scan.sql` after the attendance table exists. It adds authenticated inspection RPCs used before marking attendance.
2. Deploy the three Edge Functions.
3. Configure function secrets:
   SUPABASE_URL
   SUPABASE_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY
   QR_VERIFY_BASE_URL
4. Put the public anon/publishable key in js/config.js.
5. Do NOT put service_role in browser files.
6. Replace the placeholder official payment QR in registration/index.html.
7. Replace YOUR-DOMAIN in QR_VERIFY_BASE_URL with the public QR verification URL.
8. Run `supabase_custom_coordinators.sql` after the migrations. Coordinators are stored in `profiles`, log in with the admin-created email/password, and do not create Supabase Auth users. The existing attendance RPCs still enforce Admin/assigned coordinator scope.
9. Run `supabase_team_packages.sql` to add package-to-event mappings for multi-event teams.
10. Deploy `supabase/functions/team-management` for `team/create.html` and `team/join.html`. It excludes solo events, groups team events by required member count, validates every member's payment and selected day, and blocks members already in another team. Redeploy this function after code changes; the hosted function is what enforces member eligibility.
11. Run `supabase_remove_team_passwords.sql` if the previous password migration was already applied.
12. Deploy `supabase/functions/send-email` and set `RESEND_API_KEY` and `MAIL_FROM` to enable real email delivery.

## Email OTP
The checking page intentionally uses email + phone without an OTP dependency so it can work immediately with the existing participant-no-auth architecture.
A truly free, production SMS OTP is not guaranteed. If you want OTP later, use Supabase Auth email OTP/magic link or connect an email/SMS provider. Adding OTP should be done without exposing participant rows publicly.

## Registration visibility
After payment verification, your existing `confirm_registration()` creates `event_registrations` for every ACTIVE event on the participant's selected day(s). Coordinators then see those participants only through their assigned events.

## Attendance
- Main Admin attendance: main_attendance(registration_id, day)
- Event Coordinator attendance: attendance(registration_id, event_id)
- Same QR token is used for both.
- Duplicate attendance is prevented by unique constraints.

## SECURITY NOTE ABOUT THE UPLOADED FINAL SQL
The uploaded file's hardening version of `confirm_registration()` checks coordinator authorization through existing `event_registrations`. That can fail on the FIRST payment verification because event_registrations are created during confirmation. Before production, change that authorization to check the registration's selected_day against events assigned to the coordinator, then create event_registrations.
