"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Sheet } from "@/components/ui/Sheet";
import { RowsSkeleton } from "@/components/ui/Skeleton";
import { timeAgo } from "@/lib/time";
import type { Notification } from "@/lib/database.types";

const iconFor: Record<Notification["type"], string> = {
  match_confirmation_request: "🎾",
  match_confirmed: "✅",
  match_disputed: "⚠️",
  new_follower: "👋",
  challenge_received: "⚔️",
  challenge_answered: "📩",
  achievement_earned: "🏅",
  ladder_move: "🪜",
  post_liked: "❤️",
  post_commented: "💬",
};

function describe(n: Notification): string {
  const p = (n.payload ?? {}) as Record<string, unknown>;
  switch (n.type) {
    case "match_confirmation_request":
      return "A match result needs your confirmation";
    case "match_confirmed":
      return "Your match was confirmed — Elo updated";
    case "match_disputed":
      return "Your opponent disputed a match result";
    case "new_follower":
      return "You have a new follower";
    case "challenge_received":
      return "You’ve been challenged to a match";
    case "challenge_answered":
      return p.answer === "accepted" ? "Your challenge was accepted" : "Your challenge was declined";
    case "achievement_earned":
      return `Achievement unlocked: ${String(p.achievement_name ?? "")} ${String(p.icon ?? "")}`;
    case "ladder_move":
      return `Ladder move: #${String(p.from ?? "?")} → #${String(p.to ?? "?")}`;
    case "post_liked":
      return "Someone liked your post";
    case "post_commented":
      return "New comment on your post";
  }
}

function routeFor(n: Notification): string {
  const p = (n.payload ?? {}) as Record<string, unknown>;
  switch (n.type) {
    case "match_confirmation_request":
    case "match_confirmed":
    case "match_disputed":
      return typeof p.match_id === "string" ? `/m/${p.match_id}` : "/";
    case "new_follower":
      return "/play";
    case "challenge_received":
    case "challenge_answered":
      return "/play?tab=challenges";
    case "achievement_earned":
      return "/profile";
    case "ladder_move":
      return typeof p.ladder_id === "string" ? `/ladders/${p.ladder_id}` : "/ladders";
    case "post_liked":
    case "post_commented":
      return "/";
  }
}

export function NotificationsSheet({
  open,
  onClose,
  viewerId,
  onAllRead,
}: {
  open: boolean;
  onClose: () => void;
  viewerId: string;
  onAllRead: () => void;
}) {
  const router = useRouter();
  const [items, setItems] = useState<Notification[] | null>(null);

  useEffect(() => {
    if (!open) return;
    const supabase = createClient();
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", viewerId)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setItems(data ?? []);
        // opening the sheet marks everything read
        supabase
          .from("notifications")
          .update({ read: true })
          .eq("user_id", viewerId)
          .eq("read", false)
          .then(() => onAllRead());
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch only on open
  }, [open, viewerId]);

  return (
    <Sheet open={open} onClose={onClose} title="Notifications" full>
      {items === null ? (
        <RowsSkeleton rows={6} />
      ) : items.length === 0 ? (
        <p className="py-16 text-center text-[15px] text-ink-3">
          Nothing yet — go log a match.
        </p>
      ) : (
        <div className="hairline">
          {items.map((n) => (
            <button
              key={n.id}
              onClick={() => {
                onClose();
                router.push(routeFor(n));
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-inset"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-inset text-xl">
                {iconFor[n.type]}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-[15px] leading-snug ${n.read ? "" : "font-bold"}`}>
                  {describe(n)}
                </span>
                <span className="text-[13px] text-ink-3">{timeAgo(n.created_at)}</span>
              </span>
              {!n.read && <span className="size-2 shrink-0 rounded-full bg-cobalt" />}
            </button>
          ))}
        </div>
      )}
    </Sheet>
  );
}
