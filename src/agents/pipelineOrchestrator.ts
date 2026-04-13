import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { analyzeTrends } from "./trendAgent";
import { generateIdeasBatch } from "./headAgent";
import { generateFullScript } from "./scripterAgent";
import { generateAllNarrations } from "./narratorAgent";
import { extractScenes } from "./visualAgent";
import { runVisualWorker, hasUnfinishedVisuals } from "@/lib/visualWorker";
import { runAudioWorker, hasUnfinishedAudio } from "@/lib/audioWorker";
import { generateSEO } from "./seoAgent";
import { uploadImage } from "@/lib/storage";
import { createTraceContext } from "@/lib/traceContext";
import { logStep, logSkip, persistTrace, traceToMarkdown } from "@/lib/debugLogger";
import { useProductionState } from "@/hooks/useProductionState";
import { toast } from "sonner";
import type {
  PipelineState, PipelineStage, GeneratedIdea,
  ChannelData, BlueprintData, HubDefaults, VideoLanguage, VideoChapter, SceneData
} from "./types";

/** Helper para timeout de promessas */
const withTimeout = <T>(promise: Promise<T>, ms: number, taskName: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout: ${taskName} demorou mais de ${ms/1000}s`)), ms)
    ),
  ]);
};

function loadHubDefaults(channelId: string): HubDefaults {
  try {
    const raw = localStorage.getItem("autodark_hub_defaults_v2");
    const all = raw ? JSON.parse(raw) : {};
    return all[channelId] || all["global"] || {
      voice: "ai33", voiceId: "onyx",
      slidesImage: "kie_flux", thumbImage: "kie_flux", videoModel: "none",
    };
  } catch {
    return { voice: "ai33", voiceId: "onyx", slidesImage: "kie_flux", thumbImage: "kie_flux", videoModel: "none" };
  }
}

const INITIAL_STATE: PipelineState = {
  stage: "idle",
  progress: 0,
  message: "",
};

/** Sincroniza o status do conteúdo com o banco de dados. Cria um novo registro se `contentId` for nulo. */
async function persistStep(
  contentId: string | null,
  channelId: string,
  status: string,
  data: Record<string, unknown> = {},
): Promise<string | null> {
  if (!contentId) {
    const { data: row, error } = await (supabase.from as any)("channel_contents")
      .insert({ channel_id: channelId, status, ...data })
      .select("id")
      .single();
    if (error) return null;
    return row.id;
  }
  await (supabase.from as any)("channel_contents")
    .update({ status, updated_at: new Date().toISOString(), ...data })
    .eq("id", contentId);
  return contentId;
}

export function usePipelineOrchestrator(
  channelId: string,
  channel: ChannelData | undefined,
  blueprint: BlueprintData | null,
  foundation: any | null,
) {
  const [state, setState] = useState<PipelineState>(INITIAL_STATE);
  const { saveData: saveProductionState, saveScene, reset: resetProductionState, state: productionState } = useProductionState(channelId);
  // Ref para leitura em closures assíncronos — sempre aponta para o productionState mais recente
  const productionStateRef = useRef(productionState);
  productionStateRef.current = productionState;

  const update = useCallback((patch: Partial<PipelineState>) => {
    setState(prev => ({ ...prev, ...patch }));
  }, []);

  const reset = useCallback(() => setState(INITIAL_STATE), []);

  // Auto-resume: ao montar o componente, verificar se há cenas processing/pending
  // Isso acontece quando o usuário fecha e reabre a aba durante a geração visual
  useEffect(() => {
    if (!productionState) return;
    if (productionState.status !== "running") return;
    if (productionState.step !== 2.5) return;

    // Aguardar 2s para dar tempo ao Realtime de hidratar as cenas antes de verificar
    // Evita falso negativo quando a aba é reaberta durante a geração visual ou de áudio (BUG-005)
    const timer = setTimeout(() => {
      const scenes = productionStateRef.current?.scenes ?? [];
      
      const missingAudio = hasUnfinishedAudio(scenes);
      if (missingAudio) {
        console.log("[orchestrator] Auto-resume detectado — retomando worker de geração de áudio");
        runAudioWorker(channelId, (remaining) => {
          update({ message: `Auto-resume áudio: cenas restantes: ${remaining}` });
        }).catch(err => console.error("[orchestrator] Erro no auto-resume do worker (audio):", err));
        return;
      }

      if (!hasUnfinishedVisuals(scenes)) {
        console.log("[orchestrator] Auto-resume: nenhuma cena pendente após 2s — nada a retomar");
        return;
      }
      console.log("[orchestrator] Auto-resume detectado — retomando worker de geração visual");
      runVisualWorker(channelId, (remaining) => {
        update({ message: `Auto-resume: imagens restantes: ${remaining}` });
      }).catch(err => {
        console.error("[orchestrator] Erro no auto-resume do worker:", err);
      });
    }, 2000); // 2s de delay para hidratação do Realtime

    return () => clearTimeout(timer);
  // Dependências intencionalmente limitadas: apenas status e step para não re-disparar em cada atualização de cena
  }, [channelId, productionState?.status, productionState?.step]);


  const updateChapter = useCallback((chapterId: string, patch: Partial<VideoChapter>) => {
    setState(prev => {
      if (!prev.script) return prev;
      return {
        ...prev,
        script: {
          ...prev.script,
          chapters: prev.script.chapters.map(c => c.id === chapterId ? { ...c, ...patch } : c)
        }
      };
    });
  }, []);

  const updateScene = useCallback((chapterId: string, sceneIndex: number, patch: Partial<SceneData>) => {
    setState(prev => {
      if (!prev.script) return prev;
      return {
        ...prev,
        script: {
          ...prev.script,
          chapters: prev.script.chapters.map(c => {
            if (c.id !== chapterId) return c;
            const newScenes = [...c.scenes];
            newScenes[sceneIndex] = { ...newScenes[sceneIndex], ...patch };
            return { ...c, scenes: newScenes };
          })
        }
      };
    });
  }, []);

  const runTrends = useCallback(async () => {
    update({ stage: "analyzing_trends", progress: 5, message: "Rastreando concorrentes..." });
    try {
      const trends = await analyzeTrends(channelId);
      update({ stage: "idle", progress: 10, message: `Padrão identificado: ${trends.pattern}` });
      return trends;
    } catch (e) {
      update({ stage: "error", message: e instanceof Error ? e.message : "Erro na triangulação" });
      return null;
    }
  }, [channelId, update]);

  const runIdeas = useCallback(async () => {
    if (!channel) return;
    update({ stage: "generating_ideas", progress: 10, message: "Minerando conceitos..." });
    try {
      const trends = await analyzeTrends(channelId);

      const { data: existing } = await (supabase.from as any)("content_ideas")
        .select("title")
        .eq("channel_id", channelId);
      const existingTitles = (existing || []).map((r: Record<string, unknown>) => r.title as string);

      const ideas = await generateIdeasBatch(channel, blueprint, trends, existingTitles);

      for (const idea of ideas) {
        await (supabase.from as any)("content_ideas")
          .insert({
            channel_id: channelId,
            title: idea.title,
            concept: idea.concept,
            reasoning: idea.reasoning,
            score: idea.score,
            status: "pending",
          });
      }

      update({ stage: "waiting_approval", progress: 20, message: `${ideas.length} Alvos identificados!`, ideas });
      return ideas;
    } catch (e) {
      update({ stage: "error", message: e instanceof Error ? e.message : "Falha na extração de ideias" });
      return null;
    }
  }, [channelId, channel, blueprint, update]);

  const runSemiAuto = useCallback(async (
    approvedIdea: GeneratedIdea,
    language: VideoLanguage = "en",
    durationMin: number = 15,
  ) => {
    if (!channel) return;
    const hub = loadHubDefaults(channelId);
    let contentId: string | null = null;
    let currentStep = 1; // Rastreia step atual sem depender de state.progress (evita closure stale — BUG-004)
    const trace = createTraceContext(channelId, channel.name);

    try {
      contentId = await persistStep(null, channelId, "queued", {
        title: approvedIdea.title,
        topic: approvedIdea.title,
      });
      trace.contentId = contentId;
      await saveProductionState(1, "running", { approvedIdea, contentId, language, durationMin });

      update({ stage: "generating_script", progress: 15, message: "Decodificando roteiro...", approvedIdea });
      const script = await logStep(trace, "script_generation", async () => {
        return withTimeout(
          generateFullScript(
            approvedIdea.title,
            language,
            durationMin,
            channel,
            blueprint,
            foundation,
            (msg) => update({ message: msg }),
          ),
          60000,
          "Geração de Roteiro"
        );
      }, { provider: "openrouter" });

      const fullScript = script.chapters.map(ch => `## ${ch.title}\n\n${ch.script}`).join("\n\n---\n\n");
      await persistStep(contentId, channelId, "script_generated", {
        title: script.title,
        hook: script.hook,
        script: fullScript,
      });
      currentStep = 2;
      await saveProductionState(2, "running", { script, contentId });
      update({ script, progress: 35 });

      update({ stage: "extracting_scenes", progress: 40, message: "Mapeando segmentos..." });
      const chaptersWithScenes = await logStep(trace, "scene_extraction", async () => {
        return withTimeout(
          extractScenes(
            script.chapters,
            durationMin,
            blueprint,
          ),
          300000,
          "Extração de Cenas"
        );
      }, { provider: "claude-3.5-sonnet" });
      update({ script: { ...script, chapters: chaptersWithScenes }, progress: 45 });

      // Persistir cada cena como 'pending' antes de invocar o worker
      // Isso permite que o worker processe mesmo se a aba for fechada e reaberta
      const allScenes = chaptersWithScenes.flatMap((ch: any, ci: number) =>
        ch.scenes.map((scene: any, si: number) => ({
          chapterIndex: ci,
          sceneIndex: si,
          status: "pending" as const,
          prompt: scene.visual_prompt,
          // durationSec ainda não foi calculado pelo narratorAgent neste ponto.
          // Usar 8s como valor padrão seguro (duração média de cena). Será atualizado
          // após a etapa de narração se o worker ler do estado persistido.
          durationSec: typeof scene.durationSec === "number" ? scene.durationSec : 8,
          audioUrl: scene.audioUrl,
        }))
      );

      // Salvar cada cena individualmente (saveScene faz upsert por chapterIndex+sceneIndex)
      for (const sceneSnap of allScenes) {
        await saveScene(sceneSnap, allScenes.length);
      }

      currentStep = 2.5;
      await saveProductionState(2.5, "running", { chaptersWithScenes, contentId });

      update({ stage: "generating_audio", progress: 45, message: "Worker de áudio online..." });
      
      await logStep(trace, "tts_narration", async () => {
        const totalGeneratedAudio = await runAudioWorker(
          channelId,
          (remaining) => {
            const total = allScenes.length;
            const done = total - remaining;
            update({
              progress: 45 + Math.round((done / Math.max(total, 1)) * 15),
              message: `Narrando cena ${done}/${total}...`,
            });
          }
        );
        console.log(`[orchestrator] Audio Worker concluiu. Total audios gerados: ${totalGeneratedAudio}`);
      }, { provider: "worker-generate-audio" });

      // Aguardar Realtime propagações de áudio (polling com timeout de 10s)
      const AUDIO_POLL_INTERVAL = 300;
      let audioWaited = 0;
      while (audioWaited < 10_000) {
        const scenes = productionStateRef.current?.scenes ?? [];
        const stillPending = scenes.filter((s: any) => s.status === "pending" || s.status === "processing_audio").length;
        if (stillPending === 0) break;
        await new Promise(r => setTimeout(r, AUDIO_POLL_INTERVAL));
        audioWaited += AUDIO_POLL_INTERVAL;
      }

      // Reconstruir chaptersWithAudio a partir das cenas persistidas
      const persistedScenesAudio = productionStateRef.current?.scenes ?? [];
      const chaptersWithAudio = chaptersWithScenes.map((ch: any, ci: number) => ({
        ...ch,
        scenes: ch.scenes.map((scene: any, si: number) => {
          const persisted = persistedScenesAudio.find(
            (s: any) => s.chapterIndex === ci && s.sceneIndex === si
          );
          return {
            ...scene,
            audioUrl: persisted?.audioUrl ?? scene.audioUrl,
            durationSec: persisted?.durationSec ?? scene.durationSec,
            audioDurationSec: persisted?.durationSec ?? scene.audioDurationSec,
          };
        }),
      }));

      // Serializar todas as URLs de áudio como JSON em vez de apenas a primeira cena (BUG-003)
      const audioUrlsMap: Record<string, string> = {};
      chaptersWithAudio.forEach((ch: any, ci: number) => {
        ch.scenes?.forEach((scene: any, si: number) => {
          if (scene.audioUrl && scene.audioUrl !== "browser_tts") {
            audioUrlsMap[`${ci}_${si}`] = scene.audioUrl;
          }
        });
      });

      await persistStep(contentId, channelId, "tts_done", {
        audio_urls_json: JSON.stringify(audioUrlsMap), // todas as URLs serializadas
        audio_url: chaptersWithAudio[0]?.scenes[0]?.audioUrl || null, // mantido por compatibilidade
        voice_name: hub.voiceId,
      });
      currentStep = 3;
      await saveProductionState(3, "running", { chaptersWithAudio, contentId });

      update({ stage: "generating_visuals", progress: 60, message: "Worker processando imagens em background..." });

      // Invocar o worker em loop — cada batch processa 5 cenas
      // O Realtime (useProductionState) atualiza a UI automaticamente
      await logStep(trace, "visual_generation", async () => {
        const totalGenerated = await runVisualWorker(
          channelId,
          (remaining) => {
            const total = allScenes.length;
            const done = total - remaining;
            update({
              progress: 60 + Math.round((done / Math.max(total, 1)) * 20),
              message: `Imagens geradas: ${done}/${total}...`,
            });
          }
        );
        console.log(`[orchestrator] Worker concluiu. Total imagens geradas: ${totalGenerated}`);
      }, { provider: "worker-generate-visuals" });

      // Aguardar Realtime propagar updates (polling com timeout de 10s)
      const REALTIME_POLL_INTERVAL = 300;
      const REALTIME_MAX_WAIT = 10_000;
      let waited = 0;
      while (waited < REALTIME_MAX_WAIT) {
        // Ler via ref para evitar closure stale — productionStateRef.current é sempre o valor mais recente (BUG-001)
        const scenes = productionStateRef.current?.scenes ?? [];
        const stillPending = scenes.filter(
          (s: any) => s.status === "audio_done" || s.status === "processing_visuals"
        ).length;
        if (stillPending === 0) break;
        await new Promise(r => setTimeout(r, REALTIME_POLL_INTERVAL));
        waited += REALTIME_POLL_INTERVAL;
      }

      // Guard: verificar que pelo menos 80% das cenas têm imagem antes de montar
      const persistedScenes = productionStateRef.current?.scenes ?? []; // via ref para evitar stale (BUG-001)
      const scenesWithImage = persistedScenes.filter((s: any) => s.imageUrl && s.imageUrl !== "");
      const completionRatio = persistedScenes.length > 0
        ? scenesWithImage.length / persistedScenes.length
        : 1;

      if (completionRatio < 0.8) {
        console.warn(
          `[orchestrator] Apenas ${scenesWithImage.length}/${persistedScenes.length} cenas com imagem ` +
          `(${Math.round(completionRatio * 100)}%) — abaixo do threshold de 80%.`
        );
        toast.warning(
          `${scenesWithImage.length}/${persistedScenes.length} imagens geradas. ` +
          "Montando com placeholders para as cenas faltando."
        );
      }

      // Reconstruir chaptersWithVisuals a partir das cenas persistidas no banco
      const chaptersWithVisuals = chaptersWithAudio.map((ch: any, ci: number) => ({
        ...ch,
        scenes: ch.scenes.map((scene: any, si: number) => {
          const persisted = persistedScenes.find(
            (s: any) => s.chapterIndex === ci && s.sceneIndex === si
          );
          return {
            ...scene,
            imageUrl: persisted?.imageUrl ?? scene.imageUrl,
          };
        }),
      }));

      const scenesJson = chaptersWithVisuals.flatMap(ch => ch.scenes);
      await persistStep(contentId, channelId, "visuals_done", {
        scenes: scenesJson,
      });
      currentStep = 4;
      await saveProductionState(4, "running", { chaptersWithVisuals, contentId });

      update({ stage: "assembling", progress: 80, message: "Preparando exportação..." });
      currentStep = 4.5;
      await saveProductionState(4.5, "running", { chaptersWithVisuals, contentId });

      update({ stage: "generating_seo", progress: 85, message: "Gerando SEO..." });
      const seo = await logStep(trace, "seo_generation", async () => {
        return withTimeout(
          generateSEO(script.title, chaptersWithVisuals, channel, language),
          30000,
          "Geração de SEO"
        );
      }, { provider: "openrouter" });

      update({ stage: "saving", progress: 92, message: "Arquivando..." });
      const seoBlock = `Tags: ${seo.tags.join(", ")}\n\nTimestamps:\n${seo.chapters.map(c => `${c.time} ${c.label}`).join("\n")}`;

      await persistStep(contentId, channelId, "awaiting_review", {
        title: seo.title,
        hook: `${script.hook}\n\n## SEO\n${seoBlock}`,
      });

      update({
        stage: "done",
        progress: 100,
        message: "Concluído. Pronto para revisão.",
        seo,
        script: { ...script, chapters: chaptersWithVisuals },
      });

      const finalStatus = trace.steps.some(s => s.status === "warn") ? "warn" : "ok";
      await persistTrace(trace, finalStatus);
      currentStep = 6;
      await saveProductionState(6, "done", { seo, contentId });

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      toast.error(`Falha no pipeline: ${errorMsg}`);

      if (contentId) {
        await persistStep(contentId, channelId, "failed", {
          error_log: errorMsg,
        });
      }

      await persistTrace(trace, "fail");
      // Usar currentStep em vez de state.progress (closure stale) para persistir o step correto (BUG-004)
      await saveProductionState(currentStep, "error", {
        error: errorMsg, contentId
      });

      update({
        stage: "error",
        message: errorMsg,
        error: errorMsg,
      });
    }
  }, [channelId, channel, blueprint, update, saveScene, productionState]);

  return {
    state,
    reset,
    runTrends,
    runIdeas,
    runSemiAuto,
    resetProductionState,
  };
}
