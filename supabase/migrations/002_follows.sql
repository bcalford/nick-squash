-- 002: follows

create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index follows_following_idx on public.follows (following_id);

alter table public.follows enable row level security;

create policy "follow graph is readable by signed-in users"
  on public.follows for select
  using (auth.role() = 'authenticated');

create policy "users can follow as themselves"
  on public.follows for insert
  with check (follower_id = auth.uid());

create policy "users can unfollow as themselves"
  on public.follows for delete
  using (follower_id = auth.uid());
