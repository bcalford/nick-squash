"use client";

import { useState } from "react";
import { CommentsSheet } from "@/components/feed/CommentsSheet";
import { Button } from "@/components/ui/Button";
import { CommentIcon } from "@/components/icons";

export function MatchComments({
  postId,
  commentCount,
  viewerId,
}: {
  postId: string;
  commentCount: number;
  viewerId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(commentCount);
  return (
    <>
      <Button variant="secondary" size="lg" className="w-full" onClick={() => setOpen(true)}>
        <CommentIcon size={20} />
        {count > 0 ? `Comments (${count})` : "Add a comment"}
      </Button>
      <CommentsSheet
        postId={postId}
        open={open}
        onClose={() => setOpen(false)}
        viewerId={viewerId}
        onCommentAdded={() => setCount((c) => c + 1)}
      />
    </>
  );
}
