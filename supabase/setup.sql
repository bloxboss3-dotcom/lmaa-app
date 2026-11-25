-- ===========================================================================
-- LMAA Family App — complete database setup, in one file
--
-- GENERATED FILE. Do not edit by hand: run `npm run setup:sql`, which joins
-- the files in supabase/migrations (in order) and supabase/seed.sql.
--
-- How to use it: in Supabase, open SQL Editor, New query, paste this whole
-- file, and press Run. It should end with "Success. No rows returned".
--
-- It creates the tables, the security rules, the storage buckets and the
-- family-accounts tables, then loads the academy's published information
-- (contact details, class schedule, programs, FAQs, pages).
--
-- Safe to run again: it never loads anything twice and never overwrites what
-- the academy has since changed.
--
-- Contains: migrations/0001_schema.sql, migrations/0002_policies.sql, migrations/0003_storage.sql, migrations/0004_push_and_staff.sql, migrations/0005_contact_messages.sql, migrations/0006_family_accounts.sql, migrations/0007_explicit_grants.sql, seed.sql
-- ===========================================================================

-- >>>>>>>>>> migrations/0001_schema.sql >>>>>>>>>>

-- ===========================================================================
-- LMAA Family App — database schema
--
-- Run this first, then 0002_policies.sql, then 0003_storage.sql.
-- Instructions for running these: SUPABASE_SETUP.md
--
-- Design notes
--  * Every public content table carries: id, created_at, updated_at,
--    published, and (where useful) a publish time and a sort order.
--  * created_by / updated_by record which staff member touched a row. They are
--    filled in by triggers, never trusted from the browser.
--  * No table in this file holds information about students or children.
-- ===========================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- helpers --

-- Keeps updated_at honest without the client having to set it.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Stamps the signed-in staff member on insert/update.
create or replace function public.set_actor()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'INSERT') then
    new.created_by = coalesce(new.created_by, auth.uid());
  end if;
  new.updated_by = auth.uid();
  return new;
end;
$$;

-- --------------------------------------------------------- staff & roles --

do $$
begin
  if not exists (select 1 from pg_type where typname = 'staff_role') then
    create type public.staff_role as enum ('admin', 'editor');
  end if;
end
$$;

-- Staff profile. Created by the academy owner, never by public sign-up.
create table if not exists public.staff_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Role assignment. Deliberately a separate table so it can be locked down
-- completely: the browser is never allowed to write here.
create table if not exists public.user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role public.staff_role not null default 'editor',
  granted_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Role lookups run as SECURITY DEFINER so policies on other tables can call
-- them without recursing back through user_roles' own policies.
create or replace function public.lmaa_role()
returns public.staff_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.user_roles where user_id = auth.uid();
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid());
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'
  );
$$;

-- --------------------------------------------------------- announcements --

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  body text not null,
  image_url text,
  category text not null default 'important'
    check (category in ('important', 'schedule', 'testing', 'events', 'camps', 'community')),
  priority text not null default 'normal'
    check (priority in ('normal', 'high', 'urgent')),
  pinned boolean not null default false,
  published boolean not null default false,
  published_at timestamptz not null default now(),
  expires_at timestamptz,
  action_label text,
  action_url text,
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint announcements_expiry_after_publish
    check (expires_at is null or expires_at > published_at)
);

create index if not exists announcements_feed_idx
  on public.announcements (published, published_at desc);

-- ---------------------------------------------------------------- events --

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  start_at timestamptz not null,
  end_at timestamptz,
  all_day boolean not null default false,
  location text,
  address text,
  description text not null default '',
  image_url text,
  registration_url text,
  waiver_url text,
  audience text,
  featured boolean not null default false,
  published boolean not null default false,
  published_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_end_after_start check (end_at is null or end_at >= start_at)
);

create index if not exists events_start_idx on public.events (published, start_at);

-- -------------------------------------------------------------- schedule --

create table if not exists public.schedule_entries (
  id uuid primary key default gen_random_uuid(),
  class_name text not null,
  program_slug text,
  -- ISO weekday: 1 = Monday … 7 = Sunday.
  day_of_week smallint not null check (day_of_week between 1 and 7),
  start_time time not null,
  end_time time not null,
  age_range text,
  level text,
  description text,
  eligibility text,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'cancelled', 'changed')),
  status_note text,
  status_date date,
  new_start_time time,
  new_end_time time,
  published boolean not null default true,
  sort_order integer not null default 100,
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedule_end_after_start check (end_time > start_time),
  constraint schedule_new_times_together
    check ((new_start_time is null) = (new_end_time is null)),
  constraint schedule_new_end_after_start
    check (new_end_time is null or new_end_time > new_start_time)
);

create index if not exists schedule_week_idx
  on public.schedule_entries (published, day_of_week, start_time);

-- ------------------------------------------------------------- programs --

create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  age_range text,
  summary text not null default '',
  description text,
  sort_order integer not null default 100,
  published boolean not null default true,
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------- learning resources --

create table if not exists public.learning_resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  type text not null default 'video' check (type in ('video', 'document', 'link')),
  collection text not null default 'curriculum'
    check (collection in ('curriculum', 'binder', 'resources')),
  program text,
  level text,
  thumbnail_url text,
  video_url text,
  document_url text,
  external_url text,
  sort_order integer not null default 100,
  published boolean not null default true,
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists resources_collection_idx
  on public.learning_resources (published, collection, sort_order);

