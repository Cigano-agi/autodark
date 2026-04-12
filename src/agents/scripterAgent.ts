import { callClaude, extractJson } from "./llm";
import type { VideoLanguage, VideoChapter, ScriptResult, ChannelData, BlueprintData } from "./types";

function durationToChapters(durationMin: number): number {
  if (durationMin <= 8)  return 3;
  if (durationMin <= 12) return 4;
  if (durationMin <= 18) return 5;
  if (durationMin <= 25) return 6;
  return Math.ceil(durationMin / 4);
}

function generateId(): string {
  return crypto.randomUUID?.() || Math.random().toString(36).slice(2, 10);
}

async function generateSummary(
  idea: string,
  language: VideoLanguage,
  durationMin: number,
  channel: ChannelData,
  blueprint: BlueprintData | null,
): Promise<{ title: string; hook: string; chapters: { id: string; title: string; summary: string }[] }> {
  const langLabel = language === "en" ? "English" : language === "es" ? "Español" : "Português Brasileiro";
  const numChapters = durationToChapters(durationMin);

  const raw = await callClaude(
    `Você é um roteirista especializado em vídeos de YouTube de alto engajamento.
Canal: ${channel.name} | Nicho: ${channel.niche || "geral"}
Persona: ${blueprint?.persona_prompt || "narrador envolvente"}
IMPORTANT: Write ALL output content exclusively in ${langLabel}. Never respond in Portuguese or any other language unless it IS the target language.`,
    `Crie um sumário estruturado para um vídeo de ${durationMin} minutos sobre: "${idea}"
Idioma obrigatório: ${langLabel}

Retorne JSON:
{
  "title": "Título otimizado para YouTube (máx 70 chars)",
  "hook": "Frase de abertura de 1 linha para prender atenção",
  "chapters": [
    { "id": "ch1", "title": "Título do Capítulo", "summary": "O que será abordado (2-3 frases)" }
  ]
}

Gere exatamente ${numChapters} capítulos.`,
    true
  );

  const parsed = extractJson(raw) as { title: string; hook: string; chapters: { id?: string; title: string; summary: string }[] };
  return {
    title: parsed.title,
    hook: parsed.hook,
    chapters: (parsed.chapters || []).map(ch => ({
      id: ch.id || generateId(),
      title: ch.title,
      summary: ch.summary,
    })),
  };
}

async function generateChapterScript(
  chapter: { id: string; title: string; summary: string },
  allChapters: { title: string; summary: string }[],
  language: VideoLanguage,
  durationMin: number,
  channel: ChannelData,
  blueprint: BlueprintData | null,
  title: string,
): Promise<string> {
  const chapterIndex = allChapters.findIndex(c => c.title === chapter.title);
  const isFirst = chapterIndex === 0;
  const isLast = chapterIndex === allChapters.length - 1;
  const langLabel = language === "en" ? "English" : language === "es" ? "Español" : "Português Brasileiro";
  const chapterDurationMin = Math.ceil(durationMin / allChapters.length);

  const prompt = `Você é um roteirista para o canal "${channel.name}".
Idioma obrigatório: ${langLabel} — escreva TODO o roteiro neste idioma, sem exceção.
Estilo: ${blueprint?.persona_prompt || "narrador envolvente e direto"}
Regras: ${blueprint?.script_rules || ""}

Este é o capítulo ${chapterIndex + 1} de ${allChapters.length} do vídeo "${title}".
Contexto geral: ${allChapters.map(c => `${c.title}: ${c.summary}`).join(" | ")}

Escreva o roteiro COMPLETO para o capítulo: "${chapter.title}"
Resumo: ${chapter.summary}

${isFirst ? "Este é o capítulo de ABERTURA — comece com o hook." : ""}
${isLast ? "Este é o capítulo FINAL — feche com CTA forte." : ""}

Duração alvo: ~${chapterDurationMin} minutos de narração.
Escreva APENAS o texto da narração. Sem [PAUSA], sem comentários de produção.`;

  return await callClaude(
    (blueprint?.persona_prompt || "Você é um roteirista profissional de YouTube.") +
      `\nIMPORTANT: Write ALL content exclusively in ${langLabel}. Never use Portuguese or any other language unless it IS the target language.`,
    prompt
  );
}

export async function generateFullScript(
  idea: string,
  language: VideoLanguage,
  durationMin: number,
  channel: ChannelData,
  blueprint: BlueprintData | null,
  onProgress?: (message: string) => void,
): Promise<ScriptResult> {
  onProgress?.("Gerando sumário...");
  const summary = await generateSummary(idea, language, durationMin, channel, blueprint);

  const chaptersWithScripts: VideoChapter[] = [];
  for (const ch of summary.chapters) {
    onProgress?.(`Escrevendo cap. "${ch.title}"...`);
    const script = await generateChapterScript(ch, summary.chapters, language, durationMin, channel, blueprint, summary.title);
    chaptersWithScripts.push({
      id: ch.id,
      title: ch.title,
      summary: ch.summary,
      script,
      scenes: [],
    });
  }

  return {
    title: summary.title,
    hook: summary.hook,
    chapters: chaptersWithScripts,
  };
}
