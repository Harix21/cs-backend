-- Allow the custom coordinator session header to pass through storage RLS.
-- The existing authenticated-only policies do not cover the coordinator portal,
-- which uses coordinator_sessions instead of Supabase Auth JWTs.
drop policy if exists payment_screenshot_portal_select on storage.objects;

create policy payment_screenshot_portal_select
on storage.objects
for select
to public
using (
  bucket_id = 'payment-screenshots'
  and (public.is_admin() or public.is_coordinator())
);