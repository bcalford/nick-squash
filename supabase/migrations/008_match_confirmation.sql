-- 008: match confirmation pipeline
-- On status -> 'confirmed' a single BEFORE UPDATE trigger:
--   (a) derives winner_id from the recorded games
--   (b) applies Elo (K=32 while matches_played < 10, K=16 after; guests never rated)
--   (c) increments matches_played (rated matches only, since it drives provisional K)
--   (d) creates the auto match-result post
--   (e) inserts notifications and awards achievements
--   (f) applies the ladder rule: beating someone above you swaps positions

create or replace function public.handle_match_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_wins_a int;
  v_wins_b int;
  v_needed int;
  v_rated boolean;
  v_winner uuid;         -- null when an unregistered guest won
  v_loser uuid;
  v_winner_is_a boolean;
  v_ra int; v_rb int;    -- pre-match ratings
  v_mp_a int; v_mp_b int;
  v_ea numeric;
  v_sa int;
  v_ka int; v_kb int;
  v_streak_ok boolean;
  v_lost_first_two boolean;
  l record;
begin
  select
    count(*) filter (where score_a > score_b),
    count(*) filter (where score_b > score_a)
  into v_wins_a, v_wins_b
  from public.games
  where match_id = new.id;

  v_needed := (new.best_of + 1) / 2;
  if greatest(v_wins_a, v_wins_b) < v_needed then
    raise exception 'match cannot be confirmed: no player has won % games', v_needed;
  end if;

  v_winner_is_a := v_wins_a > v_wins_b;
  v_rated := new.player_b is not null;
  v_winner := case when v_winner_is_a then new.player_a else new.player_b end;
  v_loser  := case when v_winner_is_a then new.player_b else new.player_a end;
  new.winner_id := v_winner;

  -- (b) + (c) Elo and rated-match count — registered opponents only
  if v_rated then
    select elo_rating, matches_played into v_ra, v_mp_a from public.profiles where id = new.player_a;
    select elo_rating, matches_played into v_rb, v_mp_b from public.profiles where id = new.player_b;

    v_ea := 1.0 / (1.0 + power(10.0, (v_rb - v_ra) / 400.0));
    v_sa := case when v_winner_is_a then 1 else 0 end;
    v_ka := case when v_mp_a < 10 then 32 else 16 end;
    v_kb := case when v_mp_b < 10 then 32 else 16 end;

    new.elo_delta_a := round(v_ka * (v_sa - v_ea));
    new.elo_delta_b := round(v_kb * ((1 - v_sa) - (1.0 - v_ea)));

    update public.profiles
      set elo_rating = elo_rating + new.elo_delta_a, matches_played = matches_played + 1
      where id = new.player_a;
    update public.profiles
      set elo_rating = elo_rating + new.elo_delta_b, matches_played = matches_played + 1
      where id = new.player_b;
  end if;

  -- (d) auto match-result post by the logger
  insert into public.posts (author_id, body, match_id)
  values (new.created_by, '', new.id);

  -- (e) notify the participant who did not perform the confirmation
  if v_rated then
    insert into public.notifications (user_id, type, payload)
    values (new.created_by, 'match_confirmed', jsonb_build_object('match_id', new.id));
  end if;

  -- achievements ---------------------------------------------------------
  perform public.award_achievement(new.player_a, 'on_court');
  if new.player_b is not null then
    perform public.award_achievement(new.player_b, 'on_court');
  end if;

  if v_winner is not null then
    perform public.award_achievement(v_winner, 'first_blood');

    if v_wins_a + v_wins_b = 5 then
      perform public.award_achievement(v_winner, 'marathon');
    end if;

    if exists (
      select 1 from public.games g
      where g.match_id = new.id
        and case when v_winner_is_a then g.score_a = 11 and g.score_b = 0
                 else g.score_b = 11 and g.score_a = 0 end
    ) then
      perform public.award_achievement(v_winner, 'bagel_baker');
    end if;

    if exists (
      select 1 from public.games g
      where g.match_id = new.id
        and case when v_winner_is_a then g.score_a > g.score_b and g.score_a > 11
                 else g.score_b > g.score_a and g.score_b > 11 end
    ) then
      perform public.award_achievement(v_winner, 'nick_of_time');
    end if;

    select bool_and(
      case when v_winner_is_a then g.score_a < g.score_b else g.score_b < g.score_a end
    ) into v_lost_first_two
    from public.games g
    where g.match_id = new.id and g.game_number in (1, 2);
    if coalesce(v_lost_first_two, false) and v_wins_a + v_wins_b >= 4 then
      perform public.award_achievement(v_winner, 'comeback_kid');
    end if;

    if v_rated then
      if (case when v_winner_is_a then v_rb - v_ra else v_ra - v_rb end) >= 200 then
        perform public.award_achievement(v_winner, 'giant_slayer');
      end if;

      -- streak: the 4 previous confirmed matches were also wins (this one is the 5th)
      select count(*) = 4 and bool_and(m.winner_id = v_winner) into v_streak_ok
      from (
        select winner_id from public.matches m
        where (m.player_a = v_winner or m.player_b = v_winner)
          and m.status = 'confirmed'
          and m.id <> new.id
        order by m.played_at desc
        limit 4
      ) m;
      if coalesce(v_streak_ok, false) then
        perform public.award_achievement(v_winner, 'streaky');
      end if;

      if (case when v_winner_is_a then v_mp_a else v_mp_b end) + 1 >= 100 then
        perform public.award_achievement(v_winner, 'century');
      end if;
      if (case when v_winner_is_a then v_mp_b else v_mp_a end) + 1 >= 100 then
        perform public.award_achievement(v_loser, 'century');
      end if;
    end if;
  end if;

  -- (f) ladder rule: winner takes the loser's higher position -------------
  if v_rated and v_winner is not null then
    for l in
      select w.ladder_id, w.position as wpos, ls.position as lpos
      from public.ladder_members w
      join public.ladder_members ls on ls.ladder_id = w.ladder_id
      where w.user_id = v_winner and ls.user_id = v_loser
    loop
      if l.wpos > l.lpos then
        update public.ladder_members set position = l.lpos
          where ladder_id = l.ladder_id and user_id = v_winner;
        update public.ladder_members set position = l.wpos
          where ladder_id = l.ladder_id and user_id = v_loser;

        insert into public.ladder_position_events (ladder_id, user_id, old_position, new_position, match_id)
        values
          (l.ladder_id, v_winner, l.wpos, l.lpos, new.id),
          (l.ladder_id, v_loser, l.lpos, l.wpos, new.id);

        insert into public.notifications (user_id, type, payload)
        values
          (v_winner, 'ladder_move', jsonb_build_object('ladder_id', l.ladder_id, 'from', l.wpos, 'to', l.lpos, 'match_id', new.id)),
          (v_loser, 'ladder_move', jsonb_build_object('ladder_id', l.ladder_id, 'from', l.lpos, 'to', l.wpos, 'match_id', new.id));

        perform public.award_achievement(v_winner, 'ladder_climber');
      end if;
    end loop;
  end if;

  return new;
