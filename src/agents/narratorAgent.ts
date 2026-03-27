import { callTTS, stripMarkdown } from "./llm";
import type { VideoLanguage, VideoChapter, HubDefaults } from "./types";

export async function generateAllNarrations(
  chapters: VideoChapter[],
  language: VideoLanguage,
  hubDefaults: HubDefaults,
  onProgress?: (done: number, total: number) => void,
): Promise<VideoChapter[]> {
  const result: VideoChapter[] = [];

  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i];
    const text = stripMarkdown(chapter.script);

    const { blob, durationSec } = await callTTS(text, hubDefaults.voice, hubDefaults.voiceId);

    const audioUrl = hubDefaults.voice === "browser"
      ? "browser_tts"
      : URL.createObjectURL(blob);

    result.push({
      ...chapter,
      audioUrl,
      audioDurationSec: durationSec,
    });
    onProgress?.(i + 1, chapters.length);
  }

  return result;
}
