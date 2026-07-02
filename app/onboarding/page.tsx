"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { uploadImage } from "@/lib/upload";
import { usernameSchema } from "@/lib/validation";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { CameraIcon } from "@/components/icons";
import type { Club, DominantHand, SkillLevel } from "@/lib/database.types";

const STEPS = ["username", "level", "avatar", "home"] as const;
type Step = (typeof STEPS)[number];

const skillLevels: { value: SkillLevel; label: string; blurb: string }[] = [
  { value: "beginner", label: "Beginner", blurb: "Learning the lines" },
  { value: "intermediate", label: "Intermediate", blurb: "Rallying with intent" },
  { value: "advanced", label: "Advanced", blurb: "Hunting nicks" },
  { value: "competitive", label: "Competitive", blurb: "Box leagues & tournaments" },
];

const slide = {
  initial: { opacity: 0, x: 32 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -32 },
  transition: { type: "spring" as const, damping: 30, stiffness: 350 },
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("username");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [skillLevel, setSkillLevel] = useState<SkillLevel | null>(null);
  const [hand, setHand] = useState<DominantHand | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [city, setCity] = useState("");
  const [clubs, setClubs] = useState<Club[]>([]);
  const [clubId, setClubId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("Player");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata;
      if (typeof meta?.display_name === "string") setDisplayName(meta.display_name);
    });
    supabase
      .from("clubs")
      .select("*")
      .order("name")
      .limit(50)
      .then(({ data }) => setClubs(data ?? []));
  }, []);

  const stepIndex = STEPS.indexOf(step);

  async function nextFromUsername() {
    const parsed = usernameSchema.safeParse(username);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setPending(true);
    setError(null);
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", parsed.data)
      .maybeSingle();
    setPending(false);
    if (data) {
      setError("That username is taken");
      return;
    }
    setStep("level");
  }

  async function finish() {
    setPending(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login");
      return;
    }
    try {
      let avatarUrl: string | undefined;
      if (avatarFile) {
        avatarUrl = await uploadImage("avatars", user.id, avatarFile);
      }
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          username,
          skill_level: skillLevel,
          dominant_hand: hand,
          city: city.trim() || null,
          club_id: clubId,
          ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
        })
        .eq("id", user.id);
      if (updateError) throw new Error(updateError.message);
      if (clubId) {
        await supabase.from("club_members").insert({ club_id: clubId, user_id: user.id });
      }
      router.replace("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col px-6 pt-safe pb-safe">
      <div className="flex justify-center gap-2 py-8">
        {STEPS.map((s, i) => (
          <motion.span
            key={s}
            animate={{
              width: i === stepIndex ? 24 : 8,
              backgroundColor: i <= stepIndex ? "var(--primary)" : "var(--bg-inset)",
            }}
            className="h-2 rounded-full"
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === "username" && (
          <motion.div key="username" {...slide} className="flex flex-col gap-6">
            <div>
              <h1 className="large-title">Pick a username</h1>
              <p className="mt-1 text-[15px] text-ink-2">
                This is how other players find and challenge you.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-[14px] border border-separator bg-elevated px-4">
              <span className="text-[17px] font-semibold text-ink-3">@</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                autoCapitalize="none"
                autoCorrect="off"
                placeholder="wall_crawler"
                className="h-[50px] flex-1 bg-transparent text-[17px] outline-none placeholder:text-ink-3"
              />
            </div>
            {error ? <p className="text-[13px] font-medium text-coral">{error}</p> : null}
            <Button size="lg" onClick={nextFromUsername} loading={pending} disabled={!username}>
              Continue
            </Button>
          </motion.div>
        )}

        {step === "level" && (
          <motion.div key="level" {...slide} className="flex flex-col gap-6">
            <div>
              <h1 className="large-title">Your game</h1>
              <p className="mt-1 text-[15px] text-ink-2">Level and racket hand.</p>
            </div>
            <div className="flex flex-col gap-2">
              {skillLevels.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setSkillLevel(s.value)}
                  className={`flex items-center justify-between rounded-[16px] border-2 px-4 py-3 text-left transition-colors ${
                    skillLevel === s.value
                      ? "border-cobalt bg-cobalt-soft"
                      : "border-separator bg-elevated"
                  }`}
                >
                  <span className="text-[15px] font-semibold">{s.label}</span>
                  <span className="text-[13px] text-ink-2">{s.blurb}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              {(["left", "right"] as const).map((h) => (
                <button
                  key={h}
                  onClick={() => setHand(h)}
                  className={`flex-1 rounded-[16px] border-2 py-3 text-[15px] font-semibold capitalize transition-colors ${
                    hand === h ? "border-cobalt bg-cobalt-soft" : "border-separator bg-elevated"
                  }`}
                >
                  {h === "left" ? "🫲 Left" : "🫱 Right"}
                </button>
              ))}
            </div>
            <Button size="lg" onClick={() => setStep("avatar")} disabled={!skillLevel || !hand}>
              Continue
            </Button>
          </motion.div>
        )}

        {step === "avatar" && (
          <motion.div key="avatar" {...slide} className="flex flex-col items-center gap-6">
            <div className="self-start">
              <h1 className="large-title">Say cheese</h1>
              <p className="mt-1 text-[15px] text-ink-2">Add a photo so rivals recognize you.</p>
            </div>
            <label className="relative cursor-pointer">
              {avatarPreview ? (
                <Avatar src={avatarPreview} name={displayName} size={144} />
              ) : (
                <Avatar name={displayName} size={144} />
              )}
              <span className="absolute -bottom-1 -right-1 flex size-11 items-center justify-center rounded-full bg-cobalt text-white shadow-lg">
                <CameraIcon size={22} />
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setAvatarFile(file);
                    setAvatarPreview(URL.createObjectURL(file));
                  }
                }}
              />
            </label>
            <div className="flex w-full flex-col gap-2">
              <Button size="lg" onClick={() => setStep("home")}>
                {avatarFile ? "Continue" : "Skip for now"}
              </Button>
            </div>
          </motion.div>
        )}

        {step === "home" && (
          <motion.div key="home" {...slide} className="flex flex-col gap-6">
            <div>
              <h1 className="large-title">Home court</h1>
              <p className="mt-1 text-[15px] text-ink-2">
                Optional — helps you discover nearby players.
              </p>
            </div>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City"
              className="h-[50px] rounded-[14px] border border-separator bg-elevated px-4 text-[17px] outline-none placeholder:text-ink-3 focus:border-cobalt"
            />
            {clubs.length > 0 && (
              <div className="flex max-h-56 flex-col gap-2 overflow-y-auto">
                {clubs.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setClubId(clubId === c.id ? null : c.id)}
                    className={`flex items-center justify-between rounded-[16px] border-2 px-4 py-3 text-left transition-colors ${
                      clubId === c.id
                        ? "border-cobalt bg-cobalt-soft"
                        : "border-separator bg-elevated"
                    }`}
                  >
                    <span className="text-[15px] font-semibold">{c.name}</span>
                    {c.city ? <span className="text-[13px] text-ink-2">{c.city}</span> : null}
                  </button>
                ))}
              </div>
            )}
            {error ? <p className="text-[13px] font-medium text-coral">{error}</p> : null}
            <Button size="lg" onClick={finish} loading={pending}>
              Step on Court
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
