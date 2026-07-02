-- 006: ladders, ladder membership + movement history, challenges

create table public.ladders (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references public.clubs (id) on delete cascade, -- null = open ladder
  name text not null check (char_length(name) between 2 and 60),
  description text check (char_length(description) <= 500),
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index ladders_club_idx on public.ladders (club_id);

create table public.ladder_members (
  ladder_id uuid not null references public.ladders (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  position int not null,
  created_at timestamptz not null default now(),
  primary key (ladder_id, user_id),
  unique (ladder_id, position) deferrable initially deferred
);

create index ladder_members_user_idx on public.ladder_members (user_id);
create index ladder_members_pos_idx on public.ladder_members (ladder_id, position);

-- movement log: powers the "since last week" arrows on the ladder screen
create table public.ladder_position_events (
  id uuid primary key default gen_random_uuid(),
  ladder_id uuid not null references public.ladders (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  old_position int,
  new_position int not null,
  match_id uuid references public.matches (id) on delete set null,
  created_at timestamptz not null default now()
);

create index ladder_events_ladder_idx on public.ladder_position_events (ladder_id, created_at desc);

create type public.challenge_status as enum ('pending', 'accepted', 'declined', 'completed');

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  challenger_id uuid not null references public.profiles (id) on delete cascade,
  challenged_id uuid not null references public.profiles (id) on delete cascade,
  ladder_id uuid references public.ladders (id) on delete set null,
  status public.challenge_status not null default 'pending',
  proposed_time timestamptz,
  message text check (char_length(message) <= 280),
  created_at timestamptz not null default now(),
  check (challenger_id <> challenged_id)
);

create index challenges_challenged_idx on public.challenges (challenged_id, status);
create index challenges_challenger_idx on public.challenges (challenger_id, status);

alter table public.ladders enable row level security;
alter table public.ladder_members enable row level security;
alter table public.ladder_position_events enable row level security;
alter table public.challenges enable row level security;

create policy "ladders are publicly readable"
  on public.ladders for select
  using (true);

create policy "users create ladders as themselves"
  on public.ladders for insert
  with check (created_by = auth.uid());

create policy "ladder standings are publicly readable"
  on public.ladder_members for select
  using (true);

create policy "users join ladders as themselves"
  on public.ladder_members for insert
  with check (user_id = auth.uid());

create policy "users can leave a ladder"
  on public.ladder_members for delete
  using (user_id = auth.uid());

create policy "ladder movement is publicly readable"
  on public.ladder_position_events for select
  using (true);
-- no insert/update/delete policies: only SECURITY DEFINER functions write events

create policy "participants see their challenges"
  on public.challenges for select
  using (auth.uid() = challenger_id or auth.uid() = challenged_id);

create policy "users challenge as themselves"
  on public.challenges for insert
  with check (challenger_id = auth.uid());

create policy "the challenged player answers, either side completes"
  on public.challenges for update
  using (auth.uid() = challenger_id or auth.uid() = challenged_id)
  with check (
    (auth.uid() = challenged_id and status in ('accepted', 'declined', 'completed'))
    or (auth.uid() = challenger_id and status = 'completed')
  );

-- New members enter at the bottom of the ladder.
create or replace function public.assign_ladder_position()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  select coalesce(max(position), 0) + 1
    into new.position
    from public.ladder_members
    where ladder_id = new.ladder_id;

  insert into public.ladder_position_events (ladder_id, user_id, old_position, new_position)
  values (new.ladder_id, new.user_id, null, new.position);

  return new;
end;
$$;

create trigger on_ladder_join
  before insert on public.ladder_members
  for each row execute function public.assign_ladder_position();
