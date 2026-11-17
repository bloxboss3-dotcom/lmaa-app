-- ===========================================================================
-- Security checks for the LMAA Family App database.
--
-- These assert the promises the app makes to families and to the academy:
--   * nobody can promote themselves to administrator;
--   * an administrator cannot lock the academy out by removing their own access;
--   * the list of subscribed devices is not readable by ordinary signed-in users;
--   * unpublished content is invisible to the public;
--   * a phone can still register itself for notifications.
--
-- Run against a scratch database that has had 0001–0004 applied:
--   psql -d lmaa -f supabase/tests/security.sql
--
-- Every check ROLLBACKs, so this is safe to run against a copy of production
-- data — but do not run it against production itself.
--
-- Assumes three users exist: an admin, an editor and a non-staff account.
-- Change the UUIDs below to match yours.
-- ===========================================================================

\set ON_ERROR_STOP off
\pset tuples_only on
\pset format unaligned

\set admin_id  '11111111-1111-1111-1111-111111111111'
\set editor_id '22222222-2222-2222-2222-222222222222'
\set parent_id '33333333-3333-3333-3333-333333333333'

/*
 * Reports whether a write actually changed anything.
 *
 * A write that RLS filters out raises NO error — it simply matches zero rows.
 * Judging on the exception alone would report that as "allowed", which is how
 * a broken policy passes a test suite, so this reports the row count too.
 */
create or replace function pg_temp.write_as(p_user uuid, p_sql text) returns text
language plpgsql as $$
declare n integer;
begin
  execute 'set local role authenticated';
  execute format('set local "request.jwt.claim.sub" = %L', p_user::text);
  execute p_sql;
  get diagnostics n = row_count;
  reset role;
  return case when n > 0 then 'ALLOWED (' || n || ' row(s))' else 'BLOCKED (0 rows)' end;
exception when others then
  reset role;
  return 'BLOCKED (' || split_part(SQLERRM, E'\n', 1) || ')';
end $$;

/*
 * Calls a scalar function and reports the value or the refusal.
 *
 * Deliberately assigns the result into a variable. Wrapping the call in
 * `select count(*) from (...)` instead lets the planner drop the unused output
 * column and never call the function at all, so a function that WOULD have
 * raised looks like it succeeded. That mistake made an earlier version of this
 * file report a real access check as passing.
 */
create or replace function pg_temp.call_as(p_role text, p_user uuid, p_sql text) returns text
language plpgsql as $$
declare result text;
begin
  execute format('set local role %I', p_role);
  if p_user is not null then
    execute format('set local "request.jwt.claim.sub" = %L', p_user::text);
  end if;
  execute 'select (' || p_sql || ')::text' into result;
  reset role;
  return 'ALLOWED (returned ' || coalesce(result, 'null') || ')';
exception when others then
  reset role;
  return 'BLOCKED (' || split_part(SQLERRM, E'\n', 1) || ')';
end $$;

/** Reports how many rows a role can actually see. */
create or replace function pg_temp.rows_visible_as(p_role text, p_user uuid, p_sql text)
returns text language plpgsql as $$
declare n integer;
begin
  execute format('set local role %I', p_role);
  if p_user is not null then
    execute format('set local "request.jwt.claim.sub" = %L', p_user::text);
  end if;
  execute 'select count(*) from (' || p_sql || ') _q' into n;
  reset role;
  return case when n > 0 then 'VISIBLE (' || n || ' row(s))' else 'HIDDEN (0 rows)' end;
exception when others then
  reset role;
  return 'BLOCKED (' || split_part(SQLERRM, E'\n', 1) || ')';
end $$;

\echo ''
\echo '=== Nobody can escalate their own access  (all must be BLOCKED) ==='
begin; select 'editor promotes self         -> ' || pg_temp.write_as(:'editor_id', format('update public.user_roles set role=''admin'' where user_id=%L', :'editor_id')); rollback;
begin; select 'editor inserts own admin row -> ' || pg_temp.write_as(:'editor_id', format('insert into public.user_roles (user_id, role) values (%L,''admin'')', :'editor_id')); rollback;
begin; select 'non-staff grants self a role -> ' || pg_temp.write_as(:'parent_id', format('insert into public.user_roles (user_id, role) values (%L,''admin'')', :'parent_id')); rollback;

