"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import type { FeedPost } from "@/lib/feed";
import { Avatar } from "@/components/ui/Avatar";
import { HeartIcon, CommentIcon } from "@/components/icons";
import { MatchResultCard } from "@/components/feed/MatchResultCard";
import { CommentsSheet } from "@/components/feed/CommentsSheet";
import { timeAgo } from "@/lib/time";

export function PostCard({ post, viewerId }: { post: FeedPost; viewerId: string | null }) {
  const [liked, setLiked] = useState(post.liked_by_me);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [commentCount, setCommentCount] = useState(post.comment_count);
  const [commentsOpen, setCommentsOpen] = useState(false);

  async function toggleLike() {
    if (!viewerId) return;
    const supabase = createClient();
    // optimistic
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => c + (wasLiked ? -1 : 1));
    const result = wasLiked
      ? await supabase.from("likes").delete().eq("user_id", viewerId).eq("post_id", post.id)
      : await supabase.from("likes").insert({ user_id: viewerId, post_id: post.id });
    if (result.error) {
      setLiked(wasLiked);
      setLikeCount((c) => c + (wasLiked ? 1 : -1));
    }
  }

  const authorName = post.author.display_name ?? post.author.username ?? "Player";

  return (
    <article className="card flex flex-col gap-3 p-4">
      <div className="flex items-center gap-3">
        <Link href={`/u/${post.author.username}`}>
          <Avatar src={post.author.avatar_url} name={authorName} size={40} />
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={`/u/${post.author.username}`} className="block truncate text-[15px] font-bold">
            {authorName}
          </Link>
          <span className="text-[13px] text-ink-3">
            @{post.author.username} · {timeAgo(post.created_at)}
          </span>
        </div>
      </div>

      {post.body ? (
        <p className="whitespace-pre-wrap text-[15px] leading-snug">{post.body}</p>
      ) : null}

      {post.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- user-uploaded Supabase storage image
        <img
          src={post.image_url}
          alt=""
          className="max-h-[420px] w-full rounded-[16px] object-cover"
          loading="lazy"
        />
      ) : null}

      {post.match ? <MatchResultCard match={post.match} /> : null}

      <div className="flex items-center gap-5 pt-1">
        <motion.button
          whileTap={{ scale: 1.3 }}
          onClick={toggleLike}
          className={`flex min-h-[--touch] items-center gap-1.5 text-[13px] font-bold ${
            liked ? "text-coral" : "text-ink-2"
          }`}
          aria-label={liked ? "Unlike" : "Like"}
        >
          <HeartIcon size={22} filled={liked} />
          {likeCount > 0 ? likeCount : ""}
        </motion.button>
        <button
          onClick={() => setCommentsOpen(true)}
          className="flex min-h-[--touch] items-center gap-1.5 text-[13px] font-bold text-ink-2"
          aria-label="Comments"
        >
          <CommentIcon size={22} />
          {commentCount > 0 ? commentCount : ""}
        </button>
      </div>

      <CommentsSheet
        postId={post.id}
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        viewerId={viewerId}
        onCommentAdded={() => setCommentCount((c) => c + 1)}
      />
    </article>
  );
}
