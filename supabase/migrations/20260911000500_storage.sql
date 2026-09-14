-- Balneário 1º de Maio — private bucket for member photos
-- Photos are resized in the browser to 400x400 WebP (~20–40 KB) before upload.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('member-photos', 'member-photos', false, 204800, array['image/webp', 'image/jpeg'])
on conflict (id) do nothing;

create policy "member-photos: read (authenticated)" on storage.objects
  for select to authenticated
  using (bucket_id = 'member-photos');

create policy "member-photos: insert (admin)" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'member-photos' and public.is_admin());

create policy "member-photos: update (admin)" on storage.objects
  for update to authenticated
  using (bucket_id = 'member-photos' and public.is_admin())
  with check (bucket_id = 'member-photos' and public.is_admin());

create policy "member-photos: delete (admin)" on storage.objects
  for delete to authenticated
  using (bucket_id = 'member-photos' and public.is_admin());
