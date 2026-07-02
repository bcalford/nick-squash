import { describe, expect, it } from "vitest";
import { eloDeltas, expectedScore, kFactor, K_ESTABLISHED, K_PROVISIONAL } from "@/lib/elo";

describe("kFactor", () => {
  it("is provisional (32) for the first 10 matches", () => {
    expect(kFactor(0)).toBe(K_PROVISIONAL);
    expect(kFactor(9)).toBe(K_PROVISIONAL);
  });
  it("drops to 16 from the 11th match on", () => {
    expect(kFactor(10)).toBe(K_ESTABLISHED);
    expect(kFactor(500)).toBe(K_ESTABLISHED);
  });
});

describe("expectedScore", () => {
  it("is 0.5 for equal ratings", () => {
    expect(expectedScore(1200, 1200)).toBeCloseTo(0.5);
  });
  it("is ~0.76 with a +200 edge", () => {
    expect(expectedScore(1400, 1200)).toBeCloseTo(0.7597, 3);
  });
});

describe("eloDeltas", () => {
  it("equal established players swap 8 points", () => {
    const { deltaA, deltaB } = eloDeltas({
      ratingA: 1200,
      ratingB: 1200,
      matchesPlayedA: 20,
      matchesPlayedB: 20,
      winner: "a",
    });
    expect(deltaA).toBe(8);
    expect(deltaB).toBe(-8);
  });

  it("equal provisional players swap 16 points", () => {
    const { deltaA, deltaB } = eloDeltas({
      ratingA: 1200,
      ratingB: 1200,
      matchesPlayedA: 0,
      matchesPlayedB: 0,
      winner: "b",
    });
    expect(deltaA).toBe(-16);
    expect(deltaB).toBe(16);
  });

  it("mixed K: provisional player moves more than the established one", () => {
    const { deltaA, deltaB } = eloDeltas({
      ratingA: 1200,
      ratingB: 1200,
      matchesPlayedA: 3, // K=32
      matchesPlayedB: 50, // K=16
      winner: "a",
    });
    expect(deltaA).toBe(16);
    expect(deltaB).toBe(-8);
  });

  it("an upset moves ratings more than the expected result", () => {
    const upset = eloDeltas({
      ratingA: 1200,
      ratingB: 1500,
      matchesPlayedA: 20,
      matchesPlayedB: 20,
      winner: "a",
    });
    const expected = eloDeltas({
      ratingA: 1500,
      ratingB: 1200,
      matchesPlayedA: 20,
      matchesPlayedB: 20,
      winner: "a",
    });
    expect(upset.deltaA).toBeGreaterThan(expected.deltaA);
    expect(upset.deltaA).toBe(14); // 16 * (1 - 0.1512...) ≈ 13.6 → 14
  });
});
