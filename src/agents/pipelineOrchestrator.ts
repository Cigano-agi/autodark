import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { analyzeTrends } from "./trendAgent";
import { generateIdeasBatch } from "./headAgent";
import { generateFullScript } from "./scripterAgent";
import { generateAllNarrations } from "./narratorAgent";
import { extractAndGenerateVisuals } from "./visualAgent";
import { generateSEO } from "./seoAgent";
import type {
  PipelineState, PipelineStage, GeneratedIdea,
  ChannelData, BlueprintData, HubDefaults, VideoLanguage,
} from "./types";

function loadHubDefaults(channelId: string): HubDefaults {
  try {
    const raw = localStorage.getItem("autodark_hub_defaults_v2");
    const all = raw ? JSON.parse(raw) : {};
    return all[channelId] || all["global"] || {
      voice: "browser", voiceId: "browser_pt",
      slidesImage: "pexels", thumbImage: "kie_flux", videoModel: "none",
    };
  } catch {
    return { voice: "browser", voiceId: "browser_pt", slidesImage: "pexels", thumbImage: "kie_flux", videoModel: "none" };
  }
}

const INITIAL_STATE: PipelineState = {
  stage: "idle",
  progress: 0,
  message: "",
};

export function usePipelineOrchestrator(
  channelId: string,
  channel: ChannelData | undefined,
  blueprint: BlueprintData | null,
) {
  const [state, setState] = useState<PipelineState>(INITIAL_STATE);

  const update = useCallback((patch: Partial<PipelineState>) => {
    setState(prev => ({ ...prev, ...patch }));
  }, []);

  const reset = useCallback(() => setState(INITIAL_STATE), []);

  // ── Run Trend Analysis ──
  const runTrends = useCallback(async () => {
    update({ stage: "analyzing_trends", progress: 5, message: "Analisando concorrentes..." });
    try {
      const trends = await analyzeTrends(channelId);
      update({ stage: "idle", progress: 10, message: `Padrão: ${trends.pattern}` });
      return trends;
    } catch (e) {
      update({ stage: "error", message: e instanceof Error ? e.message : "Erro na análise" });
      return null;
    }
  }, [channelId, update]);

  // ── Generate Ideas ──
  const runIdeas = useCallback(async () => {
    if (!channel) return;
    update({ stage: "generating_ideas", progress: 10, message: "Gerando ideias..." });
    try {
      const trends = await analyzeTrends(channelId);

      // Get existing titles to avoid repetition
      const { data: existing } = await (supabase.from as unknown as (table: string) => ReturnType<typeof supabase.from>)("content_ideas")
        .select("title")
        .eq("channel_id", channelId);
      const existingTitles = (existing || []).map((r: Record<string, unknown>) => r.title as string);

      const ideas = await generateIdeasBatch(channel, blueprint, trends, existingTitles);

      // Save to Supabase
      for (const idea of ideas) {
        await (supabase.from as unknown as (table: string) => ReturnType<typeof supabase.from>)("content_ideas")
          .insert({
            channel_id: channelId,
            title: idea.title,
            concept: idea.concept,
            reasoning: idea.reasoning,
            score: idea.score,
            status: "pending",
          });
      }

      update({ stage: "waiting_approval", progress: 20, message: `${ideas.length} ideias geradas!`, ideas });
      return ideas;
    } catch (e) {
      update({ stage: "error", message: e instanceof Error ? e.message : "Erro ao gerar ideias" });
      return null;
    }
  }, [channelId, channel, blueprint, update]);

  // ── Run Semi-Auto Pipeline (after idea approval) ──
  const runSemiAuto = useCallback(async (
    approvedIdea: GeneratedIdea,
    language: VideoLanguage = "en",
    durationMin: number = 15,
  ) => {
    if (!channel) return;
    const hub = loadHubDefaults(channelId);

    try {
      // 1. Generate Script
      update({ stage: "generating_script", progress: 15, message: "Gerando roteiro...", approvedIdea });
      const script = await generateFullScript(
        approvedIdea.title,
        language,
        durationMin,
        channel,
        blueprint,
        (msg) => update({ message: msg }),
      );
      update({ script, progress: 35 });

      // 2. Generate Narration
      update({ stage: "generating_audio", progress: 35, message: "Gerando narração..." });
      const chaptersWithAudio = await generateAllNarrations(
        script.chapters,
        language,
        hub,
        (done, total) => update({ progress: 35 + Math.round((done / total) * 15), message: `Narrando cap. ${done}/${total}...` }),
      );

      // 3. Extract Scenes + Generate Images
      update({ stage: "generating_visuals", progress: 50, message: "Gerando imagens..." });
      const chaptersWithVisuals = await extractAndGenerateVisuals(
        chaptersWithAudio,
        durationMin,
        blueprint,
        (done, total) => update({ progress: 50 + Math.round((done / total) * 30), message: `Imagem ${done}/${total}...` }),
      );

      // 4. Generate SEO
      update({ stage: "generating_seo", progress: 85, message: "Otimizando SEO..." });
      const seo = await generateSEO(script.title, chaptersWithVisuals, channel, language);

      // 5. Save to Supabase
      update({ stage: "saving", progress: 92, message: "Salvando..." });
      const fullScript = chaptersWithVisuals.map(ch => `## ${ch.title}\n\n${ch.script}`).join("\n\n---\n\n");
      const allScenes = chaptersWithVisuals.flatMap(ch => ch.scenes);
      const scenesSection = allScenes.length > 0
        ? `\n\n## Cenas\n${allScenes.map((s, i) => `### ${i + 1}. ${s.title}\n**Visual:** ${s.visual_prompt}${s.imageUrl ? `\n**Image:** ${s.imageUrl}` : ''}`).join('\n\n')}`
        : "";

      await (supabase.from as unknown as (table: string) => ReturnType<typeof supabase.from>)("channel_contents")
        .insert({
          channel_id: channelId,
          title: seo.title,
          hook: `${script.hook}\n\n## SEO\nTags: ${seo.tags.join(", ")}\n\n## Timestamps\n${seo.chapters.map(c => `${c.time} ${c.label}`).join("\n")}${scenesSection}`,
          script: fullScript,
          topic: approvedIdea.title,
          status: "awaiting_review",
        });

      update({
        stage: "done",
        progress: 100,
        message: "Vídeo na fila de revisão!",
        seo,
        script: { ...script, chapters: chaptersWithVisuals },
      });

    } catch (err) {
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
  };
}
