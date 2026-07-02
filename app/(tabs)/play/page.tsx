"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PROFILE_LITE, type ProfileLite } from "@/lib/feed";
import type { Challenge } from "@/lib/database.types";
import { LargeTitleHeader } from "@/components/shell/LargeTitleHeader";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { RowsSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { FollowButton } from "@/components/profile/FollowButton";
import { ChallengeSheet } from "@/components/play/ChallengeSheet";
import { SearchIcon, SwordsIcon } from "@/components/icons";
import { timeAgo } from "@/lib/time";

type PlayTab = "players" | "challenges";
type ChallengeWithProfiles = Challenge & {
  challenger: ProfileLite;
  challenged: ProfileLite;
};

function PlayerRow({
  profile,
  viewerId,
  following,
  onChallenge,
}: {
  profile: ProfileLite;
  viewerId: string | null;
  following: boolean;
  onChallenge: (p: ProfileLite) => void;
}) {
  const name = profile.display_name ?? profile.username ?? "Player";
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Link href={`/u/${profile.username}`} className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar src={profile.avatar_url} name={name} size={44} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-bold">{name}</span>
          <span className="text-[13px] text-ink-3">
            @{profile.username} · {profile.elo_rating} Elo
          </span>
        </span>
      </Link>
      <button
        onClick={() => onChallenge(profile)}
        aria-label={`Challenge ${name}`}
        className="flex size-9 items-center justify-center rounded-full bg-coral-soft text-coral"
      >
        <SwordsIcon size={18} />
      </button>
      <FollowButton targetId={profile.id} viewerId={viewerId} initialFollowing={following} />
    </div>
  );
}