-- ------------------------------------------------------------------ FAQs --

create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  category text,
  sort_order integer not null default 100,
  published boolean not null default true,
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------- pages --

create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  body text not null default '',
  published boolean not null default true,
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- --------------------------------------------------------------- gallery --

create table if not exists public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  title text,
  caption text,
  image_url text not null,
  -- Who took the photo and confirmation that the people shown agreed to it.
  credit text,
  sort_order integer not null default 100,
  published boolean not null default false,
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -------------------------------------------------------------- settings --

create table if not exists public.app_settings (
  -- Exactly one row.
  id text primary key default 'default' check (id = 'default'),
  academy_name text not null default 'Lee''s Martial Arts Academy',
  tagline text,
  description text,
  phone text,
  email text,
  address_lines text[] not null default '{}',
  map_url text,
  website_url text,
  support_email text,
  office_hours text,
  social jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users (id),
  updated_at timestamptz not null default now()
);

insert into public.app_settings (id) values ('default')
on conflict (id) do nothing;

-- ------------------------------------------- notification subscriptions --

-- Device push registrations. No name, no email, no student information —
-- only an opaque provider token and the topics chosen on the device.
create table if not exists public.notification_subscriptions (
  id uuid primary key default gen_random_uuid(),
  platform text not null default 'web' check (platform in ('web', 'ios', 'android')),
  provider_id text not null unique,
  topics text[] not null default '{}',
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

-- --------------------------------------------------------------- triggers --

do $$
declare
  target text;
begin
  foreach target in array array[
    'staff_profiles', 'user_roles', 'announcements', 'events', 'schedule_entries',
    'programs', 'learning_resources', 'faqs', 'pages', 'gallery_items', 'app_settings'
  ]
  loop
    execute format(
      'drop trigger if exists set_updated_at on public.%I; ' ||
      'create trigger set_updated_at before update on public.%I ' ||
      'for each row execute function public.set_updated_at();', target, target);
  end loop;

  foreach target in array array[
    'announcements', 'events', 'schedule_entries', 'programs',
    'learning_resources', 'faqs', 'pages', 'gallery_items'
  ]
  loop
    execute format(
      'drop trigger if exists set_actor on public.%I; ' ||
      'create trigger set_actor before insert or update on public.%I ' ||
      'for each row execute function public.set_actor();', target, target);
  end loop;
end
$$;

-- >>>>>>>>>> migrations/0002_policies.sql >>>>>>>>>>

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

-- >>>>>>>>>> migrations/0003_storage.sql >>>>>>>>>>

-- ===========================================================================
-- LMAA Family App — Supabase Storage
--
-- Two buckets:
--   academy-media     public images shown in the app (event photos, gallery)
--   academy-documents public PDFs (binder, handouts, waivers)
--
-- Both are readable by anyone, because their contents are published inside a
-- public app. Only signed-in staff can upload, replace or delete.
--
-- ONLY upload material the academy owns or has written permission to use, and
-- never upload anything identifying a child without a signed photo release.
-- ===========================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'academy-media',
    'academy-media',
    true,
    10485760, -- 10 MB
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml']
  ),
  (
    'academy-documents',
    'academy-documents',
    true,
    26214400, -- 25 MB
    array['application/pdf']
  )
on conflict (id) do nothing;

-- ------------------------------------------------------------- policies --

drop policy if exists "LMAA media is publicly readable" on storage.objects;
create policy "LMAA media is publicly readable" on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('academy-media', 'academy-documents'));

drop policy if exists "Staff can upload LMAA media" on storage.objects;
create policy "Staff can upload LMAA media" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('academy-media', 'academy-documents') and public.is_staff());

drop policy if exists "Staff can replace LMAA media" on storage.objects;
create policy "Staff can replace LMAA media" on storage.objects
  for update to authenticated
  using (bucket_id in ('academy-media', 'academy-documents') and public.is_staff())
  with check (bucket_id in ('academy-media', 'academy-documents') and public.is_staff());

drop policy if exists "Staff can delete LMAA media" on storage.objects;
create policy "Staff can delete LMAA media" on storage.objects
  for delete to authenticated
  using (bucket_id in ('academy-media', 'academy-documents') and public.is_staff());

-- >>>>>>>>>> migrations/0004_push_and_staff.sql >>>>>>>>>>

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

-- >>>>>>>>>> migrations/0005_contact_messages.sql >>>>>>>>>>

-- ===========================================================================
-- LMAA Family App — messages from families
--
-- A family can send the academy a message from the app without an account.
-- The rules:
--   * anyone may INSERT a message, and only a brand-new one (status 'new');
--   * nobody but academy staff can READ messages — not the sender, not other
--     visitors, not a signed-in non-staff account;
--   * staff may mark a message handled; only an administrator may delete.
--   * sizes are bounded here as well as in the app, so a hostile client cannot
--     fill the table with megabytes of text.
--
-- Safe to re-run.
-- ===========================================================================

create table if not exists public.contact_messages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 2 and 80),
  -- An email address or phone number, whichever the family chose to give.
  contact     text not null check (char_length(contact) between 3 and 120),
  topic       text not null check (topic in ('general', 'trial', 'schedule', 'events', 'other')),
  body        text not null check (char_length(body) between 10 and 2000),
  status      text not null default 'new' check (status in ('new', 'handled')),
  created_at  timestamptz not null default now(),
  handled_at  timestamptz,
  handled_by  uuid references auth.users (id)
);

