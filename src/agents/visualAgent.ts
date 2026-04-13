import { callClaude, callImageGeneration, extractJson } from "./llm";
import { VISUAL_STYLE_PROMPTS } from "@/hooks/useBlueprint";
import type { VideoChapter, BlueprintData, SceneData } from "./types";

function resolveVisualStyle(raw: string | null | undefined): string {
  if (!raw) return "cinematic, dark aesthetic, dramatic lighting, high contrast, 4K";
  return VISUAL_STYLE_PROMPTS[raw] ?? raw;
}

export async function extractScenes(
  chapters: VideoChapter[],
  durationMin: number,
  blueprint: BlueprintData | null,
): Promise<VideoChapter[]> {
  const style = resolveVisualStyle(blueprint?.visual_style);
  const updatedChapters: VideoChapter[] = [];

  for (const chapter of chapters) {
    if (chapter.scenes.length > 0) {
      updatedChapters.push(chapter);
      continue;
    }

    const chapterDurationMin = durationMin / chapters.length;
    const sceneCount = Math.ceil((chapterDurationMin * 60) / 8);

    const raw = await callClaude(
      "Você é um diretor de vídeo. Retorne APENAS JSON válido.",
      `Roteiro do capítulo "${chapter.title}":
${chapter.script}

Divida em exatamente ${sceneCount} cenas visuais.
Para cada cena, retorne JSON:
{
  "scenes": [
    {
      "title": "Título curto da cena",
      "narration": "Trecho do roteiro (5-15 seg de fala)",
      "visual_prompt": "Prompt para imagem. Dark aesthetic. ${style}. Cinematic. No text in image.",
      "emotion": "Uma destas: urgency, shock, motivation, curiosity, inspiration, neutral"
    }
  ]
}`,
      true
    );

    const parsed = extractJson(raw) as { scenes: SceneData[] };

    if (!parsed.scenes || !Array.isArray(parsed.scenes) || parsed.scenes.length === 0) {
      throw new Error(
        `[extractScenes] LLM retornou JSON sem campo 'scenes' para capítulo "${chapter.title}". ` +
        `Campos recebidos: ${Object.keys(parsed).join(", ")}`
      );
    }

    updatedChapters.push({
      ...chapter,
      scenes: parsed.scenes.map(s => ({ ...s, chapterId: chapter.id })),
    });
  }
  return updatedChapters;
}

export async function generateVisuals(
  chapters: VideoChapter[],
  blueprint: BlueprintData | null,
  onProgress?: (done: number, total: number) => void,
): Promise<VideoChapter[]> {
  const style = resolveVisualStyle(blueprint?.visual_style);
  const charHint = blueprint?.character_description ? `Featuring: ${blueprint.character_description}. ` : "";
  const result: VideoChapter[] = JSON.parse(JSON.stringify(chapters));

  // Achatar todas as cenas num array pra processar em lotes
  const allScenesData: { chapterIndex: number; sceneIndex: number; scene: SceneData }[] = [];
  result.forEach((chapter, chapterIndex) => {
    chapter.scenes.forEach((scene, sceneIndex) => {
      // Ignora as que já tiverem imagem mapeada
      if (!scene.imageUrl) {
        allScenesData.push({ chapterIndex, sceneIndex, scene });
      }
    });
  });

  const totalScenesToProcess = allScenesData.length;
  let done = 0;

  // Processamento em lotes concorrentes
  const CONCURRENCY = 4; // Ajuste pra evitar overflow no proxy/API
  for (let i = 0; i < allScenesData.length; i += CONCURRENCY) {
    const chunk = allScenesData.slice(i, i + CONCURRENCY);

    await Promise.all(
      chunk.map(async ({ chapterIndex, sceneIndex, scene }) => {
        const fullPrompt = `${charHint}${scene.visual_prompt}. Style: ${style}. No text, no letters, no watermarks. 16:9.`;

        try {
          const imageUrl = await callImageGeneration(fullPrompt);
          result[chapterIndex].scenes[sceneIndex] = { ...scene, imageUrl };
        } catch (err) {
          console.warn(`[visualAgent] Falha ao gerar imagem para cena "${scene.title}":`, err instanceof Error ? err.message : err);
          // Manter scene sem imageUrl — o assembler usa placeholder
          // Não re-throw: o batch continua processando as outras cenas
          result[chapterIndex].scenes[sceneIndex] = { ...scene, imageUrl: undefined };
        }

        done++;
        if (onProgress) {
          // Mantém o progresso proporcional como no orchestrator
          onProgress(done, totalScenesToProcess);
        }
      })
    );
  }

  return result;
}

export async function extractAndGenerateVisuals(
  chapters: VideoChapter[],
  durationMin: number,
  blueprint: BlueprintData | null,
  onProgress?: (done: number, total: number) => void,
): Promise<VideoChapter[]> {
  const chaptersWithScenes = await extractScenes(chapters, durationMin, blueprint);
  return generateVisuals(chaptersWithScenes, blueprint, onProgress);
}
