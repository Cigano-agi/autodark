// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI33_API_KEY = Deno.env.get("AI33_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const MAX_BATCH = 1; // Processar 1 por vez para evitar timeouts e gerenciar melhor falhas
const MAX_ERROR_COUNT = 3;
const STALE_TIMEOUT_MINUTES = 10; // Tempo para considerar uma cena como travada

// ── Tipos ──────────────────────────────────────────────────────────────────────
interface SceneSnapshot {
  chapterIndex: number;
  sceneIndex: number;
  status: "pending" | "processing" | "audio_done" | "visual_done" | "complete" | "error";
  audioUrl?: string;
  imageUrl?: string;
  durationSec?: number;
  prompt?: string;
  errorMessage?: string;
  errorCount?: number;
}

// ── Supabase client com service role (bypassa RLS) ────────────────────────────
function makeSupabaseClient() {
  // Usa fetch direto para evitar import do SDK (simplifica bundle da Edge Function)
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
  completedScenes: number,
  headers: Record<string, string>
) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/production_states?id=eq.${stateId}`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify({ scenes, completed_scenes: completedScenes }),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DB update failed: ${res.status} — ${text.slice(0, 200)}`);
  }
}

// ── AI33 polling (copiado literalmente de generate-image/index.ts) ────────────
async function pollAI33ImageTask(
  taskId: string,
  apiKey: string,
  timeoutMs = 240_000,
  intervalMs = 3_000
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`https://api.ai33.pro/v1/task/${taskId}`, {
      headers: { "xi-api-key": apiKey },
    });
    const task = await res.json();
    if (task.status === "done") {
      const url = task.metadata?.result_images?.[0]?.imageUrl
        ?? task.metadata?.result_images?.[0]?.previewUrl;
      if (!url) throw new Error(`AI33: task done but no image URL. meta=${JSON.stringify(task.metadata)}`);
      return url as string;
    }
    if (task.status === "error") throw new Error(task.error_message ?? "AI33 image task failed");
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("AI33 image: timeout after 240s");
}

// ── Geração e upload de uma cena ──────────────────────────────────────────────
async function generateAndUploadScene(
  scene: SceneSnapshot,
  channelId: string,
  stateId: string,
  apiKey: string,
  dbHeaders: Record<string, string>
): Promise<{ imageUrl: string } | { error: string }> {
  const prompt = scene.prompt ?? `Cinematic dark scene, chapter ${scene.chapterIndex} scene ${scene.sceneIndex}`;

  try {
    // 1. Submeter tarefa para AI33
    const form = new FormData();
    form.append("prompt", prompt.slice(0, 4000));
    form.append("model_id", "bytedance-seedream-4.5");
    form.append("generations_count", "1");
    form.append("model_parameters", JSON.stringify({ aspect_ratio: "16:9", resolution: "2K" }));

    const submitRes = await fetch("https://api.ai33.pro/v1i/task/generate-image", {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body: form,
    });

    if (!submitRes.ok) {
      const errText = await submitRes.text();
      throw new Error(`AI33 submit error ${submitRes.status}: ${errText.slice(0, 200)}`);
    }

    const submitData = await submitRes.json();
    const taskId = submitData?.task_id ?? submitData?.id;
    if (!taskId) throw new Error(`AI33: no task_id in response: ${JSON.stringify(submitData)}`);

    console.log(`[worker] AI33 task submitted. channel=${channelId} ch=${scene.chapterIndex} sc=${scene.sceneIndex} task_id=${taskId}`);

    // 2. Aguardar conclusão via polling (copiado de generate-image)
    const imageUrl = await pollAI33ImageTask(taskId, apiKey);

    // 3. Baixar imagem e fazer upload para Storage
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error(`Failed to fetch AI33 image: ${imgRes.status}`);
    const imgBlob = await imgRes.blob();

    // Path no Storage: channelId/stateId/ch{N}-sc{N}.jpg
    const storagePath = `${channelId}/${stateId}/ch${scene.chapterIndex}-sc${scene.sceneIndex}.jpg`;
    const uploadRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/images/${storagePath}`,
      {
        method: "POST",
        headers: {
          "apikey": SUPABASE_SERVICE_ROLE_KEY!,
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY!}`,
          "Content-Type": "image/jpeg",
          "x-upsert": "true",
        },
        body: imgBlob,
      }
    );

    if (!uploadRes.ok) {
      // Se upload falhar, usar URL direta da AI33 como fallback
      console.warn(`[worker] Storage upload failed (${uploadRes.status}) — usando URL direta da AI33`);
      return { imageUrl };
    }

    // URL pública do Storage
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/images/${storagePath}`;
    console.log(`[worker] Cena gerada e salva: ch=${scene.chapterIndex} sc=${scene.sceneIndex} url=${publicUrl}`);
    return { imageUrl: publicUrl };

  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[worker] Erro na cena ch=${scene.chapterIndex} sc=${scene.sceneIndex}: ${errorMsg}`);
    return { error: errorMsg };
  }
}

