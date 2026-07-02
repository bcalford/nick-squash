"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  addRally,
  deriveState,
  gamesNeeded,
  newLiveMatch,
  undoRally,
  type BestOf,
  type GameScore,
  type LiveMatchState,
  type PlayerKey,
} from "@/lib/scoring";
import { UndoIcon, XIcon } from "@/components/icons";

const pop = { type: "spring" as const, damping: 12, stiffness: 500 };

function ServeDot({ box }: { box: "R" | "L" }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-volt px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-[#1a2400]">
      <span className="size-1.5 rounded-full bg-[#1a2400]" />
      Serving · {box}
    </span>
  );
}

function GameDots({ won, needed, tone }: { won: number; needed: number; tone: string }) {
  return (
    <span className="flex gap-1.5">
      {Array.from({ length: needed }, (_, i) => (
        <span
          key={i}
          className="size-2.5 rounded-full transition-colors"
          style={{ background: i < won ? tone : "var(--bg-inset)" }}
        />
      ))}
    </span>
  );
}

function PlayerHalf({
  name,
  score,
  serving,
  serveBox,
  won,
  needed,
  tone,
  flip,
  onPoint,
}: {
  name: string;
  score: number;
  serving: boolean;
  serveBox: "R" | "L";
  won: number;
  needed: number;
  tone: string;
  /** rotate content 180° so the top player reads it across the court */
  flip?: boolean;
  onPoint: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onPoint}
      className={`relative flex flex-1 flex-col items-center justify-center gap-2 outline-none ${
        flip ? "rotate-180" : ""
      }`}
      aria-label={`Point to ${name}`}
    >
      <span className="flex items-center gap-2 text-[15px] font-bold" style={{ color: tone }}>
        {name}
      </span>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={score}
          initial={{ scale: 1.5, opacity: 0.4 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0, position: "absolute" }}
          transition={pop}
          className="tnum text-[104px] font-extrabold leading-none tracking-tight"
        >
          {score}
        </motion.span>
      </AnimatePresence>
      <GameDots won={won} needed={needed} tone={tone} />
      <span className="h-7">{serving ? <ServeDot box={serveBox} /> : null}</span>
    </motion.button>
  );
}

export function LiveScorer({
  bestOf,
  myName,
  opponentName,
  onFinish,
  onCancel,
}: {
  bestOf: BestOf;
  myName: string;
  opponentName: string;
  /** called with final game scores (player A = me) once the match ends */
  onFinish: (games: GameScore[]) => void;
  onCancel: () => void;
}) {
  const [state, setState] = useState<LiveMatchState>(() => newLiveMatch(bestOf, "a"));
  const [banner, setBanner] = useState<string | null>(null);
  const derived = useMemo(() => deriveState(state), [state]);
  const needed = gamesNeeded(bestOf);
  const started = state.rallies.length > 0;

  function point(winner: PlayerKey) {
    if (derived.matchOver) return;
    const next = addRally(state, winner);
    setState(next);
    const d = deriveState(next);
    if (d.matchOver) {
      onFinish(d.completedGames);
    } else if (d.justWonGame) {
      const g = d.completedGames[d.completedGames.length - 1];
      const winnerName = d.justWonGame === "a" ? myName : opponentName;
      setBanner(
        `Game ${d.completedGames.length} to ${winnerName} · ${Math.max(g.scoreA, g.scoreB)}–${Math.min(g.scoreA, g.scoreB)}`
      );
      setTimeout(() => setBanner(null), 2200);
    }
  }

  return (
    <div className="court-lines fixed inset-0 z-50 flex flex-col bg-bg pt-safe pb-safe">
      {/* top bar */}
      <div className="flex items-center justify-between px-4 py-2">
        <button
          onClick={onCancel}
          aria-label="Exit scorer"
          className="flex size-11 items-center justify-center rounded-full bg-inset text-ink-2"
        >
          <XIcon size={20} />
        </button>
        <span className="rounded-full bg-coral-soft px-3 py-1 text-[12px] font-extrabold uppercase tracking-widest text-coral">
          ● Live · Game {derived.gameNumber}
        </span>
        <button
          onClick={() => setState(undoRally(state))}
          disabled={!started}
          aria-label="Undo last point"
          className="flex size-11 items-center justify-center rounded-full bg-inset text-ink-2 disabled:opacity-40"
        >
          <UndoIcon size={20} />
        </button>
      </div>

      {/* opponent half (rotated to face them) */}
      <PlayerHalf
        name={opponentName}
        score={derived.scoreB}
        serving={derived.server === "b"}
        serveBox={derived.serveBox}
        won={derived.gamesWonB}
        needed={needed}
        tone="var(--accent)"
        flip
        onPoint={() => point("b")}
      />

      {/* mid court line */}
      <div className="relative flex items-center px-6">
        <div className="h-[2px] flex-1 rounded bg-separator" />
        {!started && (
          <button
            onClick={() =>
              setState({ ...state, firstServer: state.firstServer === "a" ? "b" : "a" })
            }
            className="mx-3 rounded-full bg-elevated px-4 py-2 text-[13px] font-semibold text-cobalt shadow-sm"
          >
            {state.firstServer === "a" ? myName : opponentName} serves first — tap to switch
          </button>
        )}
        {started && (
          <span className="tnum mx-3 text-[13px] font-bold text-ink-3">
            {derived.gamesWonA}–{derived.gamesWonB} · best of {bestOf}
          </span>
        )}
        <div className="h-[2px] flex-1 rounded bg-separator" />
      </div>

      {/* my half */}
      <PlayerHalf
        name={myName}
        score={derived.scoreA}
        serving={derived.server === "a"}
        serveBox={derived.serveBox}
        won={derived.gamesWonA}
        needed={needed}
        tone="var(--primary)"
        onPoint={() => point("a")}
      />

      {/* game banner */}
      <AnimatePresence>
        {banner && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.95 }}
            transition={{ type: "spring", damping: 22, stiffness: 320 }}
            className="pointer-events-none absolute inset-x-0 top-1/2 z-10 flex -translate-y-1/2 justify-center"
          >
            <span className="rounded-full bg-volt px-6 py-3 text-[17px] font-extrabold text-[#1a2400] shadow-xl">
              {banner}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
