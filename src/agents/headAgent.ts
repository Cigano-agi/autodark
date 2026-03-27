import { callClaude, extractJson } from "./llm";
import type { GeneratedIdea, TrendInsight, ChannelData, BlueprintData, VideoLanguage } from "./types";

export async function generateIdeasBatch(
  channel: ChannelData,
  blueprint: BlueprintData | null,
  trends: TrendInsight,
  existingTitles: string[],
  count = 10,
  language: VideoLanguage = "pt-BR",
): Promise<GeneratedIdea[]> {
  const langLabel = language === "en" ? "English" : language === "es" ? "Español" : "Português Brasileiro";

  const prompt = `Canal: "${channel.name}" | Nicho: ${channel.niche || "geral"}
Persona: ${blueprint?.persona_prompt || "narrador envolvente"}
Regras: ${blueprint?.script_rules || ""}
Idioma obrigatório: ${langLabel}
Tendências atuais: ${trends.pattern}
Ângulos sugeridos: ${trends.suggestedAngles.join(", ")}
Títulos de referência: ${trends.topTitles.join(", ")}
Tópicos já usados (EVITAR repetir): ${existingTitles.slice(-20).join(", ")}

Gere ${count} ideias únicas para vídeos de 10-20 minutos.
Foco em: alto CTR, watch time, relevância para o nicho.
IMPORTANT: All titles, concepts, and descriptions must be written in ${langLabel}.

Retorne JSON:
{
  "ideas": [
    {
      "title": "Título otimizado para YouTube",
      "concept": "Descrição do conceito (2-3 frases)",
      "reasoning": "Por que esta ideia vai performar bem",
      "score": 85,
      "angle": "Ângulo diferenciado"
    }
  ]
}`;

  const raw = await callClaude(
    `Você é um estrategista de conteúdo YouTube especialista em crescimento orgânico.\nIMPORTANT: Write ALL output exclusively in ${langLabel}. Never use Portuguese or any other language unless it IS the target language.`,
    prompt,
    true
  );

  const parsed = extractJson(raw) as { ideas: GeneratedIdea[] };
  return parsed.ideas || [];
}
