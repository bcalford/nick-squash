"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { validateMatchGames, type BestOf, type GameScore } from "@/lib/scoring";

const logMatchSchema = z
  .object({
    opponentId: z.string().uuid().optional(),
    guestName: z.string().trim().min(1).max(60).optional(),
    bestOf: z.union([z.literal(3), z.literal(5)]),
    games: z
      .array(
        z.object({
          scoreA: z.number().int().min(0).max(99),
          scoreB: z.number().int().min(0).max(99),
        })
      )
      .min(2)
      .max(5),
    playedAt: z.string().datetime({ offset: true }).optional(),
    location: z.string().trim().max(80).optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .refine((v) => Boolean(v.opponentId) !== Boolean(v.guestName), {
    message: "Pick a registered opponent or enter a guest name",
  });

export type LogMatchInput = z.infer<typeof logMatchSchema>;

export type LogMatchResult =
  | { ok: true; matchId: string; pendingConfirmation: boolean }
  | { ok: false; error: string };

export async function logMatch(input: LogMatchInput): Promise<LogMatchResult> {
  const parsed = logMatchSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid match" };
  }
  const { opponentId, guestName, bestOf, games, playedAt, location, notes } = parsed.data;

  const gamesCheck = validateMatchGames(games as GameScore[], bestOf as BestOf);
  if (!gamesCheck.valid) {
    return { ok: false, error: gamesCheck.reason };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (opponentId === user.id) return { ok: false, error: "You can’t play yourself" };

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .insert({
      created_by: user.id,
      player_a: user.id,
      player_b: opponentId ?? null,
      opponent_guest_name: guestName ?? null,
      best_of: bestOf,
      played_at: playedAt ?? new Date().toISOString(),
      location: location || null,
      notes: notes || null,
    })
    .select("id")
    .single();
  if (matchError || !match) {
    return { ok: false, error: matchError?.message ?? "Could not save the match" };
  }

  const { error: gamesError } = await supabase.from("games").insert(
    games.map((g, i) => ({
      match_id: match.id,
      game_number: i + 1,
      score_a: g.scoreA,
      score_b: g.scoreB,
    }))
  );
  if (gamesError) {
    // don't leave a matches row with no games behind
    await supabase.from("matches").delete().eq("id", match.id);
    return { ok: false, error: gamesError.message };
  }

  // Guest matches confirm instantly (never rated); registered opponents get a
  // confirmation request and Elo applies only when they confirm.
  if (!opponentId) {
    const { error: rpcError } = await supabase.rpc("confirm_guest_match", {
      p_match_id: match.id,
    });
    if (rpcError) return { ok: false, error: rpcError.message };
  }

  revalidatePath("/");
  return { ok: true, matchId: match.id, pendingConfirmation: Boolean(opponentId) };
}

export type ConfirmMatchResult = { ok: true } | { ok: false; error: string };

/** Opponent-side confirm/dispute; RLS restricts this to the non-creating player. */
export async function answerMatch(
  matchId: string,
  answer: "confirmed" | "disputed"
): Promise<ConfirmMatchResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("matches")
    .update({ status: answer })
    .eq("id", matchId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  return { ok: true };
}