end;
$$;

create trigger on_match_confirmed
  before update on public.matches
  for each row
  when (old.status = 'pending_confirmation' and new.status = 'confirmed')
  execute function public.handle_match_confirmed();

-- Confirmation request + dispute notifications --------------------------------

create or replace function public.notify_match_events()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_opponent uuid;
begin
  if tg_op = 'INSERT' and new.status = 'pending_confirmation' and new.player_b is not null then
    v_opponent := case when new.created_by = new.player_a then new.player_b else new.player_a end;
    insert into public.notifications (user_id, type, payload)
    values (v_opponent, 'match_confirmation_request', jsonb_build_object('match_id', new.id));
  elsif tg_op = 'UPDATE' and old.status = 'pending_confirmation' and new.status = 'disputed' then
    insert into public.notifications (user_id, type, payload)
    values (new.created_by, 'match_disputed', jsonb_build_object('match_id', new.id));
  end if;
  return new;
end;
$$;

create trigger on_match_logged
  after insert or update on public.matches
  for each row execute function public.notify_match_events();

-- Guest matches confirm instantly (never rated). The logger calls this RPC
-- after inserting the match + games; SECURITY DEFINER bypasses the
-- opponent-only UPDATE policy, with explicit guards instead.
create or replace function public.confirm_guest_match(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_match public.matches%rowtype;
begin
  select * into v_match from public.matches where id = p_match_id;
  if not found then
    raise exception 'match not found';
  end if;
  if v_match.created_by <> auth.uid() then
    raise exception 'only the logger can finalize a guest match';
  end if;
  if v_match.player_b is not null then
    raise exception 'registered-opponent matches need opponent confirmation';
  end if;
  if v_match.status <> 'pending_confirmation' then
    return;
  end if;

  update public.matches set status = 'confirmed' where id = p_match_id;
end;
$$;
