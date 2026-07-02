"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

export function ClubJoinButton({
  clubId,
  viewerId,
  initialMember,
}: {
  clubId: string;
  viewerId: string | null;
  initialMember: boolean;
}) {
  const router = useRouter();
  const [member, setMember] = useState(initialMember);
  const [pending, setPending] = useState(false);
  if (!viewerId) return null;

  async function toggle() {
    if (pending) return;
    setPending(true);
    const supabase = createClient();
    if (member) {
      const { error } = await supabase
        .from("club_members")
        .delete()
        .eq("club_id", clubId)
        .eq("user_id", viewerId!);
      if (!error) setMember(false);
    } else {
      const { error } = await supabase
        .from("club_members")
        .insert({ club_id: clubId, user_id: viewerId! });
      if (!error) setMember(true);
    }
    setPending(false);
    router.refresh();
  }

  return (
    <Button variant={member ? "secondary" : "primary"} size="md" onClick={toggle} loading={pending}>
      {member ? "Member ✓" : "Join Club"}
    </Button>
  );
}
