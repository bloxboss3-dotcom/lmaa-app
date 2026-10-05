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
