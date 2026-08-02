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
