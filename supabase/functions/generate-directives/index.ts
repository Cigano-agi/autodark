import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI33_API_KEY   = Deno.env.get("AI33_API_KEY");
const OPENROUTER_KEY = Deno.env.get("OPENROUTER_API_KEY");

async function callLLM(system: string, user: string): Promise<string> {
  // Tenta AI33 primeiro, fallback OpenRouter
  if (AI33_API_KEY) {
    try {
      const res = await fetch("https://api.ai33.pro/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${AI33_API_KEY}` },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          messages: [{ role: "system", content: system }, { role: "user", content: user }],
          temperature: 0.3,
          max_tokens: 4000,
        }),
      });
      if (res.ok) {
        const d = await res.json();
        return d.choices[0].message.content;
      }
    } catch (_) { /* fallthrough */ }
  }

  if (!OPENROUTER_KEY) throw new Error("Nenhuma API key configurada (AI33 ou OpenRouter)");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENROUTER_KEY}`,
      "HTTP-Referer": "https://autodark.app",
    },
    body: JSON.stringify({
      model: "anthropic/claude-sonnet-4-5",
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      temperature: 0.3,
      max_tokens: 4000,
    }),
  });

  if (!res.ok) throw new Error(`LLM error: ${res.statusText}`);
  const d = await res.json();
  return d.choices[0].message.content;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
  );

  try {
    const { channel_id } = await req.json();
    if (!channel_id) return new Response(JSON.stringify({ error: "channel_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Busca fundação + dados do canal
    const [{ data: foundation, error: fe }, { data: channel, error: ce }] = await Promise.all([
      supabase.from("channel_foundation").select("*").eq("channel_id", channel_id).single(),
      supabase.from("channels").select("name, niche").eq("id", channel_id).single(),
    ]);

    if (fe || !foundation) throw new Error("Fundação não encontrada. Complete as 25 perguntas primeiro.");
    if (ce || !channel)   throw new Error("Canal não encontrado.");

    const f = foundation;
    const seedChannelsStr = Array.isArray(f.seed_channels)
      ? f.seed_channels.map((c: { name: string; channel_id: string; pillar: string }) =>
          `  {"channel_id": "${c.channel_id}", "name": "${c.name}", "pillar": "${c.pillar}"}`
        ).join(",\n")
      : "";

    const systemPrompt = `Você é um arquiteto de sistemas de automação de YouTube.
Sua tarefa é gerar diretivas operacionais (SOPs em Markdown) para um sistema de produção automatizado.
As diretivas devem ser precisas, acionáveis e conter exemplos concretos.
Retorne APENAS JSON válido com as chaves especificadas. Sem texto extra fora do JSON.`;

    const userPrompt = `Gere as diretivas para o canal "${channel.name}" com base nessa fundação:

IDENTIDADE:
- Nicho: ${f.niche}
- Insider angle: ${f.insider_angle}
- Inimigo narrativo: ${f.narrative_enemy}
- Assinatura visual: ${JSON.stringify(f.visual_signature)}

MODELO DE NEGÓCIO:
- Frequência: ${f.publish_frequency}
- Duração alvo: ${f.target_duration_min} min
- Sub-nichos: ${(f.sub_niches ?? []).join(", ")}
- Idioma: ${f.primary_language}
- Monetização: ${(f.monetization_model ?? []).join(", ")}

STACK:
- Hardware: ${JSON.stringify(f.hardware_profile)}
- Budget API/mês: $${f.monthly_api_budget}
- APIs: ${(f.required_apis ?? []).join(", ")}
- Voice cloning: ${f.voice_cloning}
- Evidências: ${f.evidence_strategy}

ARQUITETURA:
- Z-Score threshold: ${f.z_score_threshold}
- Estrutura narrativa: ${f.narrative_structure}
- Sistema de qualidade: ${JSON.stringify(f.quality_system)}

OPERAÇÃO:
- Calendário: ${JSON.stringify(f.publish_schedule)}
- Fosso defensivo: ${f.defensive_moat}

Retorne JSON com exatamente estas chaves:
{
  "identity": "D-001: bloco Markdown com paleta, tom, assinatura sonora/visual do canal",
  "script_agent": "D-002/D-005: system prompt completo do Roteirista + regras But/Therefore + estrutura de cenas + CriticAgent checks",
  "intelligence_radar": "D-004: SEED_CHANNELS formatado como lista Python + Z_THRESHOLD + VIRAL_WINDOW_HOURS",
  "assembly": "D-006: parâmetros de montagem (LUFS, Ken Burns, duração de hooks, SFX categories)",
  "publisher": "D-007: estratégia de SEO (título, descrição, tags, slot de publicação)",
  "flux_style": "string de sufixo FLUX_STYLE para prompts de imagem do canal"
}`;

    const raw = await callLLM(systemPrompt, userPrompt);

    // Extrai JSON do response (pode vir com markdown code block)
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, raw];
    const directives = JSON.parse(jsonMatch[1].trim());

    // Salva no banco
    const { error: updateErr } = await supabase
      .from("channel_foundation")
      .update({
        generated_directives: directives,
        directives_generated_at: new Date().toISOString(),
      })
      .eq("channel_id", channel_id);

    if (updateErr) throw updateErr;

    return new Response(JSON.stringify({ success: true, directives }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("generate-directives error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
