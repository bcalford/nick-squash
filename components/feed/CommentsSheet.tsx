"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { commentSchema } from "@/lib/validation";
import { Sheet } from "@/components/ui/Sheet";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { timeAgo } from "@/lib/time";
import type { Comment } from "@/lib/database.types";
import type { ProfileLite } from "@/lib/feed";
import { PROFILE_LITE } from "@/lib/feed";

type CommentWithAuthor = Comment & { author: ProfileLite };

export function CommentsSheet({
  postId,
  open,
  onClose,
  viewerId,
  onCommentAdded,
}: {
  postId: string;
  open: boolean;
  onClose: () => void;
  viewerId: string | null;
  onCommentAdded?: () => void;
}) {
  const [comments, setComments] = useState<CommentWithAuthor[] | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    const supabase = createClient();
    supabase
      .from("comments")
      .select(`*, author:profiles!comments_author_id_fkey(${PROFILE_LITE})`)
      .eq("post_id", postId)
      .order("created_at", { ascending: true })
      .returns<CommentWithAuthor[]>()
      .then(({ data }) => setComments(data ?? []));
  }, [open, postId]);

  async function send() {
    const parsed = commentSchema.safeParse({ body });
    if (!parsed.success || !viewerId || sending) return;
    setSending(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("comments")
      .insert({ post_id: postId, author_id: viewerId, body: parsed.data.body })
      .select(`*, author:profiles!comments_author_id_fkey(${PROFILE_LITE})`)
      .returns<CommentWithAuthor[]>()
      .single();
    setSending(false);
    if (!error && data) {
      setComments((prev) => [...(prev ?? []), data]);
      setBody("");
      onCommentAdded?.();
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Comments" full>
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-y-auto px-4">
          {comments === null ? (
            <div className="flex flex-col gap-4 py-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="size-9 rounded-full" />
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3.5 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <p className="py-12 text-center text-[15px] text-ink-3">
              No comments yet — start the rally.
            </p>
          ) : (
            <div className="flex flex-col gap-4 py-4">
              {comments.map((c) => {
                const name = c.author.display_name ?? c.author.username ?? "Player";
                return (
                  <div key={c.id} className="flex gap-3">
                    <Avatar src={c.author.avatar_url} name={name} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px]">
                        <span className="font-bold">{name}</span>{" "}
                        <span className="text-ink-3">{timeAgo(c.created_at)}</span>
                      </p>
                      <p className="text-[15px] leading-snug">{c.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {viewerId && (
          <div className="flex items-center gap-2 border-t-[0.5px] border-separator px-4 py-3">
            <input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Add a comment…"
              className="h-11 flex-1 rounded-full bg-inset px-4 text-[15px] outline-none placeholder:text-ink-3"
            />
            <button
              onClick={send}
              disabled={!body.trim() || sending}
              className="text-[15px] font-bold text-cobalt disabled:opacity-40"
            >
              Post
            </button>
          </div>
        )}
      </div>
    </Sheet>
  );
}
