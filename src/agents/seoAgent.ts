import { callClaude, extractJson } from "./llm";
import type { VideoLanguage, VideoChapter, ChannelData, SEOPackage } from "./types";

export async function generateSEO(
  title: string,
  chapters: VideoChapter[],
  channel: ChannelData,
  language: VideoLanguage,
): Promise<SEOPackage> {
  let currentSec = 0;
  const chapterTimestamps = chapters.map(ch => {
    const mins = Math.floor(currentSec / 60);
    const secs = currentSec % 60;
    const time = `${mins}:${String(secs).padStart(2, "0")}`;
    // Somar audioDurationSec de cada cena — VideoChapter não tem audioDurationSec direto
    const chapterDuration = (ch.scenes ?? []).reduce(
      (sum, s) => sum + (s.audioDurationSec ?? 0),
      0
    ) || 120; // fallback de 120s apenas se todas as cenas tiverem audioDurationSec = 0
    currentSec += chapterDuration;
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
  const seo = extractJson(raw) as SEOPackage;

  // Validar e aplicar fallbacks para campos críticos
  if (!seo.title || typeof seo.title !== "string") {
    seo.title = title; // fallback para o título do script passado como parâmetro
  }
  if (!seo.description || typeof seo.description !== "string") {
    seo.description = "";
  }
  if (!seo.tags || !Array.isArray(seo.tags)) {
    console.warn("[seoAgent] Campo 'tags' ausente ou inválido na resposta LLM — usando array vazio");
    seo.tags = [];
  }
  if (!seo.chapters || !Array.isArray(seo.chapters)) {
    console.warn("[seoAgent] Campo 'chapters' ausente na resposta LLM — reconstruindo a partir dos capítulos");
    seo.chapters = chapters.map((ch, i) => ({ time: `${i * 2}:00`, label: ch.title }));
  }

  return seo;
}
