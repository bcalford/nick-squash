-- 007: achievements (+ seed data) and notifications

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null,
  icon text not null, -- emoji
  criteria jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.user_achievements (
  user_id uuid not null references public.profiles (id) on delete cascade,
  achievement_id uuid not null references public.achievements (id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create index user_achievements_user_idx on public.user_achievements (user_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in (
    'match_confirmation_request', 'match_confirmed', 'match_disputed',
    'new_follower', 'challenge_received', 'challenge_answered',
    'achievement_earned', 'ladder_move', 'post_liked', 'post_commented'
  )),
  payload jsonb not null default '{}'::jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, read, created_at desc);

alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.notifications enable row level security;

create policy "achievement catalog is publicly readable"
  on public.achievements for select
  using (true);

create policy "earned achievements are publicly readable"
  on public.user_achievements for select
  using (true);
-- no client writes: achievements are awarded by SECURITY DEFINER functions only

create policy "users read own notifications"
  on public.notifications for select
  using (user_id = auth.uid());

create policy "users mark own notifications read"
  on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
-- no client inserts: notifications come from SECURITY DEFINER triggers only

-- Awarding helper used by every trigger that grants achievements.
create or replace function public.award_achievement(p_user uuid, p_code text)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_achievement public.achievements%rowtype;
  v_inserted boolean;
begin
  select * into v_achievement from public.achievements where code = p_code;
  if not found then
    return;
  end if;

  insert into public.user_achievements (user_id, achievement_id)
  values (p_user, v_achievement.id)
  on conflict do nothing
  returning true into v_inserted;

  if v_inserted then
    insert into public.notifications (user_id, type, payload)
    values (p_user, 'achievement_earned', jsonb_build_object(
      'achievement_code', v_achievement.code,
      'achievement_name', v_achievement.name,
      'icon', v_achievement.icon
    ));
  end if;
end;
$$;

-- Seed the catalog (12 achievements)
insert into public.achievements (code, name, description, icon, criteria) values
  ('on_court',        'On Court',        'Play your first confirmed match',                          '🎾', '{"confirmed_matches": 1}'),
  ('first_blood',     'First Blood',     'Win your first confirmed match',                           '🩸', '{"wins": 1}'),
  ('marathon',        'Marathon',        'Win a match that goes the full five games',                '🏃', '{"games_in_match": 5, "result": "win"}'),
  ('bagel_baker',     'Bagel Baker',     'Win a game 11–0',                                          '🥯', '{"game_score": [11, 0]}'),
  ('nick_of_time',    'Nick of Time',    'Win a game in extra points beyond 11',                     '⏱️', '{"game_winning_score_gt": 11}'),
  ('comeback_kid',    'Comeback Kid',    'Win a match after losing the first two games',             '🔄', '{"down": 2, "result": "win"}'),
  ('streaky',         'Streaky',         'Win five confirmed matches in a row',                      '🔥', '{"win_streak": 5}'),
  ('giant_slayer',    'Giant Slayer',    'Beat a player rated 200+ Elo above you',                   '🗡️', '{"elo_gap": 200}'),
  ('century',         'Century',         'Play 100 rated matches',                                   '💯', '{"rated_matches": 100}'),
  ('club_founder',    'Club Founder',    'Found a club',                                             '🏛️', '{"clubs_created": 1}'),
  ('ladder_climber',  'Ladder Climber',  'Take someone''s spot on a ladder',                         '🪜', '{"ladder_swaps": 1}'),
  ('social_butterfly','Social Butterfly','Follow ten players',                                       '🦋', '{"following": 10}');

-- Social notification triggers -----------------------------------------------

create or replace function public.notify_new_follower()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_count int;
begin
  insert into public.notifications (user_id, type, payload)
  values (new.following_id, 'new_follower', jsonb_build_object('follower_id', new.follower_id));

  select count(*) into v_count from public.follows where follower_id = new.follower_id;
  if v_count >= 10 then
    perform public.award_achievement(new.follower_id, 'social_butterfly');
  end if;

  return new;
end;
$$;

create trigger on_follow_created
  after insert on public.follows
  for each row execute function public.notify_new_follower();

create or replace function public.notify_challenge()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.notifications (user_id, type, payload)
    values (new.challenged_id, 'challenge_received', jsonb_build_object(
      'challenge_id', new.id,
      'challenger_id', new.challenger_id,
      'ladder_id', new.ladder_id
    ));
  elsif tg_op = 'UPDATE' and old.status = 'pending' and new.status in ('accepted', 'declined') then
    insert into public.notifications (user_id, type, payload)
    values (new.challenger_id, 'challenge_answered', jsonb_build_object(
      'challenge_id', new.id,
      'challenged_id', new.challenged_id,
      'answer', new.status::text
    ));
  end if;
  return new;
end;
$$;

create trigger on_challenge_change
  after insert or update on public.challenges
  for each row execute function public.notify_challenge();

create or replace function public.notify_club_founder()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  perform public.award_achievement(new.created_by, 'club_founder');
  return new;
end;
$$;

create trigger on_club_founded
  after insert on public.clubs
  for each row execute function public.notify_club_founder();
