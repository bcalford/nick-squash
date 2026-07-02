import type { MatchWithGames } from "@/lib/feed";

/**
 * Pure stat derivations for a profile page, computed from that player's
 * matches (any status; each function filters to what it needs).
 */

export interface EloPoint {
  date: string;
  elo: number;
}

export interface ProfileStats {
  wins: number;
  losses: number;
  winRate: number | null;
  /** current run of consecutive results; positive = wins, negative = losses */
  streak: number;
  avgPointsWon: number | null;
  avgPointsConceded: number | null;
  eloSeries: EloPoint[];
  /** results bucketed by match length (games played) */
  byLength: { length: number; wins: number; losses: number }[];
}

function isConfirmed(m: MatchWithGames) {
  return m.status === "confirmed";
}

/** Did `playerId` win this confirmed match? Handles guest matches (winner_id null). */
export function didWin(m: MatchWithGames, playerId: string): boolean {
  if (m.winner_id) return m.winner_id === playerId;
  // guest match: playerId is player_a; count games
  const wonA = m.games.filter((g) => g.score_a > g.score_b).length;
  const wonB = m.games.length - wonA;
  return m.player_a === playerId ? wonA > wonB : wonB > wonA;
}

export function computeStats(matches: MatchWithGames[], playerId: string): ProfileStats {
  const confirmed = matches
    .filter(isConfirmed)
    .sort((a, b) => a.played_at.localeCompare(b.played_at));

  let wins = 0;
  let losses = 0;
  let pointsWon = 0;
  let pointsConceded = 0;
  let gameCount = 0;
  const byLengthMap = new Map<number, { wins: number; losses: number }>([
    [3, { wins: 0, losses: 0 }],
    [4, { wins: 0, losses: 0 }],
    [5, { wins: 0, losses: 0 }],
  ]);

  for (const m of confirmed) {
    const won = didWin(m, playerId);
    if (won) wins++;
    else losses++;

    const isA = m.player_a === playerId;
    for (const g of m.games) {
      pointsWon += isA ? g.score_a : g.score_b;
      pointsConceded += isA ? g.score_b : g.score_a;
      gameCount++;
    }

    const bucket = byLengthMap.get(m.games.length);
    if (bucket) {
      if (won) bucket.wins++;
      else bucket.losses++;
    }
  }

  // streak: walk back from the latest result
  let streak = 0;
  for (let i = confirmed.length - 1; i >= 0; i--) {
    const won = didWin(confirmed[i], playerId);
    if (streak === 0) streak = won ? 1 : -1;
    else if (streak > 0 && won) streak++;
    else if (streak < 0 && !won) streak--;
    else break;
  }

  // Elo over time: walk rated matches forward from the derived starting point
  const rated = confirmed.filter(
    (m) => m.player_b !== null && m.elo_delta_a !== null && m.elo_delta_b !== null
  );
  const deltas = rated.map((m) =>
    m.player_a === playerId ? (m.elo_delta_a as number) : (m.elo_delta_b as number)
  );
  const eloSeries: EloPoint[] = [];
  if (rated.length > 0) {
    const total = deltas.reduce((sum, d) => sum + d, 0);
    // profile.elo_rating = start + total; series is reconstructed from deltas
    let running = -total; // relative walk; caller shifts by current rating
    eloSeries.push({ date: rated[0].played_at, elo: running });
    for (let i = 0; i < rated.length; i++) {
      running += deltas[i];
      eloSeries.push({ date: rated[i].played_at, elo: running });
    }
  }

  const total = wins + losses;
  return {
    wins,
    losses,
    winRate: total > 0 ? wins / total : null,
    streak,
    avgPointsWon: gameCount > 0 ? pointsWon / gameCount : null,
    avgPointsConceded: gameCount > 0 ? pointsConceded / gameCount : null,
    eloSeries,
    byLength: [...byLengthMap.entries()].map(([length, r]) => ({ length, ...r })),
  };
}

/** Shifts the relative Elo walk so it ends at the player's current rating. */
export function absoluteEloSeries(series: EloPoint[], currentElo: number): EloPoint[] {
  if (series.length === 0) return [];
  const last = series[series.length - 1].elo;
  return series.map((p) => ({ date: p.date, elo: p.elo - last + currentElo }));
}

export interface HeadToHeadRecord {
  opponentId: string;
  wins: number;
  losses: number;
}

/** W-L per registered opponent, most-played first. */
export function computeHeadToHead(
  matches: MatchWithGames[],
  playerId: string
): HeadToHeadRecord[] {
  const map = new Map<string, HeadToHeadRecord>();
  for (const m of matches) {
    if (!isConfirmed(m) || m.player_b === null) continue;
    const opponentId = m.player_a === playerId ? m.player_b : m.player_a;
    let rec = map.get(opponentId);
    if (!rec) {
      rec = { opponentId, wins: 0, losses: 0 };
      map.set(opponentId, rec);
    }
    if (didWin(m, playerId)) rec.wins++;
    else rec.losses++;
  }
  return [...map.values()].sort((a, b) => b.wins + b.losses - (a.wins + a.losses));
}
