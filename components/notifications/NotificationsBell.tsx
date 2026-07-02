"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BellIcon } from "@/components/icons";
import { NotificationsSheet } from "@/components/notifications/NotificationsSheet";

/**
 * Bell with a live unread badge. Subscribes to Realtime inserts on the
 * viewer's notifications so the badge updates the moment something happens.
 */
export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [viewerId, setViewerId] = useState<string | null>(null);

  const refreshCount = useCallback(async (userId: string) => {
    const supabase = createClient();
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("read", false);
    setUnread(count ?? 0);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    supabase.auth.getUser().then(({ data }) => {
      const userId = data.user?.id;
      if (!userId) return;
      setViewerId(userId);
      refreshCount(userId);

      channel = supabase
        .channel(`notifications:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          () => setUnread((c) => c + 1)
        )
        .subscribe();
    });

    return () => {
      if (channel) createClient().removeChannel(channel);
    };
  }, [refreshCount]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        className="relative flex size-11 items-center justify-center rounded-full text-ink"
      >
        <BellIcon size={24} />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex min-w-[18px] items-center justify-center rounded-full bg-coral px-1 text-[11px] font-extrabold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      {viewerId && (
        <NotificationsSheet
          open={open}
          onClose={() => setOpen(false)}
          viewerId={viewerId}
          onAllRead={() => setUnread(0)}
        />
      )}
    </>
  );
}