\echo ''
\echo '=== An administrator cannot lock the academy out  (all must be BLOCKED) ==='
begin; select 'admin demotes self           -> ' || pg_temp.write_as(:'admin_id', format('update public.user_roles set role=''editor'' where user_id=%L', :'admin_id')); rollback;
begin; select 'admin deletes own access     -> ' || pg_temp.write_as(:'admin_id', format('delete from public.user_roles where user_id=%L', :'admin_id')); rollback;

\echo ''
\echo '=== An administrator CAN manage other staff  (all must be ALLOWED) ==='
begin; select 'admin promotes the editor    -> ' || pg_temp.write_as(:'admin_id', format('update public.user_roles set role=''admin'' where user_id=%L', :'editor_id')); rollback;
begin; select 'admin revokes the editor     -> ' || pg_temp.write_as(:'admin_id', format('delete from public.user_roles where user_id=%L', :'editor_id')); rollback;

\echo ''
\echo '=== The device list is not public ==='
begin; select 'staff  audience count        -> ' || pg_temp.call_as('authenticated', :'editor_id', 'select public.push_audience_count(null)'); rollback;
begin; select 'parent audience count        -> ' || pg_temp.call_as('authenticated', :'parent_id', 'select public.push_audience_count(null)'); rollback;
begin; select 'parent device list           -> ' || pg_temp.rows_visible_as('authenticated', :'parent_id', 'select * from public.push_audience(null)'); rollback;
begin; select 'anon   device list           -> ' || pg_temp.rows_visible_as('anon', null, 'select * from public.push_audience(null)'); rollback;
begin; select 'parent subscriptions table   -> ' || pg_temp.rows_visible_as('authenticated', :'parent_id', 'select * from public.notification_subscriptions'); rollback;
begin; select 'staff  subscriptions table   -> ' || pg_temp.rows_visible_as('authenticated', :'editor_id', 'select * from public.notification_subscriptions'); rollback;

\echo ''
\echo '=== Unpublished content is invisible to the public ==='
begin;
  insert into public.announcements (title, body, published, published_at)
    values ('Security check draft', 'x', false, now());
  select 'anon reads a draft           -> ' || pg_temp.rows_visible_as('anon', null, 'select * from public.announcements where title=''Security check draft''');
  select 'staff reads a draft          -> ' || pg_temp.rows_visible_as('authenticated', :'editor_id', 'select * from public.announcements where title=''Security check draft''');
rollback;

\echo ''
\echo '=== A phone can register itself, but only through the function ==='
begin; select 'anon registers a device      -> ' || pg_temp.call_as('anon', null, 'select public.register_push_device(''https://push.example/security-check-endpoint'',''k'',''a'',''{}'',''web'')'); rollback;
begin; select 'anon writes the table direct -> ' || pg_temp.write_as(:'parent_id', 'insert into public.notification_subscriptions (platform, provider_id) values (''web'',''https://push.example/direct-write-attempt'')'); rollback;
\echo ''

-- ===========================================================================
-- Messages from families (0005)
-- ===========================================================================

/** Like write_as, but for any role — anonymous visitors send messages too. */
create or replace function pg_temp.write_as_role(p_role text, p_user uuid, p_sql text) returns text
language plpgsql as $$
declare n integer;
begin
  execute format('set local role %I', p_role);
  if p_user is not null then
    execute format('set local "request.jwt.claim.sub" = %L', p_user::text);
  end if;
  execute p_sql;
  get diagnostics n = row_count;
  reset role;
  return case when n > 0 then 'ALLOWED (' || n || ' row(s))' else 'BLOCKED (0 rows)' end;
exception when others then
  reset role;
  return 'BLOCKED (' || split_part(SQLERRM, E'\n', 1) || ')';
end $$;

begin;
select 'EXPECT ALLOWED — a visitor can send a message: ' || pg_temp.write_as_role('anon', null,
  $q$insert into public.contact_messages (name, contact, topic, body)
     values ('A parent', 'parent@example.com', 'trial', 'Can my son try a class on Saturday?')$q$);
