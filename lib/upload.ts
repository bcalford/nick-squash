import { createClient } from "@/lib/supabase/client";

/**
 * Uploads an image to the given bucket under the user's own folder
 * (required by the storage RLS policies) and returns its public URL.
 */
export async function uploadImage(
  bucket: "avatars" | "post-images",
  userId: string,
  file: File
): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new Error(error.message);

  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
