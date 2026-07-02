-- 003: matches + games with PAR-11 score enforcement

create type public.match_status as enum ('pending_confirmation', 'confirmed', 'disputed');

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles (id) on delete cascade,
  player_a uuid not null references public.profiles (id) on delete cascade,
  player_b uuid references public.profiles (id) on delete set null,
  opponent_guest_name text check (char_length(opponent_guest_name) between 1 and 60),
  best_of int not null default 5 check (best_of in (3, 5)),
  status public.match_status not null default 'pending_confirmation',
  winner_id uuid references public.profiles (id) on delete set null,
  played_at timestamptz not null default now(),
  location text,
  notes text check (char_length(notes) <= 500),
  elo_delta_a int,
  elo_delta_b int,
  created_at timestamptz not null default now(),
  -- an opponent is either a registered player or a named guest
  check (player_b is not null or opponent_guest_name is not null),
  check (player_b is null or player_a <> player_b),
  -- the logger must be one of the players
  check (created_by = player_a or created_by = player_b)
);

create index matches_player_a_idx on public.matches (player_a, played_at desc);
create index matches_player_b_idx on public.matches (player_b, played_at desc);
create index matches_status_idx on public.matches (status);
create index matches_played_at_idx on public.matches (played_at desc);

create table public.games (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  game_number int not null check (game_number between 1 and 5),
  score_a int not null check (score_a >= 0),
  score_b int not null check (score_b >= 0),
  created_at timestamptz not null default now(),
  unique (match_id, game_number),
  -- PAR-11: if the loser reached 9 or fewer the winner has exactly 11;
  -- from 10-10 (deuce) play continues until a 2-point margin (12-10, 13-11, ...)
  check (
    (least(score_a, score_b) <= 9 and greatest(score_a, score_b) = 11)
    or (least(score_a, score_b) >= 10 and greatest(score_a, score_b) = least(score_a, score_b) + 2)
  )
);

create index games_match_idx on public.games (match_id, game_number);

alter table public.matches enable row level security;
alter table public.games enable row level security;

-- match detail pages (/m/[id]) are shareable, so matches are world-readable
create policy "matches are publicly readable"
  on public.matches for select
  using (true);

create policy "players can log matches they played"
  on public.matches for insert
  with check (
    created_by = auth.uid()
    and (auth.uid() = player_a or auth.uid() = player_b)
  );

-- Only the participant who did NOT log the match can confirm or dispute it.
-- The logger can never confirm their own reported win.
create policy "opponent can confirm or dispute"
  on public.matches for update
  using (
    status = 'pending_confirmation'
    and auth.uid() <> created_by
    and (auth.uid() = player_a or auth.uid() = player_b)
  )
  with check (status in ('confirmed', 'disputed'));

create policy "creator can retract a pending match"
  on public.matches for delete
  using (created_by = auth.uid() and status = 'pending_confirmation');

create policy "games are publicly readable"
  on public.games for select
  using (true);

create policy "match creator records the games"
  on public.games for insert
  with check (
    exists (
      select 1 from public.matches m
      where m.id = match_id and m.created_by = auth.uid()
    )
  );
