-- 009: storage buckets + realtime publication

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true), ('post-images', 'post-images', true)
on conflict (id) do nothing;

-- Public read; authenticated users may write only inside their own
-- {auth.uid()}/... folder.
create policy "avatar and post images are publicly readable"
  on storage.objects for select
  using (bucket_id in ('avatars', 'post-images'));

create policy "users upload to their own folder"
  on storage.objects for insert
  with check (
    bucket_id in ('avatars', 'post-images')
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users update files in their own folder"
  on storage.objects for update
  using (
    bucket_id in ('avatars', 'post-images')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users delete files in their own folder"
  on storage.objects for delete
  using (
    bucket_id in ('avatars', 'post-images')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Realtime: live notification badge, feed inserts, ladder movement
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.posts;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.ladder_members;
exception when duplicate_object then null;
end $$;
