-- 004: posts, likes, comments

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null default '' check (char_length(body) <= 1000),
  match_id uuid references public.matches (id) on delete cascade,
  image_url text,
  created_at timestamptz not null default now(),
  check (body <> '' or match_id is not null or image_url is not null)
);

create index posts_author_idx on public.posts (author_id, created_at desc);
create index posts_created_idx on public.posts (created_at desc);
create index posts_match_idx on public.posts (match_id);

create table public.likes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index likes_post_idx on public.likes (post_id);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

create index comments_post_idx on public.comments (post_id, created_at);

alter table public.posts enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;

create policy "posts are publicly readable"
  on public.posts for select
  using (true);

create policy "users write posts as themselves"
  on public.posts for insert
  with check (author_id = auth.uid());

create policy "authors can edit own posts"
  on public.posts for update
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

create policy "authors can delete own posts"
  on public.posts for delete
  using (author_id = auth.uid());

create policy "likes are publicly readable"
  on public.likes for select
  using (true);

create policy "users like as themselves"
  on public.likes for insert
  with check (user_id = auth.uid());

create policy "users unlike as themselves"
  on public.likes for delete
  using (user_id = auth.uid());

create policy "comments are publicly readable"
  on public.comments for select
  using (true);

create policy "users comment as themselves"
  on public.comments for insert
  with check (author_id = auth.uid());

create policy "authors can delete own comments"
  on public.comments for delete
  using (author_id = auth.uid());