select 'EXPECT BLOCKED — a visitor cannot send a pre-handled message: ' || pg_temp.write_as_role('anon', null,
  $q$insert into public.contact_messages (name, contact, topic, body, status)
     values ('A parent', 'parent@example.com', 'trial', 'Can my son try a class on Saturday?', 'handled')$q$);
select 'EXPECT BLOCKED — a visitor cannot send an oversized message: ' || pg_temp.write_as_role('anon', null,
  $q$insert into public.contact_messages (name, contact, topic, body)
     values ('A parent', 'parent@example.com', 'trial', repeat('x', 2001))$q$);
select 'EXPECT HIDDEN/BLOCKED — a visitor cannot read messages: ' ||
  pg_temp.rows_visible_as('anon', null, 'select 1 from public.contact_messages');
select 'EXPECT HIDDEN — a signed-in non-staff account cannot read messages: ' ||
  pg_temp.rows_visible_as('authenticated', :'parent_id', 'select 1 from public.contact_messages');
select 'EXPECT VISIBLE — an editor can read messages: ' ||
  pg_temp.rows_visible_as('authenticated', :'editor_id', 'select 1 from public.contact_messages');
select 'EXPECT ALLOWED — an editor can mark a message handled: ' || pg_temp.write_as(:'editor_id',
  $q$update public.contact_messages set status = 'handled' where name = 'A parent'$q$);
select 'EXPECT handled_by = editor — the server records who handled it: ' ||
  coalesce((select handled_by::text from public.contact_messages where name = 'A parent' limit 1), 'null');
select 'EXPECT BLOCKED — an editor cannot delete a message: ' || pg_temp.write_as(:'editor_id',
  $q$delete from public.contact_messages where name = 'A parent'$q$);
select 'EXPECT ALLOWED — an administrator can delete a message: ' || pg_temp.write_as(:'admin_id',
  $q$delete from public.contact_messages where name = 'A parent'$q$);
rollback;

-- ===========================================================================
-- Family accounts (0006)
--
-- Assumes the three users above each have a confirmed email in auth.users:
-- admin@, editor@ and parent@lmaa.test. A fourth account, stranger_id, is a
-- signed-in parent nobody has linked, and unverified_id has the SAME email as
-- the parent but has never confirmed it.
-- ===========================================================================

\set stranger_id   '44444444-4444-4444-4444-444444444444'
\set unverified_id '55555555-5555-5555-5555-555555555555'

begin;
insert into public.students (id, first_name, last_initial, rank, stripes)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 'Zz Linked', 'A', 'white', 2),
         ('aaaaaaaa-0000-0000-0000-000000000002', 'Zz Other', 'B', 'tiger_yellow', 0),
         ('aaaaaaaa-0000-0000-0000-000000000003', 'Zz Left', 'C', 'green', 1);
update public.students set active = false where id = 'aaaaaaaa-0000-0000-0000-000000000003';
insert into public.student_guardians (student_id, email)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 'parent@lmaa.test'),
         ('aaaaaaaa-0000-0000-0000-000000000003', 'parent@lmaa.test'),
         ('aaaaaaaa-0000-0000-0000-000000000002', 'someone.else@lmaa.test');

select 'EXPECT HIDDEN/BLOCKED — a visitor cannot read students: ' ||
  pg_temp.rows_visible_as('anon', null, 'select 1 from public.students');
select 'EXPECT HIDDEN/BLOCKED — a visitor cannot read parent emails: ' ||
  pg_temp.rows_visible_as('anon', null, 'select 1 from public.student_guardians');
select 'EXPECT VISIBLE (1 row) — a parent sees only their own active child: ' ||
  pg_temp.rows_visible_as('authenticated', :'parent_id', 'select 1 from public.students');
select 'EXPECT HIDDEN — a parent cannot see another family''s child: ' ||
  pg_temp.rows_visible_as('authenticated', :'parent_id',
    $q$select 1 from public.students where first_name = 'Zz Other'$q$);
