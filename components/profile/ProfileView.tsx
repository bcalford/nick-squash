import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PROFILE_LITE, type MatchWithGames, type ProfileLite } from "@/lib/feed";
import { absoluteEloSeries, computeHeadToHead, computeStats, didWin } from "@/lib/stats";
import { Avatar } from "@/components/ui/Avatar";
import { Chip } from "@/components/ui/Chip";
import { SectionHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FlameIcon, ChevronRightIcon, TrophyIcon } from "@/components/icons";
import { StatsCharts } from "@/components/profile/StatsCharts";
import { AchievementsGrid } from "@/components/profile/AchievementsGrid";
import { FollowButton } from "@/components/profile/FollowButton";
import { FollowStats } from "@/components/profile/FollowStats";
import { OwnProfileActions } from "@/components/profile/OwnProfileActions";
import { timeAgo } from "@/lib/time";

const MATCH_SELECT = `*,
  games(*),
  player_a_profile:profiles!matches_player_a_fkey(${PROFILE_LITE}),
  player_b_profile:profiles!matches_player_b_fkey(${PROFILE_LITE})`;

function matchOpponent(m: MatchWithGames, playerId: string): { name: string; profile: ProfileLite | null } {
  if (m.player_a === playerId) {
    return {
      name:
        m.player_b_profile?.display_name ??
        m.player_b_profile?.username ??
        m.opponent_guest_name ??
        "Guest",
      profile: m.player_b_profile,
    };
  }
  return {
    name: m.player_a_profile?.display_name ?? m.player_a_profile?.username ?? "Player",
    profile: m.player_a_profile,
  };
}

