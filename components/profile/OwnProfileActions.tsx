"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { uploadImage } from "@/lib/upload";
import { profileEditSchema } from "@/lib/validation";
import { getTheme, setTheme } from "@/lib/theme";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { GearIcon, CameraIcon } from "@/components/icons";
import type { Profile } from "@/lib/database.types";

export function OwnProfileActions({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dark, setDark] = useState<boolean>(() => getTheme() === "dark");

  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [city, setCity] = useState(profile.city ?? "");
  const [isPublic, setIsPublic] = useState(profile.is_public);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  async function save() {
    const parsed = profileEditSchema.safeParse({
      displayName,
      bio: bio || undefined,
      city: city || undefined,
      isPublic,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      let avatarUrl: string | undefined;
      if (avatarFile) avatarUrl = await uploadImage("avatars", profile.id, avatarFile);
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          display_name: parsed.data.displayName,
          bio: parsed.data.bio ?? null,
          city: parsed.data.city ?? null,
          is_public: parsed.data.isPublic,
          ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
        })
        .eq("id", profile.id);
      if (updateError) throw new Error(updateError.message);
      setEditOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t save");
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
          Edit Profile
        </Button>
        <button
          onClick={() => setSettingsOpen(true)}
          aria-label="Settings"
          className="flex size-9 items-center justify-center rounded-full bg-cobalt-soft text-cobalt"
        >
          <GearIcon size={18} />
        </button>
      </div>

      <Sheet open={editOpen} onClose={() => setEditOpen(false)} title="Edit Profile">
        <div className="flex flex-col gap-4 px-4 pb-4">
          <label className="relative mx-auto cursor-pointer">
            <Avatar
              src={avatarPreview ?? profile.avatar_url}
              name={displayName || "You"}
              size={88}
            />
            <span className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-full bg-cobalt text-white">
              <CameraIcon size={16} />
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
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-ink-2">Name</span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="h-11 rounded-[12px] border border-separator bg-bg px-3 text-[15px] outline-none focus:border-cobalt"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-ink-2">Bio</span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={280}
              className="resize-none rounded-[12px] border border-separator bg-bg p-3 text-[15px] outline-none focus:border-cobalt"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-ink-2">City</span>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="h-11 rounded-[12px] border border-separator bg-bg px-3 text-[15px] outline-none focus:border-cobalt"
            />
          </label>
          <label className="flex min-h-[--touch] items-center justify-between">
            <span className="text-[15px] font-semibold">Public profile</span>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="size-6 accent-[--primary]"
            />
          </label>
          {error && <p className="text-center text-[13px] font-medium text-coral">{error}</p>}
          <Button size="lg" onClick={save} loading={saving}>
            Save
          </Button>
        </div>
      </Sheet>

      <Sheet open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Settings">
        <div className="flex flex-col gap-2 px-4 pb-4">
          <label className="card flex min-h-[--touch] items-center justify-between px-4 py-3">
            <span className="text-[15px] font-semibold">Dark mode</span>
            <input
              type="checkbox"
              checked={dark}
              onChange={(e) => {
                setDark(e.target.checked);
                setTheme(e.target.checked ? "dark" : "light");
              }}
              className="size-6 accent-[--primary]"
            />
          </label>
          <Button variant="destructive" size="lg" onClick={signOut}>
            Sign Out
          </Button>
        </div>
      </Sheet>
    </>
  );
}
