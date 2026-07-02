"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logMatch } from "./actions";
import type { BestOf, GameScore } from "@/lib/scoring";
import { LargeTitleHeader } from "@/components/shell/LargeTitleHeader";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Button } from "@/components/ui/Button";
import { OpponentPicker, type Opponent } from "@/components/log/OpponentPicker";
import { LiveScorer } from "@/components/log/LiveScorer";
import { QuickEntry } from "@/components/log/QuickEntry";
import { SectionHeader } from "@/components/ui/Card";

type Step = "setup" | "live" | "quick" | "done";

export default function LogMatchPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("setup");
  const [mode, setMode] = useState<"live" | "quick">("live");
  const [bestOf, setBestOf] = useState<BestOf>(5);
  const [opponent, setOpponent] = useState<Opponent | null>(null);
  const [location, setLocation] = useState("");
  const [myName, setMyName] = useState("Me");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{
    matchId: string;
    pending: boolean;
    games: GameScore[];
  } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, username")
        .eq("id", data.user.id)
        .maybeSingle();
      setMyName(profile?.display_name ?? profile?.username ?? "Me");
    });
  }, []);

  const opponentName =
    opponent?.kind === "registered"
      ? (opponent.profile.display_name ?? opponent.profile.username ?? "Opponent")
      : (opponent?.name ?? "Opponent");

  async function save(games: GameScore[]) {
    if (!opponent || saving) return;
    setSaving(true);
    setError(null);
    const result = await logMatch({
      opponentId: opponent.kind === "registered" ? opponent.profile.id : undefined,
      guestName: opponent.kind === "guest" ? opponent.name : undefined,
      bestOf,
      games,
      location: location.trim() || undefined,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      setStep(mode === "live" ? "setup" : "quick");
      return;
    }
    setDone({ matchId: result.matchId, pending: result.pendingConfirmation, games });
    setStep("done");
    router.refresh();
  }

  if (step === "live" && opponent) {
    return (
      <LiveScorer
        bestOf={bestOf}
        myName={myName}
        opponentName={opponentName}
        onFinish={save}
        onCancel={() => setStep("setup")}
      />
    );
  }

  if (step === "done" && done) {
    const wonA = done.games.filter((g) => g.scoreA > g.scoreB).length;
    const wonB = done.games.length - wonA;
    const iWon = wonA > wonB;
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-5 px-4 pt-safe">
        <div className="h-16" />
        <span className="text-6xl">{iWon ? "🏆" : "🤝"}</span>
        <h1 className="text-center text-[28px] font-extrabold">
          {iWon ? "Victory!" : "Match logged"}
        </h1>
        <p className="tnum text-[17px] font-bold text-ink-2">
          {myName} {wonA} — {wonB} {opponentName}
        </p>
        <div className="card flex gap-3 px-5 py-3">
          {done.games.map((g, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <span className="text-[11px] font-bold uppercase text-ink-3">G{i + 1}</span>
              <span
                className={`tnum text-[15px] font-extrabold ${
                  g.scoreA > g.scoreB ? "text-volt-ink" : "text-ink-2"
                }`}
              >
                {g.scoreA}–{g.scoreB}
              </span>
            </div>
          ))}
        </div>
        {done.pending ? (
          <p className="max-w-[300px] text-center text-[13px] leading-snug text-ink-2">
            Waiting for {opponentName} to confirm. Elo updates when they do.
          </p>
        ) : (
          <p className="max-w-[300px] text-center text-[13px] leading-snug text-ink-2">
            Guest match saved — it won’t affect your Elo rating.
          </p>
        )}
        <div className="flex w-full max-w-xs flex-col gap-2">
          <Link href={`/m/${done.matchId}`} className="contents">
            <Button size="lg">View Match</Button>
          </Link>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => {
              setDone(null);
              setOpponent(null);
              setStep("setup");
            }}
          >
            Log Another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <LargeTitleHeader title="Log Match" />
      <div className="flex flex-col gap-2 px-4">
        <SegmentedControl
          options={[
            { value: "live", label: "Live Scoring" },
            { value: "quick", label: "Quick Entry" },
          ]}
          value={mode}
          onChange={setMode}
        />

        <SectionHeader className="px-0">Opponent</SectionHeader>
        <OpponentPicker value={opponent} onChange={setOpponent} />

        <SectionHeader className="px-0">Format</SectionHeader>
        <SegmentedControl
          options={[
            { value: "5", label: "Best of 5" },
            { value: "3", label: "Best of 3" },
          ]}
          value={String(bestOf) as "3" | "5"}
          onChange={(v) => setBestOf(Number(v) as BestOf)}
        />

        <SectionHeader className="px-0">Where (optional)</SectionHeader>
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Court / club"
          className="h-11 rounded-[14px] border border-separator bg-elevated px-4 text-[15px] outline-none placeholder:text-ink-3 focus:border-cobalt"
        />

        {error && (
          <p className="pt-2 text-center text-[13px] font-medium text-coral">{error}</p>
        )}

        {step === "quick" || mode === "quick" ? (
          <div className="pt-4">
            {opponent ? (
              <QuickEntry
                bestOf={bestOf}
                myName={myName}
                opponentName={opponentName}
                submitting={saving}
                onSubmit={save}
              />
            ) : (
              <p className="pt-2 text-center text-[13px] text-ink-3">
                Pick an opponent to enter scores.
              </p>
            )}
          </div>
        ) : (
          <div className="pt-6">
            <Button size="lg" className="w-full" disabled={!opponent} onClick={() => setStep("live")}>
              Start Live Scoring
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
