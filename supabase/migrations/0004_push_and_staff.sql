-- ===========================================================================
-- LMAA Family App — Web Push + staff management
--
-- Adds:
--   1. The Web Push key material a device needs so the server can encrypt a
--      message to it (endpoint + p256dh + auth, per RFC 8291).
--   2. Two SECURITY DEFINER functions so a phone can register and deregister
--      itself WITHOUT the browser holding blanket insert/delete rights on the
--      subscription table.
--   3. Role management, so the academy owner can appoint staff from inside the
--      app instead of the Supabase dashboard — without being able to escalate
--      or lock themselves out.
--
-- Safe to re-run.
-- ===========================================================================

-- ------------------------------------------------- 1. push key material --

alter table public.notification_subscriptions
  add column if not exists p256dh text,
  add column if not exists auth text,
  -- Consecutive send failures. The sender prunes on 404/410; this counts the
  -- softer failures so a permanently broken endpoint can be cleaned up too.
  add column if not exists failure_count integer not null default 0;

comment on column public.notification_subscriptions.provider_id is
  'For web push this is the subscription endpoint URL issued by the browser''s '
  'push service. It is an unguessable capability URL and is the device identity.';
comment on column public.notification_subscriptions.p256dh is
  'Device public key (base64url), used to encrypt the payload. RFC 8291.';
comment on column public.notification_subscriptions.auth is
  'Device auth secret (base64url), used to encrypt the payload. RFC 8291.';

create index if not exists notification_subscriptions_topics_idx
  on public.notification_subscriptions using gin (topics);

-- ------------------------------------------- 2. self-service device RPCs --

-- A phone registering itself must not need INSERT rights on the table, and a
-- phone unsubscribing must not need DELETE rights — otherwise anyone could
-- wipe the whole list. These two functions are the only doors in, and each
-- one only ever touches the row matching the caller's own endpoint.
--
-- The endpoint is a long unguessable URL issued by the browser's push service,
-- so knowing it is the proof of ownership. That is the same model the Web Push
-- protocol itself uses.

create or replace function public.register_push_device(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_topics text[] default '{}',
  p_platform text default 'web'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_endpoint is null or length(p_endpoint) < 20 then
    raise exception 'A push endpoint is required';
  end if;
  if p_platform not in ('web', 'ios', 'android') then
    raise exception 'Unsupported platform %', p_platform;
  end if;

  insert into public.notification_subscriptions
    (platform, provider_id, p256dh, auth, topics, last_seen_at)
  values
    (p_platform, p_endpoint, p_p256dh, p_auth, coalesce(p_topics, '{}'), now())
  on conflict (provider_id) do update set
    p256dh        = excluded.p256dh,
    auth          = excluded.auth,
    topics        = excluded.topics,
    platform      = excluded.platform,
    last_seen_at  = now(),
    -- A device that re-registers is demonstrably alive again.
    failure_count = 0;
end;
$$;

create or replace function public.unregister_push_device(p_endpoint text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.notification_subscriptions where provider_id = p_endpoint;
$$;

-- The browser now goes through the functions above, never the table directly.
revoke insert on public.notification_subscriptions from anon, authenticated;
revoke delete on public.notification_subscriptions from authenticated;

grant execute on function public.register_push_device(text, text, text, text[], text)
  to anon, authenticated;
grant execute on function public.unregister_push_device(text) to anon, authenticated;

-- Staff still need to see how many devices are subscribed, and to clear one
-- out by hand if they ever need to.
grant delete on public.notification_subscriptions to authenticated;

-- ------------------------------------------------------ 3. staff & roles --

-- Until now `user_roles` had no write policy at all, so RLS denied every
-- change and roles could only be set from the Supabase dashboard. That is safe
-- but unusable: the academy owner cannot appoint an instructor without a
-- developer.
--
-- These policies let an administrator manage OTHER people's roles while making
-- two things impossible:
--   * self-escalation — an editor cannot promote themselves, because the
--     policy requires `is_admin()` to begin with;
--   * self-demotion and self-deletion — an administrator cannot change or
--     remove their own row, so the academy can never end up with no
--     administrator by accident, and cannot silently grant itself anything it
--     did not already have.

drop policy if exists user_roles_admin_insert on public.user_roles;
create policy user_roles_admin_insert on public.user_roles
  for insert to authenticated
  with check (public.is_admin() and user_id <> auth.uid());

drop policy if exists user_roles_admin_update on public.user_roles;
create policy user_roles_admin_update on public.user_roles
  for update to authenticated
  using (public.is_admin() and user_id <> auth.uid())
  with check (public.is_admin() and user_id <> auth.uid());

drop policy if exists user_roles_admin_delete on public.user_roles;
create policy user_roles_admin_delete on public.user_roles
  for delete to authenticated
  using (public.is_admin() and user_id <> auth.uid());

grant insert, update, delete on public.user_roles to authenticated;

-- An administrator needs to see who the staff are in order to manage them.
drop policy if exists staff_profiles_admin_read on public.staff_profiles;
create policy staff_profiles_admin_read on public.staff_profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- ------------------------------------------------------------- 4. counts --

-- The admin "send a notification" screen needs to tell the truth about how
-- many devices will receive a message. Counting rows requires reading the
-- table, which staff may already do — this function just makes it one call.

-- Who receives a message on a given topic. This is the ONE definition of that
-- rule: the sender and the "reaches N devices" count both go through it, so
-- the number an administrator is shown can never disagree with who actually
-- gets the message.
--
-- A device with no topics chose everything; a device with topics gets a
-- message only if it asked for that kind.
create or replace function public.push_audience(p_topic text default null)
returns table (id uuid, provider_id text, p256dh text, auth text)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.provider_id, s.p256dh, s.auth
  from public.notification_subscriptions s
  where s.p256dh is not null
    and s.auth is not null
    and (
      p_topic is null
      or cardinality(s.topics) = 0
      or p_topic = any (s.topics)
    );
$$;

-- Only the Edge Function (service_role) may pull the actual device list.
--
-- Note the `from public`: PostgreSQL grants EXECUTE on every new function to
-- PUBLIC by default, so revoking from `anon, authenticated` alone leaves that
-- inherited grant in place and any signed-in user can still call it. Revoking
-- from PUBLIC is what actually closes the door.
revoke execute on function public.push_audience(text) from public, anon, authenticated;

-- SECURITY DEFINER bypasses RLS, so the staff check has to be made explicitly
-- inside the function — otherwise any signed-in user could count the academy's
-- devices.
create or replace function public.push_audience_count(p_topic text default null)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'Only academy staff can read the notification audience';
  end if;

  return (select count(*)::integer from public.push_audience(p_topic));
end;
$$;

revoke execute on function public.push_audience_count(text) from public, anon, authenticated;
grant execute on function public.push_audience_count(text) to authenticated;
