"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Sheet } from "@/components/ui/Sheet";
import { Avatar } from "@/components/ui/Avatar";
import { RowsSkeleton } from "@/components/ui/Skeleton";
import { PROFILE_LITE, type ProfileLite } from "@/lib/feed";

type Mode = "followers" | "following";

export function FollowStats({
  userId,
  followerCount,
  followingCount,
}: {
  userId: string;
  followerCount: number;
  followingCount: number;
}) {
  const [open, setOpen] = useState<Mode | null>(null);
  const [people, setPeople] = useState<ProfileLite[] | null>(null);
  const [prevOpen, setPrevOpen] = useState<Mode | null>(null);

  // reset the list during render when the sheet target changes
  if (open !== prevOpen) {
    setPrevOpen(open);
    setPeople(null);
  }

  useEffect(() => {
    if (!open) return;
    const supabase = createClient();
    const query =
      open === "followers"
        ? supabase
            .from("follows")
            .select(`profile:profiles!follows_follower_id_fkey(${PROFILE_LITE})`)
            .eq("following_id", userId)
        : supabase
            .from("follows")
            .select(`profile:profiles!follows_following_id_fkey(${PROFILE_LITE})`)
            .eq("follower_id", userId);
    query
      .limit(100)
      .returns<{ profile: ProfileLite }[]>()
      .then(({ data }) => setPeople((data ?? []).map((r) => r.profile)));
  }, [open, userId]);

  return (
    <>
      <div className="flex gap-4 text-[13px] text-ink-2">
        <button onClick={() => setOpen("followers")}>
          <strong className="tnum text-ink">{followerCount}</strong> followers
        </button>
        <button onClick={() => setOpen("following")}>
          <strong className="tnum text-ink">{followingCount}</strong> following
        </button>
      </div>
      <Sheet
        open={open !== null}
        onClose={() => setOpen(null)}
        title={open === "followers" ? "Followers" : "Following"}
        full
      >
        {people === null ? (
          <RowsSkeleton rows={5} />
        ) : people.length === 0 ? (
          <p className="py-16 text-center text-[15px] text-ink-3">Nobody here yet.</p>
        ) : (
          <div className="hairline">
            {people.map((p) => {
              const name = p.display_name ?? p.username ?? "Player";
              return (
                <Link
                  key={p.id}
                  href={`/u/${p.username}`}
                  onClick={() => setOpen(null)}
                  className="flex items-center gap-3 px-4 py-3 active:bg-inset"
                >
                  <Avatar src={p.avatar_url} name={name} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold">{name}</span>
                    <span className="text-[13px] text-ink-3">
                      @{p.username} · {p.elo_rating} Elo
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </Sheet>
    </>
  );
}
