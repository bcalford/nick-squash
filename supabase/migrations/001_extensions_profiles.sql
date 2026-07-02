-- 001: extensions, enums, profiles + auto-creation trigger
-- Run these files in order in the Supabase SQL editor.

create extension if not exists citext with schema extensions;

create type public.skill_level as enum ('beginner', 'intermediate', 'advanced', 'competitive');
create type public.dominant_hand as enum ('left', 'right');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username citext unique check (username ~ '^[a-zA-Z0-9_]{3,20}$'),
  display_name text,
  avatar_url text,
  bio text check (char_length(bio) <= 280),
  club_id uuid, -- FK added in 005_clubs.sql
  dominant_hand public.dominant_hand,
  skill_level public.skill_level,
  elo_rating int not null default 1200,
  matches_played int not null default 0, -- rated (confirmed, both registered) matches; drives provisional K
  city text,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create index profiles_city_idx on public.profiles (city);
create index profiles_elo_idx on public.profiles (elo_rating desc);
create index profiles_club_idx on public.profiles (club_id);

alter table public.profiles enable row level security;

create policy "profiles are readable when public or own"
  on public.profiles for select
  using (is_public or id = auth.uid());

create policy "users can update own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Profile rows are created server-side by this trigger the moment the auth
-- user exists (username stays null until onboarding completes), so a dropped
-- client connection can never leave an orphaned auth user without a profile.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