// ── Handler principal ─────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Validação de dependências
    if (!AI33_API_KEY) throw new Error("AI33_API_KEY not configured in Supabase secrets");
    if (!SUPABASE_URL) throw new Error("SUPABASE_URL not available");
    if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY not available");

    // Validação de input
    const body = await req.json();
    const channelId: string = body?.channel_id;
    if (!channelId || typeof channelId !== "string") {
      return new Response(
        JSON.stringify({ error: "channel_id is required (UUID string)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validação básica de formato UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(channelId)) {
      return new Response(
        JSON.stringify({ error: "channel_id must be a valid UUID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { headers: dbHeaders } = makeSupabaseClient();

    // 1. Buscar estado atual
    const stateRow = await getProductionState(channelId, dbHeaders);
    const allScenes: SceneSnapshot[] = stateRow.scenes ?? [];

    // 2. Selecionar cenas para processar
    // Prioridade 1: audio_done (limpo)
    // Prioridade 2: processing_visuals que estão travados (se o updated_at for muito antigo)
    
    const now = new Date();
    const updatedAt = new Date(stateRow.updated_at || now);
    const diffMinutes = (now.getTime() - updatedAt.getTime()) / (1000 * 60);
    const isStale = diffMinutes > STALE_TIMEOUT_MINUTES;

    const pendingScenes = allScenes
      .filter(s => {
        if (s.status === "audio_done") return true;
        // Se a produção não é atualizada há muito tempo, assumimos que o worker anterior morreu
        if (s.status === "processing_visuals" && isStale) return true;
        return false;
      })
      .slice(0, MAX_BATCH);

    if (pendingScenes.length === 0) {
      const remainingGlobal = allScenes.filter(s => s.status === "audio_done").length;
      const processingGlobal = allScenes.filter(s => s.status === "processing_visuals").length;
      
      console.log(`[worker] Nenhuma cena elegível para channel=${channelId}. (Aguardando: ${remainingGlobal}, Em processo: ${processingGlobal})`);
      return new Response(
        JSON.stringify({ processed: 0, remaining: remainingGlobal, processing: processingGlobal }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[worker] Processando ${pendingScenes.length} cenas audio_done para channel=${channelId}`);

    // 3. Marcar como 'processing_visuals' IMEDIATAMENTE (previne race condition multi-tab)
    const processingScenes = allScenes.map(s =>
      pendingScenes.some(p => p.chapterIndex === s.chapterIndex && p.sceneIndex === s.sceneIndex)
        ? { ...s, status: "processing_visuals" as const }
        : s
    );
    await updateScenes(stateRow.id, processingScenes, stateRow.completed_scenes, dbHeaders);

    // 4. Gerar imagens em paralelo (Promise.all — máx 240s com 5 cenas)
    const results = await Promise.all(
      pendingScenes.map(scene =>
        generateAndUploadScene(scene, channelId, stateRow.id, AI33_API_KEY, dbHeaders)
      )
    );

    // 5. Aplicar resultados nas cenas
    let updatedScenes = [...processingScenes];
    let newlyCompleted = 0;

    for (let i = 0; i < pendingScenes.length; i++) {
      const scene = pendingScenes[i];
      const result = results[i];
      const idx = updatedScenes.findIndex(
        s => s.chapterIndex === scene.chapterIndex && s.sceneIndex === scene.sceneIndex
      );
      if (idx === -1) continue;

      if ("imageUrl" in result) {
        // Sucesso
        updatedScenes[idx] = {
          ...updatedScenes[idx],
          status: "visual_done",
          imageUrl: result.imageUrl,
          errorCount: 0,
          errorMessage: undefined,
        };
        newlyCompleted++;
      } else {
        // Falha — incrementar errorCount
        const currentErrorCount = (updatedScenes[idx].errorCount ?? 0) + 1;
        const isFatal = currentErrorCount >= MAX_ERROR_COUNT;
        updatedScenes[idx] = {
          ...updatedScenes[idx],
          status: isFatal ? "error" : "audio_done",  // volta para audio_done se ainda tem tentativas
          errorCount: currentErrorCount,
          errorMessage: result.error,
        };
        console.warn(`[worker] Cena ch=${scene.chapterIndex} sc=${scene.sceneIndex} falhou (${currentErrorCount}/${MAX_ERROR_COUNT}): ${result.error}`);
      }
    }

    // 6. Atualizar banco com resultados finais
    const totalCompleted = updatedScenes.filter(s =>
      s.status === "visual_done" || s.status === "complete"
    ).length;

    await updateScenes(stateRow.id, updatedScenes, totalCompleted, dbHeaders);

    // 7. Contagem de remaining para o frontend saber se deve invocar novamente
    const remainingPending = updatedScenes.filter(s => s.status === "audio_done").length;


    console.log(`[worker] Batch concluído. processed=${pendingScenes.length} succeeded=${newlyCompleted} remaining=${remainingPending}`);

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
    console.error("[worker-generate-visuals]", errorMsg);
    return new Response(
      JSON.stringify({ error: errorMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
