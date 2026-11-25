-- Databases that already applied the public profile-images bucket pick up the
-- private setting here. A fresh database runs the same statements again.

update storage.buckets
set public = false
where id = 'profile-images';

drop policy if exists "profile_images_select" on storage.objects;
drop policy if exists "profile_images_select_own" on storage.objects;

create policy "profile_images_select_own" on storage.objects
for select to authenticated
using (
  bucket_id = 'profile-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);
