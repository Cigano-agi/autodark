import { supabase } from "@/integrations/supabase/client";

/**
 * Faz upload de um Blob de vídeo para o Supabase Storage bucket "videos"
 * e retorna a URL pública permanente.
 *
 * Path: videos/{userId}/{generationId}.webm
 */
export async function uploadVideoToStorage(
  videoBlob: Blob,
  generationId: string,
): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  const path = `${user.id}/${generationId}.webm`;

  const { error: uploadError } = await supabase.storage
    .from("videos")
    .upload(path, videoBlob, {
      contentType: "video/webm",
      upsert: true,
    });

  if (uploadError) throw new Error(`Upload falhou: ${uploadError.message}`);

  const { data } = supabase.storage.from("videos").getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Salva a URL do vídeo na coluna video_url da tabela video_generations.
 */
export async function saveVideoUrl(generationId: string, videoUrl: string): Promise<void> {
  const { error } = await supabase
    .from("video_generations")
    .update({ video_url: videoUrl, status: "exported" })
    .eq("id", generationId);

  if (error) {
    console.error("[video-storage] Erro ao salvar video_url:", error.message);
  }
}
