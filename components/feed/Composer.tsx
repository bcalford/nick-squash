"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uploadImage } from "@/lib/upload";
import { postSchema } from "@/lib/validation";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { CameraIcon, XIcon } from "@/components/icons";

export function Composer({
  open,
  onClose,
  viewerId,
  onPosted,
}: {
  open: boolean;
  onClose: () => void;
  viewerId: string;
  onPosted: () => void;
}) {
  const [body, setBody] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function post() {
    if (sending) return;
    setSending(true);
    setError(null);
    try {
      const supabase = createClient();
      let imageUrl: string | undefined;
      if (imageFile) imageUrl = await uploadImage("post-images", viewerId, imageFile);
      const parsed = postSchema.safeParse({ body: body.trim(), imageUrl });
      if (!parsed.success) {
        setError(parsed.error.issues[0].message);
        setSending(false);
        return;
      }
      const { error: insertError } = await supabase.from("posts").insert({
        author_id: viewerId,
        body: parsed.data.body,
        image_url: parsed.data.imageUrl ?? null,
      });
      if (insertError) throw new Error(insertError.message);
      setBody("");
      setImageFile(null);
      setImagePreview(null);
      onPosted();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t post");
    } finally {
      setSending(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="New Post">
      <div className="flex flex-col gap-3 px-4 pb-4">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          maxLength={1000}
          placeholder="Court report, trash talk, training notes…"
          className="resize-none rounded-[16px] border border-separator bg-bg p-4 text-[16px] leading-snug outline-none placeholder:text-ink-3 focus:border-cobalt"
        />
        {imagePreview && (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
            <img src={imagePreview} alt="" className="max-h-64 w-full rounded-[16px] object-cover" />
            <button
              onClick={() => {
                setImageFile(null);
                setImagePreview(null);
              }}
              aria-label="Remove photo"
              className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-black/60 text-white"
            >
              <XIcon size={16} />
            </button>
          </div>
        )}
        {error && <p className="text-center text-[13px] font-medium text-coral">{error}</p>}
        <div className="flex items-center justify-between">
          <label className="flex size-11 cursor-pointer items-center justify-center rounded-full bg-inset text-ink-2">
            <CameraIcon size={22} />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setImageFile(file);
                  setImagePreview(URL.createObjectURL(file));
                }
              }}
            />
          </label>
          <Button onClick={post} loading={sending} disabled={!body.trim() && !imageFile}>
            Post
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
