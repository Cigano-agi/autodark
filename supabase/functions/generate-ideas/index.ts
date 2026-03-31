// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const AI33_API_KEY = Deno.env.get("AI33_API_KEY");
        const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");

        const apiKey = AI33_API_KEY || OPENROUTER_API_KEY;
        const apiUrl = AI33_API_KEY
            ? "https://api.ai33.pro/v1/chat/completions"
            : "https://openrouter.ai/api/v1/chat/completions";

        if (!apiKey) {
            return new Response(JSON.stringify({
                error: "Nenhuma chave de API configurada. Configure AI33_API_KEY ou OPENROUTER_API_KEY nas variáveis de ambiente do Supabase.",
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }

        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            {
                global: {
                    headers: { Authorization: req.headers.get("Authorization")! },
                },
            }
        );

        const authHeader = req.headers.get("Authorization");
        const token = authHeader ? authHeader.replace("Bearer ", "") : "";
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
        if (!user || authError) throw new Error("Unauthorized: " + (authError?.message || "Invalid or missing token"));

        const { channelId } = await req.json();
        if (!channelId) throw new Error("channelId is required");

        const { data: blueprint } = await supabaseClient
            .from("channel_blueprints")
            .select("*")
            .eq("channel_id", channelId)
            .maybeSingle();

        const { data: channel } = await supabaseClient
            .from("channels")
            .select("name, niche")
            .eq("id", channelId)
            .single();

        if (!channel) throw new Error("Channel not found");

        const videosPerBatch = blueprint?.videos_per_batch || 4;
        const reference = blueprint?.reference || "fontes confiáveis";
        const topic = blueprint?.topic || channel.niche;
        const personaPrompt = blueprint?.persona_prompt || "";
        const customScriptPrompt = blueprint?.custom_script_prompt || "";

        const systemPrompt = `Você é um curador de momentos extraordinários. Seu objetivo é gerar ${videosPerBatch} ideias de vídeos curtos com alto potencial viral.

NICHO: ${channel.niche}
TÓPICO BASE: ${topic}
FONTE DE REFERÊNCIA: ${reference}
${personaPrompt ? `PERSONA: ${personaPrompt}` : ""}
${customScriptPrompt ? `REGRAS CUSTOMIZADAS: ${customScriptPrompt}` : ""}

DIRETRIZES DE VARIEDADE E IMPACTO:

- Explore fatos e histórias menos conhecidos. Evite repetir as mesmas histórias populares.
- O Hook (Obrigatório): Deve ser uma frase visual, curta e direta que descreve um fato extraordinário.
  Exemplo: "O machado de ferro flutuou nas águas." ou "A sombra dele curava os doentes no caminho."
- Tom: Foco na exaltação e edificação. Não dê conselhos, narre o extraordinário.

REGRAS DE FORMATAÇÃO (TTS & ESTRUTURA):
- Referência para Fala: Escreva sempre por extenso para o narrador.
  Exemplo: "Gênesis, capítulo 1, versículo 1" (Nunca use ":" ou abreviações).
- Fidelidade: Use apenas eventos e personagens registrados em ${reference}. Não invente detalhes.

FORMATO DE SAÍDA (JSON PURO):
{
  "videos": [
    {
      "hook": "O momento exato do impacto sobrenatural.",
      "topic": "Descrição clara do evento.",
      "character": "Nome do personagem central.",
      "reference": "[Livro], capítulo [número], versículo [número]",
      "angle": "A verdade profunda que esse evento revela."
    }
  ]
}`;

        const callAI = async (provider: "AI33" | "OpenRouter") => {
            const key = provider === "AI33" ? AI33_API_KEY : OPENROUTER_API_KEY;
            const url = provider === "AI33" 
                ? "https://api.ai33.pro/v1/chat/completions" 
                : "https://openrouter.ai/api/v1/chat/completions";
            const model = provider === "AI33" ? "gpt-4o-mini" : "meta-llama/llama-3.3-70b-instruct:free";

            if (!key) throw new Error(`${provider} API key not found`);

            const res = await fetch(url, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${key}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model,
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: `Gere ${videosPerBatch} ideias de vídeos curtos sobre ${topic}` }
                    ],
                    temperature: 0.85,
                    response_format: { type: "json_object" },
                }),
            });

            if (!res.ok) {
                const errText = await res.text();
                let exactReason = errText.slice(0, 150);
                try {
                    const parsed = JSON.parse(errText);
                    if (parsed.error && parsed.error.message) exactReason = parsed.error.message;
                    else if (parsed.message) exactReason = parsed.message;
                } catch (_) {}

                if (res.status === 401) {
                    throw new Error(`Credenciais inválidas na ${provider} (401). Detalhe oficial: ${exactReason}`);
                }
                if (res.status === 429) {
                    throw new Error(`Limite atingido na ${provider} (429) - Recarregue saldo. Detalhe oficial: ${exactReason}`);
                }
                throw new Error(`A ${provider} recusou a conexão (${res.status}). Detalhe: ${exactReason}`);
            }

            return await res.json();
        };

        let aiData;
        try {
            if (AI33_API_KEY) {
                try {
                    aiData = await callAI("AI33");
                } catch (e: any) {
                    console.warn(`AI33 failed: ${e.message}. Falling back to OpenRouter.`);
                    if (OPENROUTER_API_KEY) {
                        aiData = await callAI("OpenRouter");
                    } else {
                        throw e;
                    }
                }
            } else if (OPENROUTER_API_KEY) {
                aiData = await callAI("OpenRouter");
            } else {
                throw new Error("No AI keys found");
            }
        } catch (e: any) {
            throw new Error(`AI generation failed: ${e.message}`);
        }

        const rawContent = aiData.choices?.[0]?.message?.content || "{}";
        let parsed;
        try {
            parsed = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent;
        } catch {
            throw new Error("Failed to parse AI response as JSON: " + rawContent);
        }

        const videos = parsed.videos;
        if (!Array.isArray(videos) || videos.length === 0) {
            throw new Error("No video ideas generated");
        }

        const nichoSlug = channel.niche
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/-+/g, "-")
            .trim();

        const contentRows = videos.map((v: any) => ({
            channel_id: channelId,
            title: v.hook,
            concept: v.topic,
            reasoning: v.angle,
            score: Math.floor(Math.random() * 20) + 80, // High score for AI ideas
            status: "new",
            created_at: new Date().toISOString(),
        }));

        const { data: inserted, error: insertError } = await supabaseClient
            .from("content_ideas")
            .insert(contentRows)
            .select();

        if (insertError) {
            console.error("Insert error:", insertError);
            throw new Error(`Failed to save ideas: ${insertError.message}`);
        }

        return new Response(JSON.stringify({
            success: true,
            count: inserted?.length || 0,
            ideas: inserted,
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Error in generate-ideas:", error);
        return new Response(JSON.stringify({
            error: error instanceof Error ? error.message : "Unknown error",
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200, // Supabase invoke masks 400 errors, return 200 with error payload
        });
    }
});
