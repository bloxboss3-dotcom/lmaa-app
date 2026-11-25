-- ===========================================================================
-- LMAA Family App — explicit grants
--
-- A newer Supabase project can be created with "auto-grant API access" off.
-- New tables and functions are then NOT handed to the API roles by default,
-- which is the safer setting — and it means everything the app needs has to
-- be granted by name. The earlier migrations already do that for tables read
-- from the browser; this file adds what they left to the old defaults:
--
--   * the role helpers the security policies call;
--   * the server-side role used by the Edge Functions (notifications, the
--     Dojang OS sync), which must reach the tables with no browser involved.
--
-- Nothing here widens what a visitor or a signed-in parent can see: Row Level
-- Security still decides that. Safe to re-run, and harmless on a project that
-- has auto-grant on.
-- ===========================================================================

grant usage on schema public to anon, authenticated, service_role;

-- The policies call these to ask "is this person staff?". They only ever
-- answer about the caller, and answer "no" for a visitor.
grant execute on function public.lmaa_role() to anon, authenticated, service_role;
grant execute on function public.is_staff() to anon, authenticated, service_role;
grant execute on function public.is_admin() to anon, authenticated, service_role;

-- Stated again so this file alone restores them (0004, 0006).
grant execute on function public.register_push_device(text, text, text, text[], text)
  to anon, authenticated;
grant execute on function public.unregister_push_device(text) to anon, authenticated;
grant execute on function public.push_audience_count(text) to authenticated;
grant execute on function public.verified_email() to authenticated;

-- The device list is for the server-side sender alone (0004 keeps it from
-- every browser role).
revoke execute on function public.push_audience(text) from public, anon, authenticated;
grant execute on function public.push_audience(text) to service_role;

-- The Edge Functions run with the service role. It bypasses Row Level
-- Security by design, but still needs ordinary table privileges.
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
