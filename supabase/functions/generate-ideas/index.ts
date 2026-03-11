import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") || "http://localhost:5173";

const corsHeaders = {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI33_API_KEY = Deno.env.get("AI33_API_KEY");
if (!AI33_API_KEY) throw new Error("AI33_API_KEY não configurado nas variáveis de ambiente");
const AI33_URL = "https://api.ai33.pro/v1/chat/completions";

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            {
                global: {
                    headers: { Authorization: req.headers.get("Authorization")! },
                },
            }
        );

        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error("Unauthorized");

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

        const systemPrompt = `Você é um curador de momentos extraordinários. Seu objetivo é gerar ${videosPerBatch} ideias de vídeos curtos com alto potencial viral.

NICHO: ${channel.niche}
TÓPICO BASE: ${topic}
FONTE DE REFERÊNCIA: ${reference}
${personaPrompt ? `PERSONA: ${personaPrompt}` : ""}

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

        const aiResponse = await fetch(AI33_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${AI33_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Gere ${videosPerBatch} ideias de vídeos curtos sobre ${topic}` }
                ],
                temperature: 0.85,
                response_format: { type: "json_object" },
            }),
        });

        if (!aiResponse.ok) {
            const errorText = await aiResponse.text();
            console.error("AI33 Error:", errorText);
            throw new Error(`AI API failed: ${aiResponse.statusText}`);
        }

        const aiData = await aiResponse.json();
        const rawContent = aiData.choices?.[0]?.message?.content || "{}";
        let parsed;
        try {
            parsed = JSON.parse(rawContent);
        } catch {
            throw new Error("Failed to parse AI response as JSON");
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
            hook: v.hook,
            topic: v.topic,
            character: v.character || null,
            reference: v.reference || null,
            angle: v.angle || null,
            nicho_slug: nichoSlug,
            status: "idea_generated",
        }));

        const { data: inserted, error: insertError } = await supabaseClient
            .from("channel_contents")
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
            status: 400,
        });
    }
});
