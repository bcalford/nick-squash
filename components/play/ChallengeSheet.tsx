"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { challengeSchema } from "@/lib/validation";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import type { ProfileLite } from "@/lib/feed";

export function ChallengeSheet({
  open,
  onClose,
  viewerId,
  target,
  ladderId,
}: {
  open: boolean;
  onClose: () => void;
  viewerId: string;
  target: ProfileLite | null;
  ladderId?: string;
}) {
  const [proposedTime, setProposedTime] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  if (!target) return null;
  const name = target.display_name ?? target.username ?? "Player";

  async function send() {
    if (!target || sending) return;
    const parsed = challengeSchema.safeParse({
      challengedId: target.id,
      ladderId,
      proposedTime: proposedTime || undefined,
      message: message.trim() || undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setSending(true);
    setError(null);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("challenges").insert({
      challenger_id: viewerId,
      challenged_id: parsed.data.challengedId,
      ladder_id: parsed.data.ladderId ?? null,
      proposed_time: parsed.data.proposedTime
        ? new Date(parsed.data.proposedTime).toISOString()
        : null,
      message: parsed.data.message ?? null,
    });
    setSending(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setSent(true);
  }

  function close() {
    setSent(false);
    setMessage("");
    setProposedTime("");
    setError(null);
    onClose();
  }

  return (
    <Sheet open={open} onClose={close} title={`Challenge ${name}`}>
      {sent ? (
        <div className="flex flex-col items-center gap-3 px-4 pb-8 pt-4 text-center">
          <span className="text-5xl">⚔️</span>
          <p className="text-[17px] font-bold">Challenge sent!</p>
          <p className="text-[14px] text-ink-2">
            {name} will get a notification. Track it in Play → Challenges.
          </p>
          <Button onClick={close}>Done</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4 px-4 pb-4">
          <div className="flex items-center gap-3">
            <Avatar src={target.avatar_url} name={name} size={44} />
            <div>
              <p className="text-[15px] font-bold">{name}</p>
              <p className="text-[13px] text-ink-3">
                @{target.username} · {target.elo_rating} Elo
                {ladderId ? " · ladder challenge" : ""}
              </p>
            </div>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-ink-2">Proposed time (optional)</span>
            <input
              type="datetime-local"
              value={proposedTime}
              onChange={(e) => setProposedTime(e.target.value)}
              className="h-11 rounded-[12px] border border-separator bg-bg px-3 text-[15px] outline-none focus:border-cobalt"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-ink-2">Message (optional)</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={280}
              placeholder="Court 2, loser buys smoothies?"
              className="resize-none rounded-[12px] border border-separator bg-bg p-3 text-[15px] outline-none placeholder:text-ink-3 focus:border-cobalt"
            />
          </label>
          {error && <p className="text-center text-[13px] font-medium text-coral">{error}</p>}
          <Button size="lg" onClick={send} loading={sending}>
            Send Challenge
          </Button>
        </div>
      )}
    </Sheet>
  );
}
