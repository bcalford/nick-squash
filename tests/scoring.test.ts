import { describe, expect, it } from "vitest";
import {
  addRally,
  deriveState,
  isValidGameScore,
  newLiveMatch,
  undoRally,
  validateMatchGames,
  type PlayerKey,
} from "@/lib/scoring";

function play(rallies: string, bestOf: 3 | 5 = 5) {
  let state = newLiveMatch(bestOf);
  for (const r of rallies) state = addRally(state, r as PlayerKey);
  return state;
}

describe("isValidGameScore (PAR-11 final scores)", () => {
  it("accepts 11-9", () => expect(isValidGameScore(11, 9)).toBe(true));
  it("accepts 9-11 (either orientation)", () => expect(isValidGameScore(9, 11)).toBe(true));
  it("accepts 12-10 (deuce)", () => expect(isValidGameScore(12, 10)).toBe(true));
  it("accepts 11-0 (bagel)", () => expect(isValidGameScore(11, 0)).toBe(true));
  it("accepts deep deuce 15-13", () => expect(isValidGameScore(15, 13)).toBe(true));
  it("rejects 11-10 (must win by 2)", () => expect(isValidGameScore(11, 10)).toBe(false));
  it("rejects 10-8 (game not reached)", () => expect(isValidGameScore(10, 8)).toBe(false));
  it("rejects 12-9 (past 11 without deuce)", () => expect(isValidGameScore(12, 9)).toBe(false));
  it("rejects 13-10 (deuce must end +2 exactly)", () => expect(isValidGameScore(13, 10)).toBe(false));
  it("rejects negatives and non-integers", () => {
    expect(isValidGameScore(-1, 11)).toBe(false);
    expect(isValidGameScore(11.5, 9)).toBe(false);
  });
});

describe("live game progression", () => {
  it("ends a game at 11 with a 2+ margin", () => {
    const s = deriveState(play("a".repeat(11)));
    expect(s.completedGames).toEqual([{ scoreA: 11, scoreB: 0 }]);
    expect(s.gamesWonA).toBe(1);
    expect(s.gameNumber).toBe(2);
  });

  it("does not end at 11-10; plays on to 12-10", () => {
    // 10-10, then A wins one (11-10, still live), then A wins again (12-10)
    let state = play("ab".repeat(10)); // 10-10
    state = addRally(state, "a"); // 11-10
    expect(deriveState(state).completedGames).toHaveLength(0);
    expect(deriveState(state).scoreA).toBe(11);
    state = addRally(state, "a"); // 12-10 — game over
    const s = deriveState(state);
    expect(s.completedGames).toEqual([{ scoreA: 12, scoreB: 10 }]);
  });

  it("supports extended deuce (win by 2 at 14-12)", () => {
    let state = play("ab".repeat(10)); // 10-10
    state = addRally(state, "a"); // 11-10
    state = addRally(state, "b"); // 11-11
    state = addRally(state, "a"); // 12-11
    state = addRally(state, "b"); // 12-12
    state = addRally(state, "a"); // 13-12
    state = addRally(state, "a"); // 14-12
    expect(deriveState(state).completedGames).toEqual([{ scoreA: 14, scoreB: 12 }]);
  });
});

describe("match progression", () => {
  it("best of 5 ends at 3 games", () => {
    const s = deriveState(play("a".repeat(33)));
    expect(s.matchOver).toBe(true);
    expect(s.matchWinner).toBe("a");
    expect(s.completedGames).toHaveLength(3);
  });

  it("best of 3 ends at 2 games", () => {
    const s = deriveState(play("b".repeat(22), 3));
    expect(s.matchOver).toBe(true);
    expect(s.matchWinner).toBe("b");
  });

  it("ignores rallies after the match is over", () => {
    let state = play("a".repeat(33));
    state = addRally(state, "b");
    expect(state.rallies).toHaveLength(33);
  });
});

describe("PAR serve rotation", () => {
  it("first server starts in the right box", () => {
    const s = deriveState(newLiveMatch(5));
    expect(s.server).toBe("a");
    expect(s.serveBox).toBe("R");
  });

  it("server alternates boxes while holding serve", () => {
    let s = deriveState(play("a"));
    expect(s.server).toBe("a");
    expect(s.serveBox).toBe("L");
    s = deriveState(play("aa"));
    expect(s.serveBox).toBe("R");
  });

  it("rally winner takes over serve from the right box", () => {
    const s = deriveState(play("ab"));
    expect(s.server).toBe("b");
    expect(s.serveBox).toBe("R");
  });

  it("game winner serves first in the next game", () => {
    // B wins game 1 despite A serving first
    const s = deriveState(play("b".repeat(11)));
    expect(s.gameNumber).toBe(2);
    expect(s.server).toBe("b");
    expect(s.serveBox).toBe("R");
  });
});

describe("undo", () => {
  it("removes the last rally", () => {
    let state = play("aab");
    state = undoRally(state);
    const s = deriveState(state);
    expect(s.scoreA).toBe(2);
    expect(s.scoreB).toBe(0);
  });

  it("undoes across a game boundary", () => {
    let state = play("a".repeat(11)); // game 1 done
    expect(deriveState(state).completedGames).toHaveLength(1);
    state = undoRally(state);
    const s = deriveState(state);
    expect(s.completedGames).toHaveLength(0);
    expect(s.scoreA).toBe(10);
    expect(s.gameNumber).toBe(1);
  });

  it("is a no-op on an empty match", () => {
    const state = newLiveMatch(5);
    expect(undoRally(state)).toBe(state);
  });
});

describe("validateMatchGames (quick entry)", () => {
  it("accepts a clean 3-0 in best of 5", () => {
    const result = validateMatchGames(
      [
        { scoreA: 11, scoreB: 5 },
        { scoreA: 11, scoreB: 9 },
        { scoreA: 12, scoreB: 10 },
      ],
      5
    );
    expect(result).toEqual({ valid: true, winner: "a" });
  });

  it("accepts a five-game thriller", () => {
    const result = validateMatchGames(
      [
        { scoreA: 11, scoreB: 8 },
        { scoreA: 9, scoreB: 11 },
        { scoreA: 11, scoreB: 13 },
        { scoreA: 11, scoreB: 4 },
        { scoreA: 15, scoreB: 13 },
      ],
      5
    );
    expect(result).toEqual({ valid: true, winner: "a" });
  });

  it("rejects an 11-10 game", () => {
    const result = validateMatchGames(
      [
        { scoreA: 11, scoreB: 10 },
        { scoreA: 11, scoreB: 1 },
        { scoreA: 11, scoreB: 2 },
      ],
      5
    );
    expect(result.valid).toBe(false);
  });

  it("rejects games played after the match was decided", () => {
    const result = validateMatchGames(
      [
        { scoreA: 11, scoreB: 1 },
        { scoreA: 11, scoreB: 2 },
        { scoreA: 11, scoreB: 3 },
        { scoreA: 5, scoreB: 11 },
      ],
      5
    );
    expect(result.valid).toBe(false);
  });

  it("rejects an unfinished match", () => {
    const result = validateMatchGames(
      [
        { scoreA: 11, scoreB: 1 },
        { scoreA: 1, scoreB: 11 },
      ],
      3
    );
    expect(result.valid).toBe(false);
  });

  it("rejects too many games for best of 3", () => {
    const result = validateMatchGames(
      [
        { scoreA: 11, scoreB: 1 },
        { scoreA: 1, scoreB: 11 },
        { scoreA: 11, scoreB: 1 },
        { scoreA: 11, scoreB: 1 },
      ],
      3
    );
    expect(result.valid).toBe(false);
  });
});
