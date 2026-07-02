"use client";

import { useMemo, useState } from "react";
import {
  gamesNeeded,
  isValidGameScore,
  validateMatchGames,
  type BestOf,
  type GameScore,
} from "@/lib/scoring";
import { Button } from "@/components/ui/Button";
import { PlusIcon, XIcon } from "@/components/icons";

type Entry = { a: string; b: string };

function toGames(entries: Entry[]): GameScore[] | null {
  const games: GameScore[] = [];
  for (const e of entries) {
    if (e.a === "" || e.b === "") return null;
    games.push({ scoreA: Number(e.a), scoreB: Number(e.b) });
  }
  return games;
}

export function QuickEntry({
  bestOf,
  myName,
  opponentName,
  submitting,
  onSubmit,
}: {
  bestOf: BestOf;
  myName: string;
  opponentName: string;
  submitting: boolean;
  onSubmit: (games: GameScore[]) => void;
}) {
  const needed = gamesNeeded(bestOf);
  const [entries, setEntries] = useState<Entry[]>(
    Array.from({ length: needed }, () => ({ a: "", b: "" }))
  );

  const games = toGames(entries);
  const validation = useMemo(
    () => (games ? validateMatchGames(games, bestOf) : null),
    [games, bestOf]
  );

  function setEntry(i: number, side: "a" | "b", value: string) {
    if (!/^\d{0,2}$/.test(value)) return;
    setEntries((prev) => prev.map((e, j) => (j === i ? { ...e, [side]: value } : e)));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="card overflow-hidden">
        <div className="grid grid-cols-[44px_1fr_1fr_44px] items-center gap-2 px-4 py-2 text-[12px] font-bold uppercase tracking-wide text-ink-3">
          <span>Game</span>
          <span className="text-center text-cobalt">{myName}</span>
          <span className="text-center text-coral">{opponentName}</span>
          <span />
        </div>
        <div className="hairline">
          {entries.map((entry, i) => {
            const filled = entry.a !== "" && entry.b !== "";
            const rowValid = filled && isValidGameScore(Number(entry.a), Number(entry.b));
            return (
              <div
                key={i}
                className="grid grid-cols-[44px_1fr_1fr_44px] items-center gap-2 px-4 py-2.5"
              >
                <span className="tnum text-[15px] font-bold text-ink-2">{i + 1}</span>
                {(["a", "b"] as const).map((side) => (
                  <input
                    key={side}
                    value={entry[side]}
                    onChange={(e) => setEntry(i, side, e.target.value)}
                    inputMode="numeric"
                    placeholder="—"
                    aria-label={`Game ${i + 1}, ${side === "a" ? myName : opponentName}`}
                    className={`tnum h-12 rounded-[12px] border-2 bg-bg text-center text-[22px] font-extrabold outline-none transition-colors ${
                      filled && !rowValid
                        ? "border-coral text-coral"
                        : "border-transparent focus:border-cobalt"
                    }`}
                  />
                ))}
                {entries.length > needed && i === entries.length - 1 ? (
                  <button
                    onClick={() => setEntries((prev) => prev.slice(0, -1))}
                    aria-label={`Remove game ${i + 1}`}
                    className="flex size-9 items-center justify-center rounded-full bg-inset text-ink-2"
                  >
                    <XIcon size={16} />
                  </button>
                ) : (
                  <span />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {entries.length < bestOf && (
        <button
          onClick={() => setEntries((prev) => [...prev, { a: "", b: "" }])}
          className="flex items-center justify-center gap-1.5 rounded-[14px] border-2 border-dashed border-separator py-3 text-[15px] font-semibold text-ink-2"
        >
          <PlusIcon size={18} /> Add game {entries.length + 1}
        </button>
      )}

      {games && validation && !validation.valid && (
        <p className="px-1 text-center text-[13px] font-medium text-coral">{validation.reason}</p>
      )}

      <Button
        size="lg"
        loading={submitting}
        disabled={!games || !validation?.valid}
        onClick={() => games && onSubmit(games)}
      >
        Save Match
      </Button>
    </div>
  );
}
