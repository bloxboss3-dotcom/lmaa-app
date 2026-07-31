-- ===========================================================================
-- LMAA Family App — Row Level Security
--
-- The rules, in plain language:
--   1. A visitor with no account can read published content only, and only
--      once its publish time has passed and its expiry has not.
--   2. Editors can create and change content.
--   3. Administrators can additionally change academy information.
--   4. NOBODY can change their own role from the browser. Roles are granted by
--      the academy owner in the Supabase dashboard.
--   5. Drafts and scheduled posts are never readable by the public.
--
-- RLS is the real security boundary: the browser only ever holds the
-- publishable key, which grants the `anon` role until someone signs in.
-- ===========================================================================

alter table public.staff_profiles            enable row level security;
alter table public.user_roles                enable row level security;
alter table public.announcements             enable row level security;
alter table public.events                    enable row level security;
alter table public.schedule_entries          enable row level security;
alter table public.programs                  enable row level security;
alter table public.learning_resources        enable row level security;
alter table public.faqs                      enable row level security;
alter table public.pages                     enable row level security;
alter table public.gallery_items             enable row level security;
alter table public.app_settings              enable row level security;
alter table public.notification_subscriptions enable row level security;

-- ------------------------------------------------------- staff & roles --

drop policy if exists staff_profiles_self_read on public.staff_profiles;
create policy staff_profiles_self_read on public.staff_profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists staff_profiles_self_update on public.staff_profiles;
create policy staff_profiles_self_update on public.staff_profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- A signed-in staff member may read their OWN role, and an administrator may
-- read everyone's. There is deliberately no INSERT, UPDATE or DELETE policy:
-- without one, RLS denies every write, so the app can never promote itself.
drop policy if exists user_roles_read_own on public.user_roles;
create policy user_roles_read_own on public.user_roles
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- --------------------------------------------------------- announcements --

drop policy if exists announcements_public_read on public.announcements;
create policy announcements_public_read on public.announcements
  for select to anon, authenticated
  using (
    published
    and published_at <= now()
    and (expires_at is null or expires_at > now())
  );

drop policy if exists announcements_staff_read on public.announcements;
create policy announcements_staff_read on public.announcements
  for select to authenticated using (public.is_staff());

drop policy if exists announcements_staff_write on public.announcements;
create policy announcements_staff_write on public.announcements
  for insert to authenticated with check (public.is_staff());

drop policy if exists announcements_staff_update on public.announcements;
create policy announcements_staff_update on public.announcements
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists announcements_staff_delete on public.announcements;
create policy announcements_staff_delete on public.announcements
  for delete to authenticated using (public.is_staff());

-- ---------------------------------------------------------------- events --

drop policy if exists events_public_read on public.events;
create policy events_public_read on public.events
  for select to anon, authenticated
  using (published and published_at <= now());

drop policy if exists events_staff_read on public.events;
create policy events_staff_read on public.events
  for select to authenticated using (public.is_staff());

drop policy if exists events_staff_write on public.events;
create policy events_staff_write on public.events
  for insert to authenticated with check (public.is_staff());

drop policy if exists events_staff_update on public.events;
create policy events_staff_update on public.events
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists events_staff_delete on public.events;
create policy events_staff_delete on public.events
  for delete to authenticated using (public.is_staff());

-- ------------------------------------------------ simple content tables --
-- schedule_entries, programs, learning_resources, faqs, pages, gallery_items
-- all follow the same shape: public reads published rows, staff manage rows.

do $$
declare
  target text;
begin
  foreach target in array array[
    'schedule_entries', 'programs', 'learning_resources', 'faqs', 'pages', 'gallery_items'
  ]
  loop
    execute format('drop policy if exists %I_public_read on public.%I;', target, target);
    execute format(
      'create policy %I_public_read on public.%I for select to anon, authenticated using (published);',
      target, target);

    execute format('drop policy if exists %I_staff_read on public.%I;', target, target);
    execute format(
      'create policy %I_staff_read on public.%I for select to authenticated using (public.is_staff());',
      target, target);

    execute format('drop policy if exists %I_staff_insert on public.%I;', target, target);
    execute format(
      'create policy %I_staff_insert on public.%I for insert to authenticated with check (public.is_staff());',
      target, target);

    execute format('drop policy if exists %I_staff_update on public.%I;', target, target);
    execute format(
      'create policy %I_staff_update on public.%I for update to authenticated using (public.is_staff()) with check (public.is_staff());',
      target, target);

    execute format('drop policy if exists %I_staff_delete on public.%I;', target, target);
    execute format(
      'create policy %I_staff_delete on public.%I for delete to authenticated using (public.is_staff());',
      target, target);
  end loop;
end
$$;

-- -------------------------------------------------------------- settings --

-- Contact details are public information — every visitor can read them.
drop policy if exists app_settings_public_read on public.app_settings;
create policy app_settings_public_read on public.app_settings
  for select to anon, authenticated using (true);

-- Only administrators may change academy information (editors manage content).
drop policy if exists app_settings_admin_update on public.app_settings;
create policy app_settings_admin_update on public.app_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists app_settings_admin_insert on public.app_settings;
create policy app_settings_admin_insert on public.app_settings
  for insert to authenticated with check (public.is_admin());

-- ------------------------------------------- notification subscriptions --

-- A device may register itself for notifications, but the list of devices is
-- never readable from the browser: only staff and the server-side sender can
-- read it. There is no personal information in this table by design.
drop policy if exists notification_subscriptions_insert on public.notification_subscriptions;
create policy notification_subscriptions_insert on public.notification_subscriptions
  for insert to anon, authenticated with check (true);

drop policy if exists notification_subscriptions_staff_read on public.notification_subscriptions;
create policy notification_subscriptions_staff_read on public.notification_subscriptions
  for select to authenticated using (public.is_staff());

drop policy if exists notification_subscriptions_staff_delete on public.notification_subscriptions;
create policy notification_subscriptions_staff_delete on public.notification_subscriptions
  for delete to authenticated using (public.is_staff());

-- ---------------------------------------------------------------- grants --

-- Table privileges still apply on top of RLS; keep them minimal.
revoke all on all tables in schema public from anon, authenticated;

grant select on
  public.announcements, public.events, public.schedule_entries, public.programs,
  public.learning_resources, public.faqs, public.pages, public.gallery_items,
  public.app_settings
to anon, authenticated;

grant insert on public.notification_subscriptions to anon, authenticated;

grant insert, update, delete on
  public.announcements, public.events, public.schedule_entries, public.programs,
  public.learning_resources, public.faqs, public.pages, public.gallery_items
to authenticated;

grant update, insert on public.app_settings to authenticated;
grant select on public.user_roles, public.staff_profiles to authenticated;
grant update on public.staff_profiles to authenticated;
grant select, delete on public.notification_subscriptions to authenticated;
