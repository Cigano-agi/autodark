import { callTTS, stripMarkdown } from "./llm";
import type { VideoLanguage, VideoChapter, HubDefaults, SceneData } from "./types";

export async function generateAllNarrations(
  chapters: VideoChapter[],
  language: VideoLanguage,
  hubDefaults: HubDefaults,
  onProgress?: (done: number, total: number) => void,
): Promise<VideoChapter[]> {
  const allScenesData: { chapterIndex: number; sceneIndex: number; scene: SceneData }[] = [];
  
  chapters.forEach((chapter, chapterIndex) => {
    chapter.scenes.forEach((scene, sceneIndex) => {
      allScenesData.push({ chapterIndex, sceneIndex, scene });
    });
  });

  const totalScenes = allScenesData.length;
  let done = 0;
  
  // Create a deep copy of chapters to mutate safely
  const result: VideoChapter[] = JSON.parse(JSON.stringify(chapters));

  // Chunk size for parallel processing
  const CONCURRENCY = 5;
  for (let i = 0; i < allScenesData.length; i += CONCURRENCY) {
    const chunk = allScenesData.slice(i, i + CONCURRENCY);
    
    await Promise.all(chunk.map(async ({ chapterIndex, sceneIndex, scene }) => {
      const text = stripMarkdown(scene.narration);
      try {
        const { audioUrl, durationSec } = await callTTS(text, hubDefaults.voice, hubDefaults.voiceId);
        const resolvedUrl = hubDefaults.voice === "browser" ? "browser_tts" : audioUrl;
        
        result[chapterIndex].scenes[sceneIndex] = {
          ...scene,
          audioUrl: resolvedUrl,
          audioDurationSec: durationSec,
          durationSec: durationSec + 0.3,
        };
      } catch (err) {
        console.error(`Error generating TTS for scene: ${text}`, err);
        // Fallback or keep it empty
        result[chapterIndex].scenes[sceneIndex] = {
          ...scene,
          audioUrl: "browser_tts",
          audioDurationSec: 5,
          durationSec: 5.3,
        };
      }
      
      done++;
      if (onProgress) {
        onProgress(done, totalScenes);
      }
    }));
  }

  return result;
}
