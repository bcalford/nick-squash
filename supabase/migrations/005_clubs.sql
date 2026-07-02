-- 005: clubs + membership; wires up profiles.club_id

create type public.club_role as enum ('member', 'admin');

create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 60),
  city text,
  description text check (char_length(description) <= 500),
  avatar_url text,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index clubs_city_idx on public.clubs (city);

create table public.club_members (
  club_id uuid not null references public.clubs (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.club_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (club_id, user_id)
);

create index club_members_user_idx on public.club_members (user_id);

alter table public.profiles
  add constraint profiles_club_fk
  foreign key (club_id) references public.clubs (id) on delete set null;

alter table public.clubs enable row level security;
alter table public.club_members enable row level security;

create policy "clubs are publicly readable"
  on public.clubs for select
  using (true);

create policy "users create clubs as themselves"
  on public.clubs for insert
  with check (created_by = auth.uid());

create policy "club admins can edit the club"
  on public.clubs for update
  using (
    exists (
      select 1 from public.club_members cm
      where cm.club_id = id and cm.user_id = auth.uid() and cm.role = 'admin'
    )
  );

create policy "club membership is publicly readable"
  on public.club_members for select
  using (true);

create policy "users join clubs as regular members"
  on public.club_members for insert
  with check (user_id = auth.uid() and role = 'member');

create policy "members can leave, admins can remove"
  on public.club_members for delete
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.club_members cm
      where cm.club_id = club_members.club_id
        and cm.user_id = auth.uid()
        and cm.role = 'admin'
    )
  );

-- The founder joins automatically as admin (bypasses the member-only insert policy).
create or replace function public.handle_new_club()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  insert into public.club_members (club_id, user_id, role)
  values (new.id, new.created_by, 'admin');
  return new;
end;
$$;

create trigger on_club_created
  after insert on public.clubs
  for each row execute function public.handle_new_club();
