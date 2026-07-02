/**
 * Elo rating math — mirrors the Postgres confirmation trigger exactly.
 * Ratings start at 1200; K=32 while a player has fewer than 10 rated
 * matches (provisional), K=16 after. Applied only when a match between two
 * registered players is confirmed; guest matches are never rated.
 */

export const STARTING_ELO = 1200;
export const PROVISIONAL_MATCHES = 10;
export const K_PROVISIONAL = 32;
export const K_ESTABLISHED = 16;

export function expectedScore(ratingSelf: number, ratingOpponent: number): number {
  return 1 / (1 + Math.pow(10, (ratingOpponent - ratingSelf) / 400));
}

export function kFactor(matchesPlayed: number): number {
  return matchesPlayed < PROVISIONAL_MATCHES ? K_PROVISIONAL : K_ESTABLISHED;
}

export function eloDeltas(params: {
  ratingA: number;
  ratingB: number;
  matchesPlayedA: number;
  matchesPlayedB: number;
  winner: "a" | "b";
}): { deltaA: number; deltaB: number } {
  const { ratingA, ratingB, matchesPlayedA, matchesPlayedB, winner } = params;
  const ea = expectedScore(ratingA, ratingB);
  const sa = winner === "a" ? 1 : 0;
  const deltaA = Math.round(kFactor(matchesPlayedA) * (sa - ea));
  const deltaB = Math.round(kFactor(matchesPlayedB) * (1 - sa - (1 - ea)));
  return { deltaA, deltaB };
}
