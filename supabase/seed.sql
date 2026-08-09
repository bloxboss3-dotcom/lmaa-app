-- ===========================================================================
-- LMAA Family App — starter content
--
-- GENERATED FILE. Do not edit by hand: run `npm run seed:sql` instead, which
-- regenerates this from src/data/demo/seed.ts so the demo app and a fresh
-- Supabase project always show the same thing.
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
where id = 'default';

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

-- ------------------------------------------------------------------ FAQs --

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

-- ------------------------------------------------------- learning resources --

insert into public.learning_resources
  (title, description, type, collection, external_url, sort_order, published)
values
  ('Academy website', 'Programs, instructors, reviews and the free trial booking form.', 'link', 'resources', 'https://www.leesmartialartsacademy.com', 1, true),
  ('LMAA on Instagram', 'Photos from the mat, tournaments and events. Replies within 24 hours.', 'link', 'resources', 'https://www.instagram.com/lmaa__wilsonville', 2, true);

-- ----------------------------------------------------------------- pages --

insert into public.pages (slug, title, body, published)
values
  ('about', 'About the academy', 'Master C.Y. Lee founded Lee’s Martial Arts Academy in Wilsonville in 2005. For more than twenty years he and his instructors have taught traditional Taekwondo and HapKiDo to local families, many of whom have gone from their first white belt to black belt under the same roof.' || chr(10) || '' || chr(10) || '"I welcome you. Here you will discover that in addition to providing the best martial arts training, we also build character, respect, confidence, focus and integrity. Martial arts is a journey, and it will have a positive impact on your life and your child’s life." — Master C.Y. Lee' || chr(10) || '' || chr(10) || '- 6th Dan in Taekwondo and 6th Dan in HapKiDo' || chr(10) || '- Affiliated with Kukkiwon and World Taekwondo, so black belts earned here are recognised worldwide' || chr(10) || '- Traditional curriculum: Taekwondo, HapKiDo and practical self-defence' || chr(10) || '- Every age welcome, from Little Tigers at 4 to adults at 50+' || chr(10) || '' || chr(10) || 'The instructors' || chr(10) || '' || chr(10) || '- Master C.Y. Lee — Founder, 6th Dan Taekwondo & HapKiDo' || chr(10) || '- Instructor Kevin — Head Instructor' || chr(10) || '- Master Cameron — Assistant Instructor' || chr(10) || '- Master Jacob — Assistant Instructor' || chr(10) || '' || chr(10) || 'Families train with us from Wilsonville, Tualatin, Canby, Aurora, West Linn, Tigard, Lake Oswego and Portland.', true),
  ('tenets', 'Tenets & the LMAA Pledge', 'The kicks are how we teach. The tenets are what a student keeps for life.' || chr(10) || '' || chr(10) || '예의 · Ye-ui — Courtesy' || chr(10) || 'Respect for parents, teachers and each other, practised every single class.' || chr(10) || '' || chr(10) || '염치 · Yom-chi — Integrity' || chr(10) || 'Doing the right thing on the mat, at school and at home. Even when no one is watching.' || chr(10) || '' || chr(10) || '인내 · In-nae — Perseverance' || chr(10) || 'Fall seven times, stand up eight. Every belt is proof that effort beats talent.' || chr(10) || '' || chr(10) || '극기 · Geuk-gi — Self-Control' || chr(10) || 'Focus and discipline parents notice within weeks: in homework, chores and attitude.' || chr(10) || '' || chr(10) || '백절불굴 · Baekjul-bulgul — Indomitable Spirit' || chr(10) || 'The confidence to try, fail and try again. The quiet kind of brave that lasts long after class ends.' || chr(10) || '' || chr(10) || 'The LMAA Pledge — recited every class' || chr(10) || '' || chr(10) || '"We will practise Taekwondo with…"' || chr(10) || '' || chr(10) || '- Respect: We will always respect our parents, sir.' || chr(10) || '- Integrity: We will always set a good example, sir.' || chr(10) || '- Courtesy: We will always build a peaceful community, sir.' || chr(10) || '- Perseverance: We will never give up, sir.' || chr(10) || '- LMAA Student: We will always do our best, sir.' || chr(10) || '' || chr(10) || '"Peace on Earth begins with peace within yourself."', true),
  ('belts', 'The belt journey', 'Belts are not just colours — they are the road map. Thirteen steps from white to black, with senior stripes marking the halfway point in each colour. Tests run four times a year (March, June, September and December), so the next goal is never far away.' || chr(10) || '' || chr(10) || '- White — day one. The courage to start.' || chr(10) || '- Yellow — first skills, first confidence.' || chr(10) || '- Orange, then Senior Orange — momentum. Practice becomes habit.' || chr(10) || '- Green, then Senior Green — power with control.' || chr(10) || '- Blue, then Senior Blue — falls down. Gets back up.' || chr(10) || '- Brown, then Senior Brown — quiet leadership begins.' || chr(10) || '- Red, then Senior Red — discipline becomes second nature.' || chr(10) || '- Black — not the end. A new beginning.' || chr(10) || '' || chr(10) || 'Every black belt started at white.', true),
  ('beyond-class', 'Beyond class', 'The dojang does not sleep between classes. Dates for each of these are announced by the academy — watch the Updates tab, or ask at the front desk.' || chr(10) || '' || chr(10) || '- Summer camps: week-long themed camps, including Nerf battles, ninja obstacle courses, sparring camp and movie days.' || chr(10) || '- Birthday parties: bouncy house, ninja obstacle course and board breaking for every guest — and the birthday kid cuts the cake with a samurai sword.' || chr(10) || '- Tournaments & demo team: area schools compete twice a year in forms, breaking and sparring, and the demo team performs at school events and tournaments.' || chr(10) || '- Mom & Me, Dad & Me: parents join their child on the mat the Saturdays before Mother’s Day and Father’s Day.' || chr(10) || '- Parents Night Out, the Halloween party and the holiday potluck: pizza-and-games nights for the kids, a legendary costume party, and a year-end belt ceremony feast.', true),
  ('support', 'Support', 'Something wrong in the app?' || chr(10) || '' || chr(10) || 'Most problems clear up if you close the app completely and open it again. If the information looks out of date, check your internet connection — the app keeps the last version it downloaded so you can still read it offline.' || chr(10) || '' || chr(10) || 'If that does not fix it, tell us what you were doing and what you saw, and which phone you are using. The fastest way to reach the academy is by phone during opening hours:' || chr(10) || '' || chr(10) || '- Phone: (503) 682-2318 (Monday – Friday, 1:00 – 8:40 PM)' || chr(10) || '- Email: lmaa.wilsonville@gmail.com' || chr(10) || '- Instagram DM: @lmaa__wilsonville — replies within 24 hours' || chr(10) || '' || chr(10) || 'Questions about classes, belts, testing or membership are best asked at the front desk or by phone, not through the app.', true),
  ('privacy', 'Privacy Policy', '[Draft — must be reviewed and approved by LMAA before launch]' || chr(10) || '' || chr(10) || 'This app is built privacy-first. In this version:' || chr(10) || '' || chr(10) || '- No account is required to use the app.' || chr(10) || '- No information about students or children is collected.' || chr(10) || '- No advertising or behavioural tracking is used.' || chr(10) || '- Your read/unread marks and app preferences are stored only on your own device.' || chr(10) || '- Administrator sign-in is limited to academy staff.' || chr(10) || '' || chr(10) || 'If push notifications or family accounts are added later, this policy must be updated before those features are switched on. Questions can be sent to the academy using the contact details on the Contact screen.', true)
on conflict (slug) do nothing;