comment on table public.contact_messages is
  'Messages typed by families in the app. Private correspondence: readable by staff only.';

create index if not exists contact_messages_inbox_idx
  on public.contact_messages (status, created_at desc);

alter table public.contact_messages enable row level security;

-- Anyone may send a message. The check pins the server-managed columns so a
-- client cannot insert a message that is already "handled", or backdate one.
drop policy if exists contact_messages_public_insert on public.contact_messages;
create policy contact_messages_public_insert on public.contact_messages
  for insert to anon, authenticated
  with check (status = 'new' and handled_at is null and handled_by is null);

drop policy if exists contact_messages_staff_read on public.contact_messages;
create policy contact_messages_staff_read on public.contact_messages
  for select to authenticated
  using (public.is_staff());

drop policy if exists contact_messages_staff_update on public.contact_messages;
create policy contact_messages_staff_update on public.contact_messages
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists contact_messages_admin_delete on public.contact_messages;
create policy contact_messages_admin_delete on public.contact_messages
  for delete to authenticated
  using (public.is_admin());

-- Record who handled a message, server-side, so the client cannot claim it
-- was someone else.
create or replace function public.set_message_handler()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'handled' and (old.status is distinct from 'handled') then
    new.handled_by := auth.uid();
    new.handled_at := coalesce(new.handled_at, now());
  elsif new.status = 'new' then
    new.handled_by := null;
    new.handled_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists set_message_handler on public.contact_messages;
create trigger set_message_handler
  before update on public.contact_messages
  for each row execute function public.set_message_handler();

-- Table privileges sit underneath RLS; keep them minimal.
revoke all on public.contact_messages from anon, authenticated;
grant insert on public.contact_messages to anon, authenticated;
grant select, update, delete on public.contact_messages to authenticated;

-- >>>>>>>>>> migrations/0006_family_accounts.sql >>>>>>>>>>

-- ===========================================================================
-- LMAA Family App — family accounts
--
-- A parent can sign in with a code sent to their email and see their own
-- child's belt, stripes and class count. This is the first place the database
-- holds anything about a child, so the rules are strict and enforced here
-- rather than in the app:
--   * a child's record holds a first name, a last initial, the belt, the
--     stripes, a class count and the plan — no birthday, address or photo;
--   * a visitor with no account can read NOTHING in these tables;
--   * a signed-in parent can read only the students their own VERIFIED email
--     has been linked to by staff, and can change nothing;
--   * only academy staff can add, change or link a student; only an
--     administrator can delete one;
--   * signing up gives no access by itself: an account whose email staff have
--     not linked to a student sees an empty list.
--
-- Safe to re-run. If 0002 is ever re-run, run this file again after it (0002
-- resets the table grants).
-- ===========================================================================

