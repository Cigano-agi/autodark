import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { analyzeTrends } from "./trendAgent";
import { generateIdeasBatch } from "./headAgent";
import { generateFullScript } from "./scripterAgent";
import { generateAllNarrations } from "./narratorAgent";
import { extractScenes, generateVisuals } from "./visualAgent";
import { generateSEO } from "./seoAgent";
import { uploadAudio, uploadImage } from "@/lib/storage";
import { createTraceContext } from "@/lib/traceContext";
import { logStep, logSkip, persistTrace, traceToMarkdown } from "@/lib/debugLogger";
import { useProductionState } from "@/hooks/useProductionState";
import type {
  PipelineState, PipelineStage, GeneratedIdea,
  ChannelData, BlueprintData, HubDefaults, VideoLanguage, VideoChapter, SceneData
} from "./types";

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
) {
  const [state, setState] = useState<PipelineState>(INITIAL_STATE);
  const { saveData: saveProductionState, reset: resetProductionState } = useProductionState(channelId);

  const update = useCallback((patch: Partial<PipelineState>) => {
    setState(prev => ({ ...prev, ...patch }));
  }, []);

  const reset = useCallback(() => setState(INITIAL_STATE), []);

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
        return generateFullScript(
          approvedIdea.title,
          language,
          durationMin,
          channel,
          blueprint,
          (msg) => update({ message: msg }),
        );
      }, { provider: "openrouter" });

      const fullScript = script.chapters.map(ch => `## ${ch.title}\n\n${ch.script}`).join("\n\n---\n\n");
      await persistStep(contentId, channelId, "script_generated", {
        title: script.title,
        hook: script.hook,
        script: fullScript,
      });
      await saveProductionState(2, "running", { script, contentId });
      update({ script, progress: 35 });

      update({ stage: "extracting_scenes", progress: 40, message: "Mapeando segmentos..." });
      const chaptersWithScenes = await logStep(trace, "scene_extraction", async () => {
        return extractScenes(
          script.chapters,
          durationMin,
          blueprint,
        );
      }, { provider: "claude-3.5-sonnet" });
      update({ script: { ...script, chapters: chaptersWithScenes }, progress: 45 });
      await saveProductionState(2.5, "running", { chaptersWithScenes, contentId });

      update({ stage: "generating_audio", progress: 45, message: "Sintetizando narração..." });
      const chaptersWithAudio = await logStep(trace, "tts_narration", async () => {
        return generateAllNarrations(
          chaptersWithScenes,
          language,
          hub,
          (done, total) => update({ progress: 45 + Math.round((done / total) * 15), message: `Narrando cena ${done}/${total}...` }),
        );
      }, { provider: hub.voice });

      await logStep(trace, "audio_upload", async () => {
        if (!contentId) return;
        for (let ci = 0; ci < chaptersWithAudio.length; ci++) {
          const ch = chaptersWithAudio[ci];
          for (let si = 0; si < ch.scenes.length; si++) {
            const scene = ch.scenes[si];
            if (scene.audioUrl && scene.audioUrl !== "browser_tts" && scene.audioUrl.startsWith("blob:")) {
              try {
                const res = await fetch(scene.audioUrl);
                const blob = await res.blob();
                const storageUrl = await uploadAudio(channelId, contentId, ci * 100 + si, blob);
                if (storageUrl) ch.scenes[si] = { ...scene, audioUrl: storageUrl };
              } catch {
                // Upload de áudio falhou para esta cena; mantém URL local
              }
            }
          }
        }
      }, { provider: "supabase-storage" });

      await persistStep(contentId, channelId, "tts_done", {
        audio_url: chaptersWithAudio[0]?.scenes[0]?.audioUrl || null,
        voice_name: hub.voiceId,
      });
      await saveProductionState(3, "running", { chaptersWithAudio, contentId });

      update({ stage: "generating_visuals", progress: 60, message: "Gerando imagens..." });
      const chaptersWithVisuals = await logStep(trace, "visual_generation", async () => {
        return generateVisuals(
          chaptersWithAudio,
          blueprint,
          (done, total) => update({ progress: 60 + Math.round((done / total) * 20), message: `Artefato ${done}/${total}...` }),
        );
      }, { provider: "kie.ai" });

      await logStep(trace, "image_upload", async () => {
        if (!contentId) return;
        for (let ci = 0; ci < chaptersWithVisuals.length; ci++) {
          for (let si = 0; si < chaptersWithVisuals[ci].scenes.length; si++) {
            const scene = chaptersWithVisuals[ci].scenes[si];
            if (scene.imageUrl) {
              const storageUrl = await uploadImage(channelId, contentId, ci * 100 + si, scene.imageUrl);
              if (storageUrl) chaptersWithVisuals[ci].scenes[si] = { ...scene, imageUrl: storageUrl };
            }
          }
        }
      }, { provider: "supabase-storage" });

      const scenesJson = chaptersWithVisuals.flatMap(ch => ch.scenes);
      await persistStep(contentId, channelId, "visuals_done", {
        scenes: scenesJson,
      });
      await saveProductionState(4, "running", { chaptersWithVisuals, contentId });

      update({ stage: "assembling", progress: 80, message: "Preparando exportação..." });
      await saveProductionState(4.5, "running", { chaptersWithVisuals, contentId });

      update({ stage: "generating_seo", progress: 85, message: "Gerando SEO..." });
      const seo = await logStep(trace, "seo_generation", async () => {
        return generateSEO(script.title, chaptersWithVisuals, channel, language);
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
      await saveProductionState(6, "done", { seo, contentId });

    } catch (err) {
      if (contentId) {
        await persistStep(contentId, channelId, "failed", {
          error_log: err instanceof Error ? err.message : String(err),
        });
      }

      await persistTrace(trace, "fail");
      await saveProductionState(state.progress > 0 ? Math.ceil(state.progress / 20) : 1, "error", {
        error: err instanceof Error ? err.message : String(err), contentId
      });

      update({
        stage: "error",
        message: err instanceof Error ? err.message : "Erro no pipeline",
        error: String(err),
      });
    }
  }, [channelId, channel, blueprint, update]);

  return {
    state,
    reset,
    runTrends,
    runIdeas,
    runSemiAuto,
    resetProductionState,
  };
}
