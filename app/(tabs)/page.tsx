"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  FEED_PAGE_SIZE,
  fetchDiscoverFeed,
  fetchFollowingFeed,
  type FeedPost,
} from "@/lib/feed";
import { LargeTitleHeader } from "@/components/shell/LargeTitleHeader";
import { NotificationsBell } from "@/components/notifications/NotificationsBell";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { FeedSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { PostCard } from "@/components/feed/PostCard";
import { Composer } from "@/components/feed/Composer";
import { PlayTabIcon } from "@/components/icons";
import { Avatar } from "@/components/ui/Avatar";

type FeedTab = "following" | "discover";

export default function FeedPage() {
  const [tab, setTab] = useState<FeedTab>("following");
  const [posts, setPosts] = useState<FeedPost[] | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [viewer, setViewer] = useState<{
    id: string;
    city: string | null;
    name: string;
    avatarUrl: string | null;
  } | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [freshPosts, setFreshPosts] = useState(0);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // bootstrap the viewer once
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("profiles")
        .select("city, display_name, username, avatar_url")
        .eq("id", user.id)
        .maybeSingle()
        .then(({ data: profile }) => {
          setViewer({
            id: user.id,
            city: profile?.city ?? null,
            name: profile?.display_name ?? profile?.username ?? "You",
            avatarUrl: profile?.avatar_url ?? null,
          });
        });
    });
  }, []);

  /** pure page fetch — no state writes */
  const fetchPage = useCallback(
    (activeTab: FeedTab, cursor?: string) => {
      if (!viewer) return Promise.resolve<FeedPost[]>([]);
      const supabase = createClient();
      return activeTab === "following"
        ? fetchFollowingFeed(supabase, viewer.id, cursor)
        : fetchDiscoverFeed(supabase, viewer.id, viewer.city, cursor);
    },
    [viewer]
  );

  // reset the list during render when the tab flips
  const [prevTab, setPrevTab] = useState<FeedTab>(tab);
  if (prevTab !== tab) {
    setPrevTab(tab);
    setPosts(null);
    setHasMore(true);
  }

  useEffect(() => {
    if (!viewer) return;
    let cancelled = false;
    fetchPage(tab).then((page) => {
      if (cancelled) return;
      setPosts(page);
      setHasMore(page.length >= FEED_PAGE_SIZE);
    });
    return () => {
      cancelled = true;
    };
  }, [viewer, tab, fetchPage]);

  /** full reload from user actions (new post, fresh-posts pill) */
  function reload() {
    setPosts(null);
    setHasMore(true);
    fetchPage(tab).then((page) => {
      setPosts(page);
      setHasMore(page.length >= FEED_PAGE_SIZE);
    });
  }

  // realtime: surface a "new posts" pill when someone posts while we're reading
  useEffect(() => {
    if (!viewer) return;
    const supabase = createClient();
    const channel = supabase
      .channel("feed:posts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        (payload) => {
          const authorId = (payload.new as { author_id?: string }).author_id;
          if (authorId && authorId !== viewer.id) setFreshPosts((n) => n + 1);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [viewer]);

  // infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !posts || !hasMore) return;
    const observer = new IntersectionObserver(async (entries) => {
      if (!entries[0].isIntersecting || loadingMore) return;
      setLoadingMore(true);
      const cursor = posts[posts.length - 1]?.created_at;
      const page = await fetchPage(tab, cursor);
      setPosts((prev) => [...(prev ?? []), ...page]);
      setHasMore(page.length >= FEED_PAGE_SIZE);
      setLoadingMore(false);
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [posts, hasMore, loadingMore, fetchPage, tab]);

  return (
    <div className="mx-auto max-w-lg">
      <LargeTitleHeader title="Nick" trailing={<NotificationsBell />} />
      {freshPosts > 0 && (
        <button
          onClick={() => {
            setFreshPosts(0);
            reload();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="fixed inset-x-0 top-14 z-30 mx-auto w-fit rounded-full bg-cobalt px-4 py-2 text-[13px] font-bold text-white shadow-lg"
        >
          {freshPosts} new post{freshPosts === 1 ? "" : "s"} ↑
        </button>
      )}
      <div className="flex flex-col gap-4">
        <div className="px-4">
          <SegmentedControl
            options={[
              { value: "following", label: "Following" },
              { value: "discover", label: "Discover" },
            ]}
            value={tab}
            onChange={setTab}
          />
        </div>

        {viewer && (
          <button
            onClick={() => setComposerOpen(true)}
            className="mx-4 flex items-center gap-3 rounded-full bg-elevated px-4 py-2.5 text-left shadow-sm"
          >
            <Avatar src={viewer.avatarUrl} name={viewer.name} size={32} />
            <span className="text-[15px] text-ink-3">Court report, trash talk…</span>
          </button>
        )}

        {posts === null ? (
          <FeedSkeleton />
        ) : posts.length === 0 ? (
          tab === "following" ? (
            <EmptyState
              icon={<PlayTabIcon />}
              title="Your feed is empty"
              message="Follow club mates and rivals to see their matches and posts here."
              action={
                <Link href="/play" className="contents">
                  <Button>Find Players</Button>
                </Link>
              }
            />
          ) : (
            <EmptyState
              icon={<PlayTabIcon />}
              title="Nothing nearby yet"
              message="No public posts around your city so far — be the first to put a match on the board."
            />
          )
        ) : (
          <div className="flex flex-col gap-4 px-4">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} viewerId={viewer?.id ?? null} />
            ))}
            <div ref={sentinelRef} className="h-8" />
            {loadingMore && <FeedSkeleton />}
          </div>
        )}
      </div>

      {viewer && (
        <Composer
          open={composerOpen}
          onClose={() => setComposerOpen(false)}
          viewerId={viewer.id}
          onPosted={reload}
        />
      )}
    </div>
  );
}
