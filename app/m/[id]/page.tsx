import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PROFILE_LITE, type MatchWithGames } from "@/lib/feed";
import { MatchResultCard } from "@/components/feed/MatchResultCard";
import { ConfirmBar } from "@/components/match/ConfirmBar";
import { MatchComments } from "@/components/match/MatchComments";
import { Chip } from "@/components/ui/Chip";
import { ChevronLeftIcon } from "@/components/icons";
import { formatDate } from "@/lib/time";

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: match } = await supabase
    .from("matches")
    .select(
      `*,
      games(*),
      player_a_profile:profiles!matches_player_a_fkey(${PROFILE_LITE}),
      player_b_profile:profiles!matches_player_b_fkey(${PROFILE_LITE})`
    )
    .eq("id", id)
    .maybeSingle<MatchWithGames>();

  if (!match) notFound();
  match.games.sort((a, b) => a.game_number - b.game_number);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const canConfirm =
    user !== null &&
    match.status === "pending_confirmation" &&
    user.id !== match.created_by &&
    (user.id === match.player_a || user.id === match.player_b);

  const { data: autoPost } = await supabase
    .from("posts")
    .select("id, comments(count)")
    .eq("match_id", match.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<{ id: string; comments: { count: number }[] }>();

  const nameA =
    match.player_a_profile?.display_name ?? match.player_a_profile?.username ?? "Player A";
  const nameB =
    match.player_b_profile?.display_name ??
    match.player_b_profile?.username ??
    match.opponent_guest_name ??
    "Guest";
  const rated = match.player_b !== null && match.status === "confirmed";

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col gap-4 px-4 pt-safe pb-safe">
      <div className="flex h-12 items-center justify-between">
        {user ? (
          <Link
            href="/"
            className="flex size-11 items-center justify-center rounded-full text-cobalt"
            aria-label="Back to feed"
          >
            <ChevronLeftIcon size={24} />
          </Link>
        ) : (
          <span />
        )}
        <span className="nav-title">Match</span>
        <span className="w-11" />
      </div>

      <div className="text-center">
        <h1 className="text-[24px] font-extrabold leading-tight">
          {nameA} vs {nameB}
        </h1>
        <p className="mt-1 text-[13px] text-ink-2">
          {formatDate(match.played_at)}
          {match.location ? ` · ${match.location}` : ""}
        </p>
        {rated && match.elo_delta_a !== null && match.elo_delta_b !== null && (
          <div className="mt-3 flex items-center justify-center gap-2">
            <Chip tone="gradient">Elo swing</Chip>
            <Chip tone={match.elo_delta_a >= 0 ? "volt" : "coral"}>
              {nameA} {match.elo_delta_a >= 0 ? "+" : ""}
              {match.elo_delta_a}
            </Chip>
            <Chip tone={match.elo_delta_b >= 0 ? "volt" : "coral"}>
              {nameB} {match.elo_delta_b >= 0 ? "+" : ""}
              {match.elo_delta_b}
            </Chip>
          </div>
        )}
      </div>

      {canConfirm && <ConfirmBar matchId={match.id} />}

      <div className="card p-2">
        <MatchResultCard match={match} link={false} />
      </div>

      {match.notes && (
        <div className="card p-4">
          <p className="text-[13px] font-bold uppercase tracking-wide text-ink-3">Notes</p>
          <p className="mt-1 text-[15px] leading-snug">{match.notes}</p>
        </div>
      )}

      {autoPost ? (
        <MatchComments
          postId={autoPost.id}
          commentCount={autoPost.comments[0]?.count ?? 0}
          viewerId={user?.id ?? null}
        />
      ) : (
        <p className="text-center text-[13px] text-ink-3">
          Comments open once the match is confirmed.
        </p>
      )}

      {!user && (
        <div className="mt-auto pb-4 text-center">
          <Link href="/signup" className="text-[15px] font-bold text-cobalt">
            Track your own squash matches on Nick →
          </Link>
        </div>
      )}
    </div>
  );
}
