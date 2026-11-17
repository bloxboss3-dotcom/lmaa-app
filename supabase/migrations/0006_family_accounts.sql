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
