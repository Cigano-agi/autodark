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
  const { saveData: saveProductionState, saveScene, saveAllScenes, reset: resetProductionState, state: productionState } = useProductionState(channelId);
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
          600000,
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

      // Salvar todas as cenas em um único batch para performance e consistência
      await saveAllScenes(allScenes);

      currentStep = 2.5;
      await saveProductionState(2.5, "running", { chaptersWithScenes, contentId });

      update({ stage: "generating_audio", progress: 50, message: "Iniciando processamento assíncrono (áudio e imagens)..." });
      
      runAudioWorker(channelId).then(async () => {
        await runVisualWorker(channelId);
      }).catch(err => {
        console.error("[orchestrator] Erro nos workers:", err);
      });

      await persistStep(contentId, channelId, "processing");
      currentStep = 3;
      await saveProductionState(3, "running", { chaptersWithScenes, contentId });

      update({
        stage: "done",
        progress: 100,
        message: "Produção enviada para os workers! Vá na aba Vídeos para acompanhar e montar.",
        script: { ...script, chapters: chaptersWithScenes },
      });

      await persistTrace(trace, "ok");

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