export async function ProfileView({ username }: { username: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const viewerId = user?.id ?? null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();
  if (!profile) notFound();

  const isOwner = viewerId === profile.id;

  const [
    { data: matches },
    { data: achievements },
    { data: earned },
    { count: followerCount },
    { count: followingCount },
    { data: viewerFollow },
    club,
  ] = await Promise.all([
    supabase
      .from("matches")
      .select(MATCH_SELECT)
      .or(`player_a.eq.${profile.id},player_b.eq.${profile.id}`)
      .order("played_at", { ascending: false })
      .limit(200)
      .returns<MatchWithGames[]>(),
    supabase.from("achievements").select("*").order("created_at"),
    supabase.from("user_achievements").select("achievement_id").eq("user_id", profile.id),
    supabase
      .from("follows")
      .select("follower_id", { count: "exact", head: true })
      .eq("following_id", profile.id),
    supabase
      .from("follows")
      .select("follower_id", { count: "exact", head: true })
      .eq("follower_id", profile.id),
    viewerId
      ? supabase
          .from("follows")
          .select("follower_id")
          .eq("follower_id", viewerId)
          .eq("following_id", profile.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    profile.club_id
      ? supabase.from("clubs").select("id, name").eq("id", profile.club_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const allMatches = (matches ?? []).map((m) => ({
    ...m,
    games: [...m.games].sort((a, b) => a.game_number - b.game_number),
  }));
  const stats = computeStats(allMatches, profile.id);
  const eloSeries = absoluteEloSeries(stats.eloSeries, profile.elo_rating);
  const headToHead = computeHeadToHead(allMatches, profile.id);
  const profilesById = new Map<string, ProfileLite>();
  for (const m of allMatches) {
    if (m.player_a_profile) profilesById.set(m.player_a_profile.id, m.player_a_profile);
    if (m.player_b_profile) profilesById.set(m.player_b_profile.id, m.player_b_profile);
  }

  const confirmed = allMatches.filter((m) => m.status === "confirmed");
  const needsMyConfirmation = isOwner
    ? allMatches.filter((m) => m.status === "pending_confirmation" && m.created_by !== profile.id)
    : [];

  const displayName = profile.display_name ?? profile.username ?? "Player";
  const earnedIds = new Set((earned ?? []).map((e) => e.achievement_id));

  return (
    <div className="mx-auto max-w-lg">
      {/* header */}
      <header className="flex flex-col items-center gap-3 px-4 pb-2 pt-6">
        <Avatar src={profile.avatar_url} name={displayName} size={96} />
        <div className="text-center">
          <h1 className="text-[28px] font-extrabold leading-tight">{displayName}</h1>
          <p className="text-[15px] text-ink-2">
            @{profile.username}
            {profile.city ? ` · ${profile.city}` : ""}
            {club.data ? ` · ${club.data.name}` : ""}
          </p>
          {profile.bio ? (
            <p className="mx-auto mt-1 max-w-[300px] text-[14px] leading-snug text-ink-2">
              {profile.bio}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          <span className="gradient-signature tnum rounded-full px-5 py-2 text-[22px] font-extrabold shadow-md">
            {profile.elo_rating}
          </span>
          <div className="flex flex-col">
            <span className="tnum text-[17px] font-extrabold">
              {stats.wins}–{stats.losses}
            </span>
            <span className="text-[12px] font-semibold uppercase tracking-wide text-ink-3">
              Record
            </span>
          </div>
          {stats.streak >= 3 && (
            <span className="flex items-center gap-1 rounded-full bg-coral-soft px-3 py-1.5 text-[15px] font-extrabold text-coral">
              <FlameIcon size={18} /> {stats.streak}
            </span>
          )}
        </div>

        <FollowStats
          userId={profile.id}
          followerCount={followerCount ?? 0}
          followingCount={followingCount ?? 0}
        />

        {isOwner ? (
          <OwnProfileActions profile={profile} />
        ) : (
          <FollowButton
            targetId={profile.id}
            viewerId={viewerId}
            initialFollowing={Boolean(viewerFollow)}
            size="md"
          />
        )}
      </header>

      {needsMyConfirmation.length > 0 && (
        <>
          <SectionHeader>Needs your confirmation</SectionHeader>
          <div className="card hairline mx-4 overflow-hidden">
            {needsMyConfirmation.map((m) => {
              const opp = matchOpponent(m, profile.id);
              return (
                <Link
                  key={m.id}
                  href={`/m/${m.id}`}
                  className="flex items-center gap-3 px-4 py-3 active:bg-inset"
                >
                  <span className="min-w-0 flex-1 text-[15px] font-semibold">
                    vs {opp.name}
                  </span>
                  <Chip tone="coral">Review</Chip>
                  <ChevronRightIcon size={16} className="text-ink-3" />
                </Link>
              );
            })}
          </div>
        </>
      )}

      {confirmed.length === 0 ? (
        <EmptyState
          icon={<TrophyIcon />}
          title={isOwner ? "No matches yet" : `${displayName} hasn’t played yet`}
          message={
            isOwner
              ? "Log your first match to start your Elo journey."
              : "Check back after their first match."
          }
        />
      ) : (
        <StatsCharts stats={{ ...stats, eloSeries }} />
      )}

      <AchievementsGrid achievements={achievements ?? []} earnedIds={earnedIds} />

      {headToHead.length > 0 && (
        <>
          <SectionHeader>Head to head</SectionHeader>
          <div className="card hairline mx-4 overflow-hidden">
            {headToHead.slice(0, 8).map((rec) => {
              const opp = profilesById.get(rec.opponentId);
              const name = opp?.display_name ?? opp?.username ?? "Player";
              return (
                <Link
                  key={rec.opponentId}
                  href={opp?.username ? `/u/${opp.username}` : "#"}
                  className="flex items-center gap-3 px-4 py-3 active:bg-inset"
                >
                  <Avatar src={opp?.avatar_url} name={name} size={36} />
                  <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{name}</span>
                  <span className="tnum text-[15px] font-extrabold">
                    <span className={rec.wins >= rec.losses ? "text-volt-ink" : ""}>{rec.wins}</span>
                    <span className="text-ink-3"> – </span>
                    <span className={rec.losses > rec.wins ? "text-coral" : ""}>{rec.losses}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </>
      )}

      {confirmed.length > 0 && (
        <>
          <SectionHeader>Match history</SectionHeader>
          <div className="card hairline mx-4 mb-4 overflow-hidden">
            {confirmed.slice(0, 30).map((m) => {
              const won = didWin(m, profile.id);
              const opp = matchOpponent(m, profile.id);
              const isA = m.player_a === profile.id;
              const gamesWon = m.games.filter((g) =>
                isA ? g.score_a > g.score_b : g.score_b > g.score_a
              ).length;
              const delta = isA ? m.elo_delta_a : m.elo_delta_b;
              return (
                <Link
                  key={m.id}
                  href={`/m/${m.id}`}
                  className="flex items-center gap-3 px-4 py-3 active:bg-inset"
                >
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold ${
                      won ? "bg-volt text-[#1a2400]" : "bg-coral-soft text-coral"
                    }`}
                  >
                    {won ? "W" : "L"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold">vs {opp.name}</span>
                    <span className="text-[13px] text-ink-3">
                      {m.games.map((g) => (isA ? `${g.score_a}–${g.score_b}` : `${g.score_b}–${g.score_a}`)).join(", ")}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-0.5">
                    <span className="tnum text-[15px] font-extrabold">
                      {gamesWon}–{m.games.length - gamesWon}
                    </span>
                    <span className="text-[12px] text-ink-3">
                      {delta !== null ? `${delta >= 0 ? "+" : ""}${delta} · ` : ""}
                      {timeAgo(m.played_at)}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </>
      )}
      <div className="h-4" />
    </div>
  );
}