create table if not exists public.students (
  id                uuid primary key default gen_random_uuid(),
  -- The student's id in the academy's own records (Dojang OS), when the row
  -- was sent from there. Empty for a student typed in by staff.
  external_id       text unique check (external_id is null or char_length(external_id) between 1 and 64),
  first_name        text not null check (char_length(btrim(first_name)) between 1 and 40),
  last_initial      text not null check (last_initial ~ '^[A-Z]$'),
  rank              text not null check (rank in (
                      'tiger_white', 'tiger_yellow', 'tiger_green', 'tiger_blue', 'tiger_red', 'tiger_black',
                      'white', 'yellow', 'orange', 'senior_orange', 'green', 'senior_green',
                      'blue', 'senior_blue', 'brown', 'senior_brown', 'red', 'senior_red', 'black')),
  stripes           smallint not null default 0 check (stripes between 0 and 3),
  classes_attended  integer check (classes_attended is null or classes_attended between 0 and 100000),
  plan              text check (plan is null or plan in ('one_year', 'black_belt_club')),
  -- False once a student has left: hidden from parents, kept for staff.
  active            boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table public.students is
  'One row per student: first name, last initial, belt, stripes, class count, plan. Readable only by staff and by parents whose verified email staff have linked.';

-- Which parent emails may view which student. Staff write these; a parent
-- never can, so nobody can link themselves to a child.
create table if not exists public.student_guardians (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.students (id) on delete cascade,
  email       text not null check (
                email = lower(email)
                and char_length(email) <= 254
                and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id) default auth.uid(),
  unique (student_id, email)
);

comment on table public.student_guardians is
  'Links a parent''s sign-in email to a student. Written by staff only.';

create index if not exists student_guardians_email_idx on public.student_guardians (email);

drop trigger if exists set_updated_at on public.students;
create trigger set_updated_at
  before update on public.students
  for each row execute function public.set_updated_at();

-- The signed-in user's email, and only once it has been confirmed. Read from
-- auth.users rather than from the token so that nothing a client can edit is
-- trusted. SECURITY DEFINER because ordinary users cannot read auth.users.
create or replace function public.verified_email()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select lower(u.email)
  from auth.users u
  where u.id = auth.uid() and u.email_confirmed_at is not null;
$$;

revoke all on function public.verified_email() from public;
grant execute on function public.verified_email() to authenticated;

alter table public.students          enable row level security;
alter table public.student_guardians enable row level security;

-- ------------------------------------------------------------- guardians --

-- A parent can see the link rows that carry their own email, which is what
-- lets the students policy below find their children. Staff see every link.
drop policy if exists student_guardians_read on public.student_guardians;
create policy student_guardians_read on public.student_guardians
  for select to authenticated
  using (public.is_staff() or email = public.verified_email());

drop policy if exists student_guardians_staff_insert on public.student_guardians;
create policy student_guardians_staff_insert on public.student_guardians
  for insert to authenticated
  with check (public.is_staff());

drop policy if exists student_guardians_staff_delete on public.student_guardians;
create policy student_guardians_staff_delete on public.student_guardians
  for delete to authenticated
  using (public.is_staff());

-- -------------------------------------------------------------- students --

drop policy if exists students_read on public.students;
create policy students_read on public.students
  for select to authenticated
  using (
    public.is_staff()
    or (
      active
      and exists (
        select 1 from public.student_guardians g
        where g.student_id = students.id and g.email = public.verified_email()
      )
    )
  );

drop policy if exists students_staff_insert on public.students;
create policy students_staff_insert on public.students
  for insert to authenticated
  with check (public.is_staff());

drop policy if exists students_staff_update on public.students;
create policy students_staff_update on public.students
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists students_admin_delete on public.students;
create policy students_admin_delete on public.students
  for delete to authenticated
  using (public.is_admin());

-- Table privileges sit underneath RLS; keep them minimal. Nothing for `anon`.
revoke all on public.students, public.student_guardians from anon, authenticated;
grant select, insert, update, delete on public.students to authenticated;
grant select, insert, delete on public.student_guardians to authenticated;

-- >>>>>>>>>> migrations/0007_explicit_grants.sql >>>>>>>>>>

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

-- >>>>>>>>>> seed.sql >>>>>>>>>>

-- ===========================================================================
-- LMAA Family App — starter content
--
-- GENERATED FILE. Do not edit by hand: run `npm run seed:sql` instead, which
-- regenerates this from src/data/demo/seed.ts so the demo app and a fresh
-- Supabase project always show the same thing.
--
-- Safe to run more than once: nothing is loaded twice, and nothing the academy
-- has since edited from Admin is overwritten.
--
-- Optional. Run this after the migrations to load the academy's own published
-- information — contact details, the weekly class schedule, the programs, the
-- FAQ answers and the academy pages — so the app is useful from day one.
--
-- It invents nothing. Events and the photo gallery are deliberately absent
-- because LMAA has not published dates or supplied images; the privacy policy
-- is a draft that must be approved before launch. Everything here can be
-- edited afterwards from Admin.
-- ===========================================================================

-- -------------------------------------------------------------- settings --

update public.app_settings set
  academy_name  = 'Lee''s Martial Arts Academy',
  tagline       = 'Traditional Taekwondo & HapKiDo in Wilsonville since 2005',
  description   = 'Lee’s Martial Arts Academy has taught traditional Taekwondo and HapKiDo to Wilsonville families since 2005. Master C.Y. Lee holds a 6th Dan in both arts, and the academy is affiliated with Kukkiwon and World Taekwondo, so black belts earned here are recognised worldwide.' || chr(10) || '' || chr(10) || 'Classes run for every age from Little Tigers at 4 through to adults at 50+, and whole families have earned their black belts together on this mat.',
  phone         = '(503) 682-2318',
  email         = 'lmaa.wilsonville@gmail.com',
  address_lines = array['8263 SW Wilsonville Rd, Ste A', 'Wilsonville, OR 97070'],
  map_url       = 'https://www.google.com/maps/search/?api=1&query=Lee''s%20Martial%20Arts%20Academy%2C%208263%20SW%20Wilsonville%20Rd%2C%20Wilsonville%2C%20OR%2097070',
  website_url   = 'https://www.leesmartialartsacademy.com',
  support_email = 'lmaa.wilsonville@gmail.com',
  office_hours  = 'Monday – Friday, 1:00 – 8:40 PM · Closed Saturday & Sunday',
  social        = '{"instagram":"https://www.instagram.com/lmaa__wilsonville"}'::jsonb
-- Only while the contact details are still blank, so a second run never
-- overwrites what the academy has since changed in Admin.
where id = 'default' and phone is null and email is null;

-- -------------------------------------------------------------- programs --

insert into public.programs (name, slug, age_range, summary, description, sort_order, published)
values
  ('Little Tigers', 'little-tigers', 'Ages 4–5', 'Thirty fast minutes, four days a week.', 'First steps on the mat for ages 4 and 5. Fast-paced 30-minute classes that teach listening, balance, coordination and courtesy, disguised as the most fun your 4-year-old has all week.' || chr(10) || '' || chr(10) || 'Meets Monday and Wednesday at 4:25 PM, and Tuesday and Thursday at 3:40 PM.', 1, true),
  ('Kids Taekwondo', 'kids-taekwondo', 'Ages 6–12 · all belt levels', 'White belt through to black, grouped by level.', 'The heart of LMAA. Belt-by-belt goal setting that becomes a habit. Parents tell us the focus and respect carry straight into homework and chores.' || chr(10) || '' || chr(10) || 'Classes are grouped by level so nobody trains above their stage: White Belt Only for beginners, then Level I through Level IV, plus Kids Sparring and Foam Sword classes later in the week.', 2, true),
  ('Teen & Adult Taekwondo', 'teen-adult', 'Ages 13 – 50+', 'Monday to Friday evenings at 8:00 PM.', 'A complete system: Taekwondo enhanced by the flowing movements of HapKiDo. Cardio, flexibility, deep-breathing focus work and self-defence that responds when it matters, all the way up to the Black Belt Club.' || chr(10) || '' || chr(10) || 'Meets Monday to Thursday at 8:00 PM, with Teen/Adult Sparring on Friday at 7:25 PM.', 3, true),
  ('Family Class', 'family-class', 'Parents and kids together', 'Wednesday 7:15 PM · Friday 6:40 PM.', 'Train together, test together, grow together — just siblings, or the whole family as a team. Whole families have earned their black belts here.' || chr(10) || '' || chr(10) || 'There is a Family Program discount when more than one family member enrols together.', 4, true)
on conflict (slug) do nothing;

-- -------------------------------------------------------------- schedule --
-- The academy's published weekly timetable.
-- Weekday numbers are ISO: 1 = Monday … 7 = Sunday.

do $seed$
begin
if not exists (select 1 from public.schedule_entries) then
insert into public.schedule_entries
  (class_name, program_slug, day_of_week, start_time, end_time, age_range, level, sort_order, published)
values
  ('White Belt Only', 'kids-taekwondo', 1, '15:40', '16:20', null, 'White belt', 1, true),
  ('Little Tigers', 'little-tigers', 1, '16:25', '16:55', 'Ages 4–5', 'All levels', 2, true),
  ('Level I', 'kids-taekwondo', 1, '17:00', '17:40', null, 'Colour belt', 3, true),
  ('Level II', 'kids-taekwondo', 1, '17:45', '18:25', null, 'Colour belt', 4, true),
  ('Level III & IV', 'kids-taekwondo', 1, '18:30', '19:10', null, 'Colour belt', 5, true),
  ('All Black Belt', null, 1, '19:15', '19:55', null, 'Black belt', 6, true),
  ('Teen, Adults & All Black Belts', 'teen-adult', 1, '20:00', '20:40', 'Ages 13+', 'All levels', 7, true),
  ('Little Tigers', 'little-tigers', 2, '15:40', '16:10', 'Ages 4–5', 'All levels', 8, true),
  ('Level II, III & IV', 'kids-taekwondo', 2, '16:15', '16:55', null, 'Colour belt', 9, true),
  ('White Belt Only', 'kids-taekwondo', 2, '17:00', '17:40', null, 'White belt', 10, true),
  ('Level I', 'kids-taekwondo', 2, '17:45', '18:25', null, 'Colour belt', 11, true),
  ('Foam Sword', 'kids-taekwondo', 2, '18:30', '19:10', null, 'Colour belt', 12, true),
  ('All Black Belt', null, 2, '19:15', '19:55', null, 'Black belt', 13, true),
  ('Teen, Adults & All Black Belts', 'teen-adult', 2, '20:00', '20:40', 'Ages 13+', 'All levels', 14, true),
  ('White Belt Only', 'kids-taekwondo', 3, '15:40', '16:20', null, 'White belt', 15, true),
  ('Little Tigers', 'little-tigers', 3, '16:25', '16:55', 'Ages 4–5', 'All levels', 16, true),
  ('Level I', 'kids-taekwondo', 3, '17:00', '17:40', null, 'Colour belt', 17, true),
  ('Level III & IV', 'kids-taekwondo', 3, '17:45', '18:25', null, 'Colour belt', 18, true),
  ('All Black Belt', null, 3, '18:30', '19:10', null, 'Black belt', 19, true),
  ('Family & All Level', 'family-class', 3, '19:15', '19:55', 'All ages', 'All levels', 20, true),
  ('Teen, Adults & All Black Belts', 'teen-adult', 3, '20:00', '20:40', 'Ages 13+', 'All levels', 21, true),
  ('Little Tigers', 'little-tigers', 4, '15:40', '16:10', 'Ages 4–5', 'All levels', 22, true),
  ('Level I', 'kids-taekwondo', 4, '16:15', '16:55', null, 'Colour belt', 23, true),
  ('White Belt Only', 'kids-taekwondo', 4, '17:00', '17:40', null, 'White belt', 24, true),
  ('Level II', 'kids-taekwondo', 4, '17:45', '18:25', null, 'Colour belt', 25, true),
  ('Black Belt Club', null, 4, '18:30', '19:10', null, 'Black belt', 26, true),
  ('All Black Belt', null, 4, '19:15', '19:55', null, 'Black belt', 27, true),
  ('Teen, Adults & All Black Belts', 'teen-adult', 4, '20:00', '20:40', 'Ages 13+', 'All levels', 28, true),
  ('Level I & II', 'kids-taekwondo', 5, '15:40', '16:20', null, 'Colour belt', 29, true),
  ('Level III & IV', 'kids-taekwondo', 5, '16:25', '17:05', null, 'Colour belt', 30, true),
  ('All Black Belts', null, 5, '17:10', '17:50', null, 'Black belt', 31, true),
  ('Kids Sparring', 'kids-taekwondo', 5, '17:55', '18:35', null, 'Colour belt', 32, true),
  ('Family & All Level', 'family-class', 5, '18:40', '19:20', 'All ages', 'All levels', 33, true),
  ('Teen/Adult Sparring & All Black Belts', 'teen-adult', 5, '19:25', '20:05', 'Ages 13+', 'All levels', 34, true);
end if;
end
$seed$;

-- ------------------------------------------------------------------ FAQs --

do $seed$
begin
if not exists (select 1 from public.faqs) then
insert into public.faqs (question, answer, category, sort_order, published)
values
  ('How young can my child start?', 'Little Tigers starts at age 4 and the children’s class at 6. Call (503) 682-2318 and we will work out the right fit together.', 'Getting started', 1, true),
  ('Do we need any experience to start?', 'None. Every black belt in the school started exactly where you are — as a white belt on day one. Beginners join year-round and are placed by age and level.', 'Getting started', 2, true),
  ('What should we wear to the first class?', 'Comfortable athletic clothes. That is it. We train barefoot on the mat, and we will sort out a uniform if you decide to continue. Arrive about 10 minutes early so we can welcome you properly.', 'Getting started', 3, true),
  ('What actually happens at my child’s first class?', 'You arrive about 10 minutes early, meet the instructor, and your child joins the right class for their age while you watch from the parent seating. Classes are 30 to 40 minutes of warm-up, technique and games. Afterwards the instructor checks in with you about how it went. Parents are welcome to watch every class, not just the first one.', 'Getting started', 4, true),
  ('How does the free trial work?', 'Four real classes over two weeks, completely free. Book online, call, or send a DM on Instagram, then show up and train.', 'Getting started', 5, true),
  ('What is Taekwondo, exactly?', 'Korea’s native martial art: literally "Tae" (foot), "Kwon" (hand), "Do" (the way). It emphasises kicking more than other martial arts, which makes it ideal for building a child’s balance, flexibility and endurance. At LMAA the curriculum is Taekwondo enhanced by HapKiDo, the "Art of Coordinated Power", which adds joint locks, escapes and flowing self-defence.', 'About the training', 6, true),
  ('Is Taekwondo safe for young kids?', 'Safety comes first on our mat. Beginners learn control, balance and falling safely long before any partner work; sparring is optional and always in full protective gear under World Taekwondo rules; and classes are grouped by age and level so nobody trains above their stage.', 'About the training', 7, true),
  ('Will martial arts make my child aggressive?', 'The opposite, and parents tell us this constantly. Taekwondo channels energy into focus and self-control. Students recite the LMAA Pledge every class, and respect for parents and teachers is trained as deliberately as any kick. Most families notice calmer, more focused behaviour at home within weeks.', 'About the training', 8, true),
  ('Can parents train with their kids?', 'Yes, and it is one of the best things about LMAA. The family class puts parents and kids on the same mat, and entire families have earned their black belts together here.', 'About the training', 9, true),
  ('How often are belt tests?', 'Four times a year: March, June, September and December. If your schedule conflicts with a test day, make-up tests are available — just talk with Master Lee beforehand.', 'Belts & testing', 10, true),
  ('We trained at another school. Do our belts transfer?', 'Yes. Master Lee will observe your skill and knowledge, discuss where you are, and match you to the equivalent level here. Your training is acknowledged, not reset.', 'Belts & testing', 11, true),
  ('Are the belts legitimate?', 'LMAA is affiliated with Kukkiwon (World Taekwondo Headquarters in Seoul) and World Taekwondo. Black belts earned here are registered and recognised worldwide, not just inside our school.', 'Belts & testing', 12, true),
  ('Do you offer family discounts?', 'Yes — there is a Family Program discount when more than one family member enrols together. Ask at the front desk or call for details.', 'Membership', 13, true),
  ('What does it cost?', 'A simple monthly membership, with the Family Program discount when more than one family member trains. Call (503) 682-2318 for current rates. Before you enrol we walk you through every cost up front, including uniforms and belt testing, so there are no surprises later.', 'Membership', 14, true);
end if;
end
$seed$;

-- ------------------------------------------------------- learning resources --

do $seed$
begin
if not exists (select 1 from public.learning_resources) then
insert into public.learning_resources
  (title, description, type, collection, external_url, sort_order, published)
values
  ('Academy website', 'Programs, instructors, reviews and the free trial booking form.', 'link', 'resources', 'https://www.leesmartialartsacademy.com', 1, true),
  ('LMAA on Instagram', 'Photos from the mat, tournaments and events. Replies within 24 hours.', 'link', 'resources', 'https://www.instagram.com/lmaa__wilsonville', 2, true);
end if;
end
$seed$;

-- ----------------------------------------------------------------- pages --

insert into public.pages (slug, title, body, published)
values
  ('about', 'About the academy', 'Master C.Y. Lee founded Lee’s Martial Arts Academy in Wilsonville in 2005. For more than twenty years he and his instructors have taught traditional Taekwondo and HapKiDo to local families, many of whom have gone from their first white belt to black belt under the same roof.' || chr(10) || '' || chr(10) || '"I welcome you. Here you will discover that in addition to providing the best martial arts training, we also build character, respect, confidence, focus and integrity. Martial arts is a journey, and it will have a positive impact on your life and your child’s life." — Master C.Y. Lee' || chr(10) || '' || chr(10) || '- 6th Dan in Taekwondo and 6th Dan in HapKiDo' || chr(10) || '- Affiliated with Kukkiwon and World Taekwondo, so black belts earned here are recognised worldwide' || chr(10) || '- Traditional curriculum: Taekwondo, HapKiDo and practical self-defence' || chr(10) || '- Every age welcome, from Little Tigers at 4 to adults at 50+' || chr(10) || '' || chr(10) || 'The instructors' || chr(10) || '' || chr(10) || '- Master C.Y. Lee — Founder, 6th Dan Taekwondo & HapKiDo' || chr(10) || '- Instructor Kevin — Head Instructor' || chr(10) || '- Master Cameron — Assistant Instructor' || chr(10) || '- Master Jacob — Assistant Instructor' || chr(10) || '' || chr(10) || 'Families train with us from Wilsonville, Tualatin, Canby, Aurora, West Linn, Tigard, Lake Oswego and Portland.', true),
  ('tenets', 'Tenets & the LMAA Pledge', 'The kicks are how we teach. The tenets are what a student keeps for life.' || chr(10) || '' || chr(10) || '예의 · Ye-ui — Courtesy' || chr(10) || 'Respect for parents, teachers and each other, practised every single class.' || chr(10) || '' || chr(10) || '염치 · Yom-chi — Integrity' || chr(10) || 'Doing the right thing on the mat, at school and at home. Even when no one is watching.' || chr(10) || '' || chr(10) || '인내 · In-nae — Perseverance' || chr(10) || 'Fall seven times, stand up eight. Every belt is proof that effort beats talent.' || chr(10) || '' || chr(10) || '극기 · Geuk-gi — Self-Control' || chr(10) || 'Focus and discipline parents notice within weeks: in homework, chores and attitude.' || chr(10) || '' || chr(10) || '백절불굴 · Baekjul-bulgul — Indomitable Spirit' || chr(10) || 'The confidence to try, fail and try again. The quiet kind of brave that lasts long after class ends.' || chr(10) || '' || chr(10) || 'The LMAA Pledge — recited every class' || chr(10) || '' || chr(10) || '"We will practise Taekwondo with…"' || chr(10) || '' || chr(10) || '- Respect: We will always respect our parents, sir.' || chr(10) || '- Integrity: We will always set a good example, sir.' || chr(10) || '- Courtesy: We will always build a peaceful community, sir.' || chr(10) || '- Perseverance: We will never give up, sir.' || chr(10) || '- LMAA Student: We will always do our best, sir.' || chr(10) || '' || chr(10) || '"Peace on Earth begins with peace within yourself."', true),
  ('belts', 'The belt journey', 'Belts are not just colours — they are the road map. Thirteen steps from white to black, with senior stripes marking the halfway point in each colour. Tests run four times a year (March, June, September and December), so the next goal is never far away.' || chr(10) || '' || chr(10) || '- White — day one. The courage to start.' || chr(10) || '- Yellow — first skills, first confidence.' || chr(10) || '- Orange, then Senior Orange — momentum. Practice becomes habit.' || chr(10) || '- Green, then Senior Green — power with control.' || chr(10) || '- Blue, then Senior Blue — falls down. Gets back up.' || chr(10) || '- Brown, then Senior Brown — quiet leadership begins.' || chr(10) || '- Red, then Senior Red — discipline becomes second nature.' || chr(10) || '- Black — not the end. A new beginning.' || chr(10) || '' || chr(10) || 'Every black belt started at white.', true),
  ('new-families', 'New to LMAA? Start here', 'Welcome to Lee’s Martial Arts Academy. These are the things new families most often wonder about in their first few weeks.' || chr(10) || '' || chr(10) || '## How a class runs' || chr(10) || '' || chr(10) || '- Students bow in.' || chr(10) || '- They line up.' || chr(10) || '- They listen the first time.' || chr(10) || '' || chr(10) || '## The belts' || chr(10) || '' || chr(10) || 'Kids, teen and adult students work up this ladder: White, Yellow, Orange, Senior Orange, Green, Senior Green, Blue, Senior Blue, Brown, Senior Brown, Red, Senior Red, then Black.' || chr(10) || '' || chr(10) || 'Little Tigers have their own belts: a white belt, then a white belt with a yellow, green, blue, red and finally a black stripe.' || chr(10) || '' || chr(10) || '## Stripes and stripe forms' || chr(10) || '' || chr(10) || 'Before a student can test for their next belt, they need two things:' || chr(10) || '' || chr(10) || '- All 3 stripes on their belt.' || chr(10) || '- All 3 stripe forms completed: blue, brown and red.' || chr(10) || '' || chr(10) || 'The stripe forms are paper sheets, and they are always by the front door. Little Tigers have their own stripe forms, different from the Kids ones.' || chr(10) || '' || chr(10) || 'What happens on test day is explained in “Getting ready for a belt test”, in the Learn tab.' || chr(10) || '' || chr(10) || '## Memberships' || chr(10) || '' || chr(10) || 'The 1-year plan goes up to green belt.' || chr(10) || '' || chr(10) || 'Black Belt Club runs all the way to black belt. It is open to everyone, and it is the natural next step for orange, senior orange and green belts nearing the end of their 1-year plan. Members get:' || chr(10) || '' || chr(10) || '- A blue uniform.' || chr(10) || '- Black Belt Club class and foam sword class.' || chr(10) || '- Sparring (sparring gear is bought separately).' || chr(10) || '- Their photo on the wall.' || chr(10) || '' || chr(10) || 'Black Belt Club is a longer-term commitment: $220 a month until your child’s expected black belt test.' || chr(10) || '' || chr(10) || '## Questions' || chr(10) || '' || chr(10) || 'Ask at the front desk, call (503) 682-2318, or send the academy a message from the More tab.', true),
  ('testing', 'Getting ready for a belt test', 'A belt test is a big day. A little preparation at home makes it a good one. Tests run four times a year: March, June, September and December.' || chr(10) || '' || chr(10) || '## Before the test' || chr(10) || '' || chr(10) || 'Every student needs:' || chr(10) || '' || chr(10) || '- All 3 stripes on their belt.' || chr(10) || '- All 3 stripe forms completed: blue, brown and red.' || chr(10) || '' || chr(10) || 'The stripe forms are paper sheets, always by the front door. Little Tigers have their own stripe forms, different from the Kids ones.' || chr(10) || '' || chr(10) || '## What to bring on test day' || chr(10) || '' || chr(10) || '- The full uniform. A student who is not in full uniform will be sent back.' || chr(10) || '- All 3 completed stripe forms.' || chr(10) || '- The board, with your family’s goal written on it at home.' || chr(10) || '' || chr(10) || '## The white belt test (Kids classes)' || chr(10) || '' || chr(10) || 'Parents watch the test. Your child shows:' || chr(10) || '' || chr(10) || '- The 9 basic movements.' || chr(10) || '- Basic Form #1.' || chr(10) || '- Front kick and axe kick.' || chr(10) || '- A parent’s phone number and your home address, from memory.' || chr(10) || '- A board break.' || chr(10) || '' || chr(10) || '## The board break' || chr(10) || '' || chr(10) || 'A parent holds the board. The goal written on the board is your family’s goal: you write it together at home, and it is a new goal every test.' || chr(10) || '' || chr(10) || '## Little Tigers tests' || chr(10) || '' || chr(10) || 'A Little Tigers test works like the Kids test, with two differences. The questions are different, and the form grows by 5 steps with each belt:' || chr(10) || '' || chr(10) || '- White belt: no form steps yet.' || chr(10) || '- Yellow stripe: 5 steps.' || chr(10) || '- Green stripe: 10 steps.' || chr(10) || '- Blue stripe: 15 steps.' || chr(10) || '- Red stripe: 20 steps.' || chr(10) || '' || chr(10) || '## Test-week checklist' || chr(10) || '' || chr(10) || '- 3 stripes on the belt.' || chr(10) || '- Blue, brown and red stripe forms done.' || chr(10) || '- Full uniform clean and ready.' || chr(10) || '- Phone number and home address memorised.' || chr(10) || '- Your family’s goal written on the board at home.' || chr(10) || '' || chr(10) || 'Test dates are announced in Updates and Events. Questions? Ask at the front desk.', true),
  ('beyond-class', 'Beyond class', 'The dojang does not sleep between classes. Dates for each of these are announced by the academy — watch the Updates tab, or ask at the front desk.' || chr(10) || '' || chr(10) || '- Summer camps: week-long themed camps, including Nerf battles, ninja obstacle courses, sparring camp and movie days.' || chr(10) || '- Birthday parties: bouncy house, ninja obstacle course and board breaking for every guest — and the birthday kid cuts the cake with a samurai sword.' || chr(10) || '- Tournaments & demo team: area schools compete twice a year in forms, breaking and sparring, and the demo team performs at school events and tournaments.' || chr(10) || '- Mom & Me, Dad & Me: parents join their child on the mat the Saturdays before Mother’s Day and Father’s Day.' || chr(10) || '- Parents Night Out, the Halloween party and the holiday potluck: pizza-and-games nights for the kids, a legendary costume party, and a year-end belt ceremony feast.', true),
  ('support', 'Support', 'Something wrong in the app?' || chr(10) || '' || chr(10) || 'Most problems clear up if you close the app completely and open it again. If the information looks out of date, check your internet connection — the app keeps the last version it downloaded so you can still read it offline.' || chr(10) || '' || chr(10) || 'If that does not fix it, tell us what you were doing and what you saw, and which phone you are using. The fastest way to reach the academy is by phone during opening hours:' || chr(10) || '' || chr(10) || '- Phone: (503) 682-2318 (Monday – Friday, 1:00 – 8:40 PM)' || chr(10) || '- Email: lmaa.wilsonville@gmail.com' || chr(10) || '- Instagram DM: @lmaa__wilsonville — replies within 24 hours' || chr(10) || '' || chr(10) || 'Questions about classes, belts, testing or membership are best asked at the front desk or by phone, not through the app.', true),
  ('privacy', 'Privacy Policy', '[Draft — must be reviewed and approved by LMAA before launch]' || chr(10) || '' || chr(10) || 'This app is built privacy-first. In this version:' || chr(10) || '' || chr(10) || '- No account is required to use the app.' || chr(10) || '- No information about students or children is collected.' || chr(10) || '- No advertising or behavioural tracking is used.' || chr(10) || '- Your read/unread marks and app preferences are stored only on your own device.' || chr(10) || '- Administrator sign-in is limited to academy staff.' || chr(10) || '- If you send the academy a message from the app, the name, contact details and message you type are stored so that staff can read and reply, and the academy can delete them at any time. Nothing from the message is kept on your device.' || chr(10) || '' || chr(10) || 'If push notifications or family accounts are added later, this policy must be updated before those features are switched on. Questions can be sent to the academy using the contact details on the Contact screen.', true)
on conflict (slug) do nothing;
