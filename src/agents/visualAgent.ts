import { callClaude, callImageGeneration, extractJson } from "./llm";
import type { VideoChapter, BlueprintData, SceneData } from "./types";

export async function extractAndGenerateVisuals(
  chapters: VideoChapter[],
  durationMin: number,
  blueprint: BlueprintData | null,
  onProgress?: (done: number, total: number) => void,
): Promise<VideoChapter[]> {
  const style = blueprint?.visual_style || "cinematic, dark aesthetic, dramatic lighting";
  const charHint = blueprint?.character_description ? `Featuring: ${blueprint.character_description}. ` : "";
  const updatedChapters: VideoChapter[] = [];

  // Step 1: Extract scenes from all chapters
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
      "visual_prompt": "Prompt para imagem. Dark aesthetic. ${style}. Cinematic. No text in image."
    }
  ]
}`,
      true
    );

    const parsed = extractJson(raw) as { scenes: SceneData[] };
    updatedChapters.push({
      ...chapter,
      scenes: (parsed.scenes || []).map(s => ({ ...s, chapterId: chapter.id })),
    });
  }

  // Step 2: Generate images for all scenes
  const totalScenes = updatedChapters.reduce((sum, ch) => sum + ch.scenes.length, 0);
  let done = 0;

  for (let ci = 0; ci < updatedChapters.length; ci++) {
    const chapter = updatedChapters[ci];
    for (let si = 0; si < chapter.scenes.length; si++) {
      if (chapter.scenes[si].imageUrl) {
        done++;
        continue;
      }

      const scene = chapter.scenes[si];
      const fullPrompt = `${charHint}${scene.visual_prompt}. Style: ${style}. No text, no letters, no watermarks. 16:9.`;

      try {
        const imageUrl = await callImageGeneration(fullPrompt);
        chapter.scenes[si] = { ...scene, imageUrl };
      } catch (e) {
        console.warn(`[visualAgent] Failed to generate image for scene ${si}:`, e);
      }

      done++;
      onProgress?.(done, totalScenes);
    }
  }

  return updatedChapters;
}
