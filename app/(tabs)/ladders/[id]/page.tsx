"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PROFILE_LITE, type ProfileLite } from "@/lib/feed";
import type { Ladder, LadderMember, LadderPositionEvent } from "@/lib/database.types";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { RowsSkeleton } from "@/components/ui/Skeleton";
import { ChallengeSheet } from "@/components/play/ChallengeSheet";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  MinusIcon,
  SwordsIcon,
} from "@/components/icons";

type MemberRow = LadderMember & { profile: ProfileLite };

/** Direction of a member's most recent move in the past 7 days. */
function movement(events: LadderPositionEvent[], userId: string): "up" | "down" | "new" | null {
  const latest = events.find((e) => e.user_id === userId);
  if (!latest) return null;
  if (latest.old_position === null) return "new";
  if (latest.new_position < latest.old_position) return "up";
  if (latest.new_position > latest.old_position) return "down";
  return null;
}

export default function LadderDetailPage() {
  const params = useParams<{ id: string }>();
  const ladderId = params.id;
  const [ladder, setLadder] = useState<Ladder | null>(null);
  const [members, setMembers] = useState<MemberRow[] | null>(null);
  const [events, setEvents] = useState<LadderPositionEvent[]>([]);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [challengeTarget, setChallengeTarget] = useState<ProfileLite | null>(null);

  const load = useCallback(() => {
    const supabase = createClient();
    const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    Promise.all([
      supabase.from("ladders").select("*").eq("id", ladderId).maybeSingle(),
      supabase
        .from("ladder_members")
        .select(`*, profile:profiles!ladder_members_user_id_fkey(${PROFILE_LITE})`)
        .eq("ladder_id", ladderId)
        .order("position")
        .returns<MemberRow[]>(),
      supabase
        .from("ladder_position_events")
        .select("*")
        .eq("ladder_id", ladderId)
        .gte("created_at", weekAgo)
        .order("created_at", { ascending: false }),
      supabase.auth.getUser(),
    ]).then(([{ data: ladderData }, { data: memberData }, { data: eventData }, userRes]) => {
      setLadder(ladderData ?? null);
      setMembers(memberData ?? []);
      setEvents(eventData ?? []);
      setViewerId(userRes.data.user?.id ?? null);
    });
  }, [ladderId]);

  useEffect(() => {
    load();
  }, [load]);

  // live position updates
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`ladder:${ladderId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ladder_members", filter: `ladder_id=eq.${ladderId}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [ladderId, load]);

  const isMember = members?.some((m) => m.user_id === viewerId) ?? false;

  async function joinOrLeave() {
    if (!viewerId || joining) return;
    setJoining(true);
    const supabase = createClient();
    if (isMember) {
      await supabase
        .from("ladder_members")
        .delete()
        .eq("ladder_id", ladderId)
        .eq("user_id", viewerId);
    } else {
      // position is assigned by the DB trigger (bottom of the ladder)
      await supabase
        .from("ladder_members")
        .insert({ ladder_id: ladderId, user_id: viewerId });
    }
    setJoining(false);
    load();
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="flex h-12 items-center justify-between px-2 pt-safe">
        <Link
          href="/ladders"
          aria-label="Back to ladders"
          className="flex size-11 items-center justify-center rounded-full text-cobalt"
        >
          <ChevronLeftIcon size={24} />
        </Link>
        <span className="nav-title truncate">{ladder?.name ?? "Ladder"}</span>
        <span className="w-11" />
      </div>

      <div className="flex flex-col gap-4 px-4 pt-2">
        {ladder?.description && (
          <p className="text-[14px] leading-snug text-ink-2">{ladder.description}</p>
        )}

        <Button
          variant={isMember ? "secondary" : "primary"}
          size="lg"
          onClick={joinOrLeave}
          loading={joining}
          disabled={viewerId === null}
        >
          {isMember ? "Leave Ladder" : "Join Ladder"}
        </Button>

        {isMember && (
          <p className="text-center text-[13px] leading-snug text-ink-2">
            Beat someone above you in a confirmed match and you take their spot.
          </p>
        )}

        {members === null ? (
          <RowsSkeleton rows={6} />
        ) : members.length === 0 ? (
          <p className="py-10 text-center text-[15px] text-ink-3">
            Nobody on this ladder yet — be the first rung.
          </p>
        ) : (
          <div className="card hairline mb-4 overflow-hidden">
            {members.map((m) => {
              const name = m.profile.display_name ?? m.profile.username ?? "Player";
              const move = movement(events, m.user_id);
              const isTop = m.position === 1;
              return (
                <div key={m.user_id} className="flex items-center gap-3 px-4 py-3">
                  <span
                    className={`tnum flex size-8 shrink-0 items-center justify-center rounded-full text-[14px] font-extrabold ${
                      isTop ? "gradient-signature" : "bg-inset text-ink-2"
                    }`}
                  >
                    {m.position}
                  </span>
                  <span className="w-5">
                    {move === "up" && <ArrowUpIcon size={16} className="text-volt-ink" />}
                    {move === "down" && <ArrowDownIcon size={16} className="text-coral" />}
                    {move === "new" && (
                      <span className="text-[10px] font-extrabold uppercase text-cobalt">new</span>
                    )}
                    {move === null && <MinusIcon size={16} className="text-ink-3 opacity-40" />}
                  </span>
                  <Link
                    href={`/u/${m.profile.username}`}
                    className="flex min-w-0 flex-1 items-center gap-2"
                  >
                    <Avatar src={m.profile.avatar_url} name={name} size={36} />
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-semibold">{name}</span>
                      <span className="text-[12px] text-ink-3">{m.profile.elo_rating} Elo</span>
                    </span>
                  </Link>
                  {viewerId && m.user_id !== viewerId && isMember && (
                    <button
                      onClick={() => setChallengeTarget(m.profile)}
                      aria-label={`Challenge ${name}`}
                      className="flex size-9 items-center justify-center rounded-full bg-coral-soft text-coral"
                    >
                      <SwordsIcon size={18} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {viewerId && (
        <ChallengeSheet
          open={challengeTarget !== null}
          onClose={() => setChallengeTarget(null)}
          viewerId={viewerId}
          target={challengeTarget}
          ladderId={ladderId}
        />
      )}
    </div>
  );
}
