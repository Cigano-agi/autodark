import { supabase } from "@/integrations/supabase/client";

/**
 * Upload a Blob to Supabase Storage and return the public URL.
 * If the blob is empty or upload fails, returns null.
 */
export async function uploadToStorage(
  bucket: "audio" | "images" | "thumbnails" | "videos",
  path: string,
  blob: Blob,
  contentType: string,
): Promise<string | null> {
  if (!blob || blob.size < 100) return null;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, blob, { contentType, upsert: true });

  if (error) {
    console.error(`[storage] Upload to ${bucket}/${path} failed:`, error.message);
    return null;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/** Upload audio blob and return public URL */
export async function uploadAudio(
  channelId: string,
  contentId: string,
  chapterIndex: number,
  blob: Blob,
): Promise<string | null> {
  const path = `${channelId}/${contentId}/ch${chapterIndex}.mp3`;
  return uploadToStorage("audio", path, blob, "audio/mpeg");
}

/** Upload scene image (from blob URL or fetch from URL) and return public Storage URL */
export async function uploadImage(
  channelId: string,
  contentId: string,
  sceneIndex: number,
  imageUrlOrBlob: string | Blob,
): Promise<string | null> {
  let blob: Blob;

  if (imageUrlOrBlob instanceof Blob) {
    blob = imageUrlOrBlob;
  } else {
    // If it's already a Supabase Storage URL, skip
    if (imageUrlOrBlob.includes("supabase.co/storage")) return imageUrlOrBlob;

    try {
      const res = await fetch(imageUrlOrBlob);
      if (!res.ok) {
        console.warn(`[storage] Fetch de imagem retornou ${res.status} para:`, imageUrlOrBlob.slice(0, 80));
        return null; // Não persistir URL inválida no banco
      }
      blob = await res.blob();
    } catch {
      console.warn("[storage] Falha ao buscar imagem para upload:", imageUrlOrBlob.slice(0, 80));
      return null; // Não retornar URL original — pode ser localhost ou URL temporária
    }
  }

  const path = `${channelId}/${contentId}/scene${sceneIndex}.jpg`;
  return uploadToStorage("images", path, blob, "image/jpeg");
}