select 'EXPECT HIDDEN — a parent cannot see a child who has left: ' ||
  pg_temp.rows_visible_as('authenticated', :'parent_id',
    $q$select 1 from public.students where first_name = 'Zz Left'$q$);
select 'EXPECT VISIBLE (2 rows) — a parent sees only their own link rows: ' ||
  pg_temp.rows_visible_as('authenticated', :'parent_id', 'select 1 from public.student_guardians');
select 'EXPECT HIDDEN — a parent cannot see another family''s email: ' ||
  pg_temp.rows_visible_as('authenticated', :'parent_id',
    $q$select 1 from public.student_guardians where email = 'someone.else@lmaa.test'$q$);
select 'EXPECT HIDDEN — a signed-in account nobody linked sees no students: ' ||
  pg_temp.rows_visible_as('authenticated', :'stranger_id', 'select 1 from public.students');
select 'EXPECT HIDDEN — an unconfirmed account with the parent''s email sees no students: ' ||
  pg_temp.rows_visible_as('authenticated', :'unverified_id', 'select 1 from public.students');
select 'EXPECT BLOCKED — a parent cannot change their child''s belt: ' || pg_temp.write_as(:'parent_id',
  $q$update public.students set rank = 'black' where first_name = 'Zz Linked'$q$);
select 'EXPECT BLOCKED — a parent cannot add a student: ' || pg_temp.write_as(:'parent_id',
  $q$insert into public.students (first_name, last_initial, rank) values ('Zz Mine', 'D', 'white')$q$);
select 'EXPECT BLOCKED — a stranger cannot link themselves to a child: ' || pg_temp.write_as(:'stranger_id',
  $q$insert into public.student_guardians (student_id, email)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'stranger@lmaa.test')$q$);
select 'EXPECT BLOCKED — a parent cannot remove another parent''s link: ' || pg_temp.write_as(:'parent_id',
  $q$delete from public.student_guardians where email = 'someone.else@lmaa.test'$q$);
select 'EXPECT BLOCKED — a visitor cannot add a student: ' || pg_temp.write_as_role('anon', null,
  $q$insert into public.students (first_name, last_initial, rank) values ('Zz Anon', 'E', 'white')$q$);
select 'EXPECT VISIBLE (3 rows) — an editor sees every student: ' ||
  pg_temp.rows_visible_as('authenticated', :'editor_id', 'select 1 from public.students');
select 'EXPECT ALLOWED — an editor can add a stripe: ' || pg_temp.write_as(:'editor_id',
  $q$update public.students set stripes = 3 where first_name = 'Zz Linked'$q$);
select 'EXPECT BLOCKED — a fourth stripe is refused: ' || pg_temp.write_as(:'editor_id',
  $q$update public.students set stripes = 4 where first_name = 'Zz Linked'$q$);
select 'EXPECT BLOCKED — a belt the academy does not use is refused: ' || pg_temp.write_as(:'editor_id',
  $q$update public.students set rank = 'senior_yellow' where first_name = 'Zz Linked'$q$);
select 'EXPECT BLOCKED — a full surname is refused: ' || pg_temp.write_as(:'editor_id',
  $q$update public.students set last_initial = 'Smith' where first_name = 'Zz Linked'$q$);
select 'EXPECT ALLOWED — an editor can link a parent: ' || pg_temp.write_as(:'editor_id',
  $q$insert into public.student_guardians (student_id, email)
     values ('aaaaaaaa-0000-0000-0000-000000000002', 'parent@lmaa.test')$q$);
select 'EXPECT BLOCKED — a mixed-case email is refused (it would never match): ' || pg_temp.write_as(:'editor_id',
  $q$insert into public.student_guardians (student_id, email)
     values ('aaaaaaaa-0000-0000-0000-000000000002', 'Parent2@LMAA.test')$q$);
select 'EXPECT BLOCKED — an editor cannot delete a student: ' || pg_temp.write_as(:'editor_id',
  $q$delete from public.students where first_name = 'Zz Other'$q$);
select 'EXPECT ALLOWED — an administrator can delete a student: ' || pg_temp.write_as(:'admin_id',
  $q$delete from public.students where first_name = 'Zz Other'$q$);
rollback;
