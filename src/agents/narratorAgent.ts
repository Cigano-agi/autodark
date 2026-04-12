import { callTTS, stripMarkdown } from "./llm";
import type { VideoLanguage, VideoChapter, HubDefaults, SceneData } from "./types";

export async function generateAllNarrations(
  chapters: VideoChapter[],
  language: VideoLanguage,
  hubDefaults: HubDefaults,
  onProgress?: (done: number, total: number) => void,
): Promise<VideoChapter[]> {
  const result: VideoChapter[] = [];
  const totalScenes = chapters.reduce((sum, ch) => sum + ch.scenes.length, 0);
  let done = 0;

  for (const chapter of chapters) {
    const updatedScenes: SceneData[] = [];
    for (const scene of chapter.scenes) {
      const text = stripMarkdown(scene.narration);
      const { blob, durationSec } = await callTTS(text, hubDefaults.voice, hubDefaults.voiceId);

      const audioUrl = hubDefaults.voice === "browser"
        ? "browser_tts"
        : URL.createObjectURL(blob);

      updatedScenes.push({
        ...scene,
        audioUrl,
        audioDurationSec: durationSec,
        durationSec: durationSec + 0.3,
      });
      done++;
      onProgress?.(done, totalScenes);
    }

    result.push({
      ...chapter,
      scenes: updatedScenes,
    });
  }

  return result;
}
