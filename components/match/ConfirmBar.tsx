"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { answerMatch } from "@/app/(tabs)/log/actions";
import { Button } from "@/components/ui/Button";

/** Confirm/dispute actions shown only to the non-logging participant. */
export function ConfirmBar({ matchId }: { matchId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<"confirmed" | "disputed" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function answer(kind: "confirmed" | "disputed") {
    setPending(kind);
    setError(null);
    const result = await answerMatch(matchId, kind);
    if (!result.ok) {
      setError(result.error);
      setPending(null);
      return;
    }
    router.refresh();
  }

  return (
    <div className="card flex flex-col gap-3 p-4">
      <p className="text-[15px] font-semibold">
        Does this result look right? Elo applies once you confirm.
      </p>
      <div className="flex gap-2">
        <Button
          className="flex-1"
          variant="volt"
          loading={pending === "confirmed"}
          disabled={pending !== null}
          onClick={() => answer("confirmed")}
        >
          Confirm
        </Button>
        <Button
          className="flex-1"
          variant="destructive"
          loading={pending === "disputed"}
          disabled={pending !== null}
          onClick={() => answer("disputed")}
        >
          Dispute
        </Button>
      </div>
      {error && <p className="text-center text-[13px] font-medium text-coral">{error}</p>}
    </div>
  );
}
