import { z } from "zod";

export const emailSchema = z.string().trim().email("Enter a valid email");
export const passwordSchema = z.string().min(8, "At least 8 characters");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password"),
});

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().trim().min(1, "Enter your name").max(50),
});

export const usernameSchema = z
  .string()
  .trim()
  .regex(/^[a-zA-Z0-9_]{3,20}$/, "3–20 letters, numbers or underscores");

export const onboardingSchema = z.object({
  username: usernameSchema,
  skillLevel: z.enum(["beginner", "intermediate", "advanced", "competitive"]),
  dominantHand: z.enum(["left", "right"]),
  city: z.string().trim().max(60).optional(),
  clubId: z.string().uuid().optional(),
});

export const profileEditSchema = z.object({
  displayName: z.string().trim().min(1).max(50),
  bio: z.string().trim().max(280).optional(),
  city: z.string().trim().max(60).optional(),
  isPublic: z.boolean(),
});

export const postSchema = z
  .object({
    body: z.string().trim().max(1000),
    imageUrl: z.string().url().optional(),
  })
  .refine((v) => v.body.length > 0 || v.imageUrl, {
    message: "Write something or add a photo",
    path: ["body"],
  });

export const commentSchema = z.object({
  body: z.string().trim().min(1, "Write a comment").max(500),
});

export const challengeSchema = z.object({
  challengedId: z.string().uuid(),
  ladderId: z.string().uuid().optional(),
  proposedTime: z.string().optional(),
  message: z.string().trim().max(280).optional(),
});

export const clubSchema = z.object({
  name: z.string().trim().min(2, "Name your club").max(60),
  city: z.string().trim().max(60).optional(),
  description: z.string().trim().max(500).optional(),
});

export const ladderSchema = z.object({
  name: z.string().trim().min(2, "Name the ladder").max(60),
  description: z.string().trim().max(500).optional(),
  clubId: z.string().uuid().optional(),
});

export const gameScoreSchema = z.object({
  scoreA: z.number().int().min(0).max(99),
  scoreB: z.number().int().min(0).max(99),
});

export const quickEntrySchema = z.object({
  bestOf: z.union([z.literal(3), z.literal(5)]),
  playedAt: z.string(),
  location: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(500).optional(),
  games: z.array(gameScoreSchema).min(2).max(5),
});
