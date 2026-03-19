import { supabase } from "@/integrations/supabase/client";
import { callClaude, extractJson } from "./llm";
import type { TrendInsight } from "./types";

export async function analyzeTrends(channelId: string): Promise<TrendInsight> {
  const { data: competitors } = await (supabase.from as unknown as (table: string) => ReturnType<typeof supabase.from>)("channel_competitors")
    .select("*")
    .eq("channel_id", channelId);

  if (!competitors?.length) {
    return { pattern: "Sem dados de concorrentes ainda.", topTitles: [], suggestedAngles: [] };
  }

  // Use competitor channel names + any scraped data as context
  const competitorInfo = competitors.map((c: Record<string, unknown>) =>
    `- ${c.channel_name || c.youtube_url || "Canal"}`
  ).join("\n");

  const prompt = `Analise estes concorrentes de um canal YouTube:
${competitorInfo}

Com base nos nomes e nichos destes canais, sugira:
1. Padrões de conteúdo que provavelmente funcionam bem
2. Tópicos em alta neste nicho
3. Ângulos diferenciados ainda não explorados

Retorne JSON:
{
  "pattern": "insight principal em 1 frase",
  "topTitles": ["exemplo de título 1", "exemplo de título 2", "exemplo de título 3"],
  "suggestedAngles": ["ângulo1", "ângulo2", "ângulo3"]
}`;

  const raw = await callClaude("Você é um analista de YouTube.", prompt, true);
  return extractJson(raw) as unknown as TrendInsight;
}
