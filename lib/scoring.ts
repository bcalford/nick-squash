/**
 * Pure PAR-11 squash scoring engine.
 *
 * Scoring: point-a-rally to 11, win by 2 (10-10 plays on until a 2-point gap).
 * Serving: the rally winner serves the next rally. A server alternates service
 * boxes while holding serve; on a handover the new server starts from the
 * right box. The winner of a game serves first in the next game.
 *
 * Live state is a history of rally winners, so undo is just removing the last
 * entry and re-deriving.
 */

export type PlayerKey = "a" | "b";
export type BestOf = 3 | 5;
export type ServeBox = "R" | "L";

export interface GameScore {
  scoreA: number;
  scoreB: number;
}

export interface LiveMatchState {
  bestOf: BestOf;
  /** who serves the first rally of game 1 */
  firstServer: PlayerKey;
  /** every rally winner in order — the single source of truth */
  rallies: PlayerKey[];
}

export interface DerivedMatchState {
  completedGames: GameScore[];
  gamesWonA: number;
  gamesWonB: number;
  /** score of the game in progress (0-0 right after a game ends) */
  scoreA: number;
  scoreB: number;
  /** 1-indexed game currently being played */
  gameNumber: number;
  server: PlayerKey;
  serveBox: ServeBox;
  matchOver: boolean;
  matchWinner: PlayerKey | null;
  /** set when the last rally just closed out a game */
  justWonGame: PlayerKey | null;
}

export function gamesNeeded(bestOf: BestOf): number {
  return (bestOf + 1) / 2;
}

/** A game is over when someone has 11+ and leads by 2+. */
export function isGameOver(scoreA: number, scoreB: number): boolean {
  const hi = Math.max(scoreA, scoreB);
  return hi >= 11 && Math.abs(scoreA - scoreB) >= 2;
}

/**
 * Validates a FINAL game score under PAR-11:
 * if the loser reached 9 or fewer the winner has exactly 11 (11-0 … 11-9);
 * from deuce the winner has exactly two more than the loser (12-10, 13-11, …).
 */
export function isValidGameScore(scoreA: number, scoreB: number): boolean {
  if (!Number.isInteger(scoreA) || !Number.isInteger(scoreB)) return false;
  const hi = Math.max(scoreA, scoreB);
  const lo = Math.min(scoreA, scoreB);
  if (lo < 0) return false;
  if (lo <= 9) return hi === 11;
  return hi === lo + 2;
}

/**
 * Validates a full set of final game scores for a match: every game valid,
 * the winner reaches the required game count exactly on the final game, and
 * no games are played after the match is decided.
 */
export function validateMatchGames(
  games: GameScore[],
  bestOf: BestOf
): { valid: true; winner: PlayerKey } | { valid: false; reason: string } {
  const needed = gamesNeeded(bestOf);
  if (games.length < needed) {
    return { valid: false, reason: `Enter at least ${needed} games` };
  }
  if (games.length > bestOf) {
    return { valid: false, reason: `Best of ${bestOf} has at most ${bestOf} games` };
  }
  let wonA = 0;
  let wonB = 0;
  for (let i = 0; i < games.length; i++) {
    const g = games[i];
    if (!isValidGameScore(g.scoreA, g.scoreB)) {
      return {
        valid: false,
        reason: `Game ${i + 1}: ${g.scoreA}–${g.scoreB} isn’t a valid PAR-11 score`,
      };
    }
    if (wonA >= needed || wonB >= needed) {
      return { valid: false, reason: `Game ${i + 1} was played after the match was decided` };
    }
    if (g.scoreA > g.scoreB) wonA++;
    else wonB++;
  }
  if (wonA < needed && wonB < needed) {
    return { valid: false, reason: "Nobody has won the match yet — add the missing games" };
  }
  return { valid: true, winner: wonA > wonB ? "a" : "b" };
}

/** Derives full live state (scores, server, box, game/match status) from history. */
export function deriveState(state: LiveMatchState): DerivedMatchState {
  const needed = gamesNeeded(state.bestOf);
  const completedGames: GameScore[] = [];
  let scoreA = 0;
  let scoreB = 0;
  let gamesWonA = 0;
  let gamesWonB = 0;
  let server: PlayerKey = state.firstServer;
  let serveBox: ServeBox = "R";
  let matchWinner: PlayerKey | null = null;
  let justWonGame: PlayerKey | null = null;

  for (const winner of state.rallies) {
    if (matchWinner) break; // defensive: rallies past match end are ignored

    // serve: hold = alternate box; handover = new server from the right box
    if (winner === server) {
      serveBox = serveBox === "R" ? "L" : "R";
    } else {
      server = winner;
      serveBox = "R";
    }

    if (winner === "a") scoreA++;
    else scoreB++;
    justWonGame = null;

    if (isGameOver(scoreA, scoreB)) {
      completedGames.push({ scoreA, scoreB });
      if (winner === "a") gamesWonA++;
      else gamesWonB++;
      justWonGame = winner;
      scoreA = 0;
      scoreB = 0;
      // the game winner serves first in the next game
      server = winner;
      serveBox = "R";
      if (gamesWonA >= needed) matchWinner = "a";
      if (gamesWonB >= needed) matchWinner = "b";
    }
  }

  return {
    completedGames,
    gamesWonA,
    gamesWonB,
    scoreA,
    scoreB,
    gameNumber: completedGames.length + 1,
    server,
    serveBox,
    matchOver: matchWinner !== null,
    matchWinner,
    justWonGame,
  };
}

/** Records a rally for `winner`; no-op once the match is over. */
export function addRally(state: LiveMatchState, winner: PlayerKey): LiveMatchState {
  if (deriveState(state).matchOver) return state;
  return { ...state, rallies: [...state.rallies, winner] };
}

/** Removes the last rally (works across game boundaries by re-derivation). */
export function undoRally(state: LiveMatchState): LiveMatchState {
  if (state.rallies.length === 0) return state;
  return { ...state, rallies: state.rallies.slice(0, -1) };
}

export function newLiveMatch(bestOf: BestOf, firstServer: PlayerKey = "a"): LiveMatchState {
  return { bestOf, firstServer, rallies: [] };
}
