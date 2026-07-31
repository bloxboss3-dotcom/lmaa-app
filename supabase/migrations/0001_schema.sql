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
