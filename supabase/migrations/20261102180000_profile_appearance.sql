-- Profile appearance. Simulated desk only. Does not touch cash, positions, or trades.
-- A later settings screen writes these columns through the signed-in profile update.

alter table public.profiles
  add column avatar_path text,
  add column background_choice text,
  add column soundtrack_choice text;

alter table public.profiles
  add constraint profiles_avatar_path_length
    check (avatar_path is null or char_length(avatar_path) between 1 and 160),
  add constraint profiles_background_choice_length
    check (background_choice is null or char_length(background_choice) between 1 and 160),
  add constraint profiles_soundtrack_choice_length
    check (soundtrack_choice is null or char_length(soundtrack_choice) between 1 and 40);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-images',
  'profile-images',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Anyone can view a profile image. Only the owner can add, replace, or remove files
-- stored under their own user-id folder.
create policy "profile_images_select" on storage.objects
for select to public
using (bucket_id = 'profile-images');

create policy "profile_images_insert_own" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'profile-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "profile_images_update_own" on storage.objects
for update to authenticated
using (
  bucket_id = 'profile-images'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'profile-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "profile_images_delete_own" on storage.objects
for delete to authenticated
using (
  bucket_id = 'profile-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);
