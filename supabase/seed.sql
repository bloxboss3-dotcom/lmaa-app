-- ===========================================================================
-- LMAA Family App — starter content
--
-- Optional. Run this after the migrations to load the academy's real class
-- schedule and program list so the app is useful from day one.
--
-- It contains ONLY information supplied by LMAA (the class times) plus clearly
-- marked placeholders. It invents no phone numbers, addresses, events or
-- curriculum. Everything here can be edited later from Admin.
-- ===========================================================================

-- ------------------------------------------------------------- programs --

insert into public.programs (name, slug, age_range, summary, description, sort_order, published)
values
  ('Little Tigers', 'little-tigers', 'Ages 4–5',
   'Mon & Wed 4:25 PM · Tue & Thu 3:40 PM',
   '[Program description needed] Add the official description in Admin → Programs.',
   1, true),
  ('Children White Belt', 'children-white-belt', 'Ages 6–12',
   'Mon & Wed 3:40 PM · Tue & Thu 5:00 PM',
   '[Program description needed] Add the official description in Admin → Programs.',
   2, true),
  ('Family & All-Level', 'family-all-level', 'All ages',
   'Mon & Wed 7:15 PM · Fri 6:40 PM',
   '[Program description needed] Add the official description in Admin → Programs.',
   3, true),
  ('Teen & Adult', 'teen-adult', 'Ages 13+',
   'Mon–Thu 8:00 PM',
   '[Program description needed] Add the official description in Admin → Programs.',
   4, true)
on conflict (slug) do nothing;

-- ------------------------------------------------------------- schedule --
-- Real LMAA class times. Weekday numbers are ISO: 1 = Monday … 7 = Sunday.

insert into public.schedule_entries
  (class_name, program_slug, day_of_week, start_time, end_time, age_range, level, sort_order, published)
values
  -- Little Tigers, ages 4–5
  ('Little Tigers', 'little-tigers', 1, '16:25', '16:55', 'Ages 4–5', 'All levels', 10, true),
  ('Little Tigers', 'little-tigers', 3, '16:25', '16:55', 'Ages 4–5', 'All levels', 10, true),
  ('Little Tigers', 'little-tigers', 2, '15:40', '16:10', 'Ages 4–5', 'All levels', 11, true),
  ('Little Tigers', 'little-tigers', 4, '15:40', '16:10', 'Ages 4–5', 'All levels', 11, true),

  -- Children White Belt, ages 6–12
  ('Children White Belt', 'children-white-belt', 1, '15:40', '16:20', 'Ages 6–12', 'White Belt', 20, true),
  ('Children White Belt', 'children-white-belt', 3, '15:40', '16:20', 'Ages 6–12', 'White Belt', 20, true),
  ('Children White Belt', 'children-white-belt', 2, '17:00', '17:40', 'Ages 6–12', 'White Belt', 21, true),
  ('Children White Belt', 'children-white-belt', 4, '17:00', '17:40', 'Ages 6–12', 'White Belt', 21, true),

  -- Family & All-Level
  ('Family & All-Level', 'family-all-level', 1, '19:15', '19:55', 'All ages', 'All levels', 30, true),
  ('Family & All-Level', 'family-all-level', 3, '19:15', '19:55', 'All ages', 'All levels', 30, true),
  ('Family & All-Level', 'family-all-level', 5, '18:40', '19:20', 'All ages', 'All levels', 31, true),

  -- Teen & Adult, ages 13+
  ('Teen & Adult', 'teen-adult', 1, '20:00', '20:40', 'Ages 13+', 'All levels', 40, true),
  ('Teen & Adult', 'teen-adult', 2, '20:00', '20:40', 'Ages 13+', 'All levels', 40, true),
  ('Teen & Adult', 'teen-adult', 3, '20:00', '20:40', 'Ages 13+', 'All levels', 40, true),
  ('Teen & Adult', 'teen-adult', 4, '20:00', '20:40', 'Ages 13+', 'All levels', 40, true);

-- ---------------------------------------------------------------- pages --

insert into public.pages (slug, title, body, published)
values
  ('about', 'About LMAA',
   '[Placeholder] Add the LMAA story here from Admin → Information pages.', true),
  ('privacy', 'Privacy Policy',
   '[Placeholder — must be reviewed by LMAA before launch]' || chr(10) || chr(10) ||
   'This app collects no information about students or children. No account is required. ' ||
   'Read/unread marks and preferences are stored only on your own device.', true),
  ('support', 'Support',
   '[Placeholder] Add support instructions and the best contact method.', true)
on conflict (slug) do nothing;

-- ------------------------------------------------------------- settings --
-- Left blank on purpose: the app shows an honest "not added yet" state until
-- LMAA supplies these. Fill them in from Admin → Academy information.

update public.app_settings
set academy_name = 'Lee''s Martial Arts Academy'
where id = 'default';