function PlayContent() {
  const params = useSearchParams();
  const [tab, setTab] = useState<PlayTab>(
    params.get("tab") === "challenges" ? "challenges" : "players"
  );
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState<ProfileLite[] | null>(null);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [challenges, setChallenges] = useState<ChallengeWithProfiles[] | null>(null);
  const [challengeTarget, setChallengeTarget] = useState<ProfileLite | null>(null);

  // who am I + who do I follow
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      const userId = data.user?.id ?? null;
      setViewerId(userId);
      if (userId) {
        const { data: follows } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", userId);
        setFollowingIds(new Set((follows ?? []).map((f) => f.following_id)));
      }
    });
  }, []);

  // player search / suggestions
  useEffect(() => {
    if (viewerId === null) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const supabase = createClient();
      let builder = supabase
        .from("profiles")
        .select(PROFILE_LITE)
        .neq("id", viewerId)
        .not("username", "is", null)
        .limit(20);
      const q = query.trim();
      if (q) {
        builder = builder.or(
          `username.ilike.%${q}%,display_name.ilike.%${q}%,city.ilike.%${q}%`
        );
      } else {
        builder = builder.order("elo_rating", { ascending: false });
      }
      const { data } = await builder;
      if (!cancelled) setPlayers(data ?? []);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, viewerId]);

  const loadChallenges = useCallback(() => {
    if (!viewerId) return;
    const supabase = createClient();
    supabase
      .from("challenges")
      .select(
        `*,
        challenger:profiles!challenges_challenger_id_fkey(${PROFILE_LITE}),
        challenged:profiles!challenges_challenged_id_fkey(${PROFILE_LITE})`
      )
      .or(`challenger_id.eq.${viewerId},challenged_id.eq.${viewerId}`)
      .order("created_at", { ascending: false })
      .limit(40)
      .returns<ChallengeWithProfiles[]>()
      .then(({ data }) => setChallenges(data ?? []));
  }, [viewerId]);

  useEffect(() => {
    if (tab === "challenges") loadChallenges();
  }, [tab, loadChallenges]);

  async function answerChallenge(id: string, status: "accepted" | "declined") {
    const supabase = createClient();
    await supabase.from("challenges").update({ status }).eq("id", id);
    loadChallenges();
  }

  const incoming = (challenges ?? []).filter(
    (c) => c.challenged_id === viewerId && c.status === "pending"
  );
  const outgoing = (challenges ?? []).filter(
    (c) => c.challenger_id === viewerId && c.status === "pending"
  );
  const active = (challenges ?? []).filter((c) => c.status === "accepted");

  return (
    <div className="mx-auto max-w-lg">
      <LargeTitleHeader title="Play" />
      <div className="flex flex-col gap-4">
        <div className="px-4">
          <SegmentedControl
            options={[
              { value: "players", label: "Players" },
              { value: "challenges", label: "Challenges" },
            ]}
            value={tab}
            onChange={setTab}
          />
        </div>

        {tab === "players" ? (
          <>
            <div className="mx-4 flex items-center gap-2 rounded-[14px] border border-separator bg-elevated px-3">
              <SearchIcon size={18} className="text-ink-3" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, @username, or city"
                className="h-11 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-3"
              />
            </div>
            {!query && (
              <p className="px-5 text-[13px] font-bold uppercase tracking-wide text-ink-3">
                Top rated
              </p>
            )}
            {players === null ? (
              <RowsSkeleton rows={6} />
            ) : players.length === 0 ? (
              <EmptyState
                icon={<SearchIcon />}
                title="No players found"
                message="Try a different name or city — or invite your club mates to Nick."
              />
            ) : (
              <div className="card hairline mx-4 mb-4 overflow-hidden">
                {players.map((p) => (
                  <PlayerRow
                    key={p.id}
                    profile={p}
                    viewerId={viewerId}
                    following={followingIds.has(p.id)}
                    onChallenge={setChallengeTarget}
                  />
                ))}
              </div>
            )}
          </>
        ) : challenges === null ? (
          <RowsSkeleton rows={4} />
        ) : incoming.length + outgoing.length + active.length === 0 ? (
          <EmptyState
            icon={<SwordsIcon />}
            title="No challenges"
            message="Throw down the gauntlet — challenge a player from the Players tab."
            action={<Button onClick={() => setTab("players")}>Find Players</Button>}
          />
        ) : (
          <div className="flex flex-col gap-4 px-4 pb-4">
            {incoming.length > 0 && (
              <div>
                <p className="pb-2 text-[13px] font-bold uppercase tracking-wide text-ink-3">
                  Incoming
                </p>
                <div className="card hairline overflow-hidden">
                  {incoming.map((c) => {
                    const name = c.challenger.display_name ?? c.challenger.username ?? "Player";
                    return (
                      <div key={c.id} className="flex flex-col gap-2 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar src={c.challenger.avatar_url} name={name} size={40} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[15px] font-bold">{name}</span>
                            <span className="text-[13px] text-ink-3">
                              {timeAgo(c.created_at)}
                              {c.proposed_time
                                ? ` · proposes ${new Date(c.proposed_time).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })}`
                                : ""}
                            </span>
                          </span>
                        </div>
                        {c.message && (
                          <p className="rounded-[12px] bg-bg px-3 py-2 text-[14px] italic text-ink-2">
                            “{c.message}”
                          </p>
                        )}
                        <div className="flex gap-2">
                          <Button
                            className="flex-1"
                            variant="volt"
                            size="sm"
                            onClick={() => answerChallenge(c.id, "accepted")}
                          >
                            Accept
                          </Button>
                          <Button
                            className="flex-1"
                            variant="destructive"
                            size="sm"
                            onClick={() => answerChallenge(c.id, "declined")}
                          >
                            Decline
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {active.length > 0 && (
              <div>
                <p className="pb-2 text-[13px] font-bold uppercase tracking-wide text-ink-3">
                  Accepted — go play!
                </p>
                <div className="card hairline overflow-hidden">
                  {active.map((c) => {
                    const other = c.challenger_id === viewerId ? c.challenged : c.challenger;
                    const name = other.display_name ?? other.username ?? "Player";
                    return (
                      <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                        <Avatar src={other.avatar_url} name={name} size={40} />
                        <span className="min-w-0 flex-1 text-[15px] font-bold">{name}</span>
                        <Link href="/log" className="contents">
                          <Button size="sm">Log Result</Button>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {outgoing.length > 0 && (
              <div>
                <p className="pb-2 text-[13px] font-bold uppercase tracking-wide text-ink-3">
                  Sent
                </p>
                <div className="card hairline overflow-hidden">
                  {outgoing.map((c) => {
                    const name = c.challenged.display_name ?? c.challenged.username ?? "Player";
                    return (
                      <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                        <Avatar src={c.challenged.avatar_url} name={name} size={40} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[15px] font-bold">{name}</span>
                          <span className="text-[13px] text-ink-3">
                            Waiting · {timeAgo(c.created_at)}
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {viewerId && (
        <ChallengeSheet
          open={challengeTarget !== null}
          onClose={() => setChallengeTarget(null)}
          viewerId={viewerId}
          target={challengeTarget}
        />
      )}
    </div>
  );
}

export default function PlayPage() {
  return (
    <Suspense>
      <PlayContent />
    </Suspense>
  );
}
