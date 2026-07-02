"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

export function FollowButton({
  targetId,
  viewerId,
  initialFollowing,
  size = "sm",
}: {
  targetId: string;
  viewerId: string | null;
  initialFollowing: boolean;
  size?: "sm" | "md";
}) {
  const [following, setFollowing] = useState(initialFollowing);
  if (!viewerId || viewerId === targetId) return null;

  async function toggle() {
    const supabase = createClient();
    const was = following;
    setFollowing(!was); // optimistic
    const result = was
      ? await supabase
          .from("follows")
          .delete()
          .eq("follower_id", viewerId!)
          .eq("following_id", targetId)
      : await supabase.from("follows").insert({ follower_id: viewerId!, following_id: targetId });
    if (result.error) setFollowing(was);
  }

  return (
    <Button variant={following ? "secondary" : "primary"} size={size} onClick={toggle}>
      {following ? "Following" : "Follow"}
    </Button>
  );
}
