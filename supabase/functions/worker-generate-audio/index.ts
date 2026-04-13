// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const MAX_BATCH = 5;
const MAX_ERROR_COUNT = 3;

interface SceneSnapshot {
  chapterIndex: number;
  sceneIndex: number;
  status: "pending" | "processing_audio" | "audio_done" | "processing" | "visual_done" | "complete" | "error";
  audioUrl?: string;
  imageUrl?: string;
  durationSec?: number;
  prompt?: string;
  narration?: string; // Assume we have the text here, or mapped somewhere
  errorMessage?: string;
  errorCount?: number;
}

function makeSupabaseClient() {
  const headers = {
    "apikey": SUPABASE_SERVICE_ROLE_KEY!,
    "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY!}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation",
  };
  return { headers };
}

async function getProductionState(channelId: string, headers: Record<string, string>) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/production_states?channel_id=eq.${channelId}&select=id,scenes,completed_scenes,total_scenes`,
    { headers }
  );
  if (!res.ok) throw new Error(`DB read failed: ${res.status}`);
  const rows = await res.json();
  if (!rows.length) throw new Error(`No production_state for channel_id=${channelId}`);
  return rows[0] as { id: string; scenes: SceneSnapshot[]; completed_scenes: number; total_scenes: number };
}

async function updateScenes(
  stateId: string,
  scenes: SceneSnapshot[],
  headers: Record<string, string>
) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/production_states?id=eq.${stateId}`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify({ scenes }),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DB update failed: ${res.status} — ${text.slice(0, 200)}`);
  }
}

async function generateAndUploadAudio(
  scene: SceneSnapshot,
  channelId: string,
  stateId: string,
  voiceProvider: string,
  voiceId: string,
  dbHeaders: Record<string, string>
): Promise<{ audioUrl: string, durationSec: number } | { error: string }> {
  // Strip markdown from text
  const rawText = scene.narration ?? "";
  const text = rawText.replace(/^#{1,6}\s+/gm, "").replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1")
    .replace(/~~(.+?)~~/g, "$1").replace(/`(.+?)`/g, "$1").replace(/^[-*_]{3,}\s*$/gm, "")
    .replace(/^[-*+]\s+/gm, "").replace(/^\d+\.\s+/gm, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\n{3,}/g, "\n\n").trim();

  // If no narration, just pretend it's browser_tts with 3 seconds
  if (!text) {
    return { audioUrl: "browser_tts", durationSec: 3 };
  }

  try {
    const invokeRes = await fetch(`${SUPABASE_URL}/functions/v1/youtube-generate-audio`, {
      method: "POST",
      headers: { ...dbHeaders },
      body: JSON.stringify({
        text,
        voice_id: voiceId,
        provider: voiceProvider,
      })
    });

    if (!invokeRes.ok) {
      const errText = await invokeRes.text();
      throw new Error(`TTS Error ${invokeRes.status}: ${errText}`);
    }

    const { audio_url } = await invokeRes.json();
    if (!audio_url) throw new Error("No audio_url returned from youtube-generate-audio");

    // Fetch the audio blob to upload to Storage
    const imgRes = await fetch(audio_url);
    if (!imgRes.ok) throw new Error(`Failed to fetch AI audio: ${imgRes.status}`);
    const audioBlob = await imgRes.blob();

    // Path no Storage: channelId/stateId/ch{N}-sc{N}.mp3
    const storagePath = `${channelId}/${stateId}/audio-ch${scene.chapterIndex}-sc${scene.sceneIndex}.mp3`;
    const uploadRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/content-media/${storagePath}`,
      {
        method: "POST",
        headers: {
          "apikey": SUPABASE_SERVICE_ROLE_KEY!,
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY!}`,
          "Content-Type": "audio/mpeg",
          "x-upsert": "true",
        },
        body: audioBlob,
      }
    );

    let publicUrl = audio_url;
    if (uploadRes.ok) {
      publicUrl = `${SUPABASE_URL}/storage/v1/object/public/content-media/${storagePath}`;
      console.log(`[worker-audio] Cena narrada e salva: ch=${scene.chapterIndex} sc=${scene.sceneIndex} url=${publicUrl}`);
    } else {
      console.warn(`[worker-audio] Storage upload failed (${uploadRes.status}) — usando URL direta`);
    }

    const durationSec = Math.ceil(text.split(/\s+/).length / 2.5);

    return { audioUrl: publicUrl, durationSec };

  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[worker-audio] Erro na cena ch=${scene.chapterIndex} sc=${scene.sceneIndex}: ${errorMsg}`);
    return { error: errorMsg };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing Supabase env vars");

    const body = await req.json();
    const channelId: string = body?.channel_id;
    if (!channelId || typeof channelId !== "string") {
      return new Response(
        JSON.stringify({ error: "channel_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { headers: dbHeaders } = makeSupabaseClient();

    // Fetch voice configured in channel_settings
    let voiceProvider = "ai33";
    let voiceId = "onyx";
    try {
      const settRes = await fetch(`${SUPABASE_URL}/rest/v1/channel_settings?channel_id=eq.${channelId}&select=voice_provider,voice_id`, { headers: dbHeaders });
      if (settRes.ok) {
        const rows = await settRes.json();
        if (rows.length > 0) {
          voiceProvider = rows[0].voice_provider || "ai33";
          voiceId = rows[0].voice_id || "onyx";
        }
      }
    } catch(e) {}

    const stateRow = await getProductionState(channelId, dbHeaders);
    const allScenes: SceneSnapshot[] = stateRow.scenes ?? [];

    const pendingScenes = allScenes
      .filter(s => s.status === "pending")
      .slice(0, MAX_BATCH);

    if (pendingScenes.length === 0) {
      console.log(`[worker-audio] Nenhuma cena pending para channel=${channelId}`);
      return new Response(
        JSON.stringify({ processed: 0, remaining: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[worker-audio] Processando ${pendingScenes.length} cenas pending para channel=${channelId}`);

    const processingScenes = allScenes.map(s =>
      pendingScenes.some(p => p.chapterIndex === s.chapterIndex && p.sceneIndex === s.sceneIndex)
        ? { ...s, status: "processing_audio" as const }
        : s
    );
    await updateScenes(stateRow.id, processingScenes, dbHeaders);

    const results = await Promise.all(
      pendingScenes.map(scene =>
        generateAndUploadAudio(scene, channelId, stateRow.id, voiceProvider, voiceId, dbHeaders)
      )
    );

    let updatedScenes = [...processingScenes];
    let newlyCompleted = 0;

    for (let i = 0; i < pendingScenes.length; i++) {
      const scene = pendingScenes[i];
      const result = results[i];
      const idx = updatedScenes.findIndex(
        s => s.chapterIndex === scene.chapterIndex && s.sceneIndex === scene.sceneIndex
      );
      if (idx === -1) continue;

      if ("audioUrl" in result) {
        updatedScenes[idx] = {
          ...updatedScenes[idx],
          status: "audio_done",
          audioUrl: result.audioUrl,
          durationSec: result.durationSec || 8,
          errorCount: 0,
          errorMessage: undefined,
        };
        newlyCompleted++;
      } else {
        const currentErrorCount = (updatedScenes[idx].errorCount ?? 0) + 1;
        const isFatal = currentErrorCount >= MAX_ERROR_COUNT;
        
        if (isFatal) {
            // Fallback para browser_tts
            updatedScenes[idx] = {
                ...updatedScenes[idx],
                status: "audio_done",
                audioUrl: "browser_tts",
                durationSec: Math.ceil((scene.narration?.split(/\s+/).length ?? 20) / 2.5),
            };
            newlyCompleted++;
        } else {
            updatedScenes[idx] = {
            ...updatedScenes[idx],
            status: "pending",
            errorCount: currentErrorCount,
            errorMessage: result.error,
            };
        }
        console.warn(`[worker-audio] Cena ch=${scene.chapterIndex} sc=${scene.sceneIndex} falhou (${currentErrorCount}/${MAX_ERROR_COUNT}): ${result.error}`);
      }
    }

    await updateScenes(stateRow.id, updatedScenes, dbHeaders);

    const remainingPending = updatedScenes.filter(s => s.status === "pending").length;

    console.log(`[worker-audio] Batch concluído. processed=${pendingScenes.length} succeeded=${newlyCompleted} remaining=${remainingPending}`);

    return new Response(
      JSON.stringify({
        processed: pendingScenes.length,
        succeeded: newlyCompleted,
        remaining: remainingPending,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[worker-generate-audio]", errorMsg);
    return new Response(
      JSON.stringify({ error: errorMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
