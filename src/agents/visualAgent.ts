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
