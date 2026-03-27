import { callClaude, extractJson } from "./llm";
import type { VideoLanguage, VideoChapter, ChannelData, SEOPackage } from "./types";

export async function generateSEO(
  title: string,
  chapters: VideoChapter[],
  channel: ChannelData,
  language: VideoLanguage,
): Promise<SEOPackage> {
  // Calculate timestamps from chapter durations
  let currentSec = 0;
  const chapterTimestamps = chapters.map(ch => {
    const mins = Math.floor(currentSec / 60);
    const secs = currentSec % 60;
    const time = `${mins}:${String(secs).padStart(2, "0")}`;
    currentSec += ch.audioDurationSec || 120;
    return { time, label: ch.title };
  });

  const langLabel = language === "en" ? "English" : language === "es" ? "Español" : "Português Brasileiro";

  const prompt = `Canal: "${channel.name}" (${channel.niche || "geral"})
Idioma: ${langLabel}
Vídeo: "${title}"
Capítulos:
${chapterTimestamps.map(t => `${t.time} - ${t.label}`).join("\n")}

Gere o pacote SEO completo para YouTube.

Retorne JSON:
{
  "title": "Título otimizado (max 70 chars, inclui keyword principal)",
  "description": "Descrição completa com timestamps, sobre o canal, call to action",
  "tags": ["tag1", "tag2", "tag3"],
  "chapters": [{"time": "0:00", "label": "Introdução"}, ...]
}`;

  const raw = await callClaude(
    `Você é um especialista em SEO para YouTube.\nIMPORTANT: Write ALL output exclusively in ${langLabel}. Never use Portuguese or any other language unless it IS the target language.`,
    prompt,
    true
  );
  return extractJson(raw) as unknown as SEOPackage;
}
