import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
export const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY") || "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";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { topic, channelContext, webhookUrl } = await req.json();

        if (!topic) {
            return new Response(JSON.stringify({ error: "Missing topic" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            });
        }

        const systemPrompt = `Você é um engenheiro de viralização e especialista em SEO focado em scripts longos para YouTube.
Contexto do Canal: ${channelContext || "Conteúdo Genérico, tom dinâmico e retenção alta."}

Sua missão é gerar um Roteiro de Vídeo Longo (em formato JSON) dividido em: 
1. title (Otimizado para clique com Curiosidade)
2. description (2 linhas de gancho focado na palavra-chave + 21 hashtags)
3. tags (20 tags como string separada por vírgula)
4. scenes (array com: id, director_notes (o que vai acontecer visualmente no slide), narration_text (apenas a fala exata para o TTS ler), visual_prompt_for_image_ai (prompt em inglês para IA de imagem), estimated_duration (segundos)). 

Seja detalhista. Crie uma história profunda para reter atenção (crie entre 5 a 10 blocos). 
Atenção: narration_text DEVE conter apenas as palavras que o narrador vai falar, sem marcações ou ações. 
Retorne APENAS um JSON válido.`;

        const userPrompt = `Gere um roteiro épico sobre: ${topic}`;

        const response = await fetch(OPENROUTER_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                "HTTP-Referer": "https://autodark.app",
                "X-Title": "AutoDark Engine",
            },
            body: JSON.stringify({
                model: "google/gemini-2.5-flash", // Using extremely fast and cheap model via OpenRouter
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.7,
                response_format: { type: "json_object" }
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("OpenRouter API Error:", errorText);
            throw new Error(`OpenRouter API failed: ${response.statusText}`);
        }

        const data = await response.json();
        const generatedScript = JSON.parse(data.choices[0].message.content);

        return new Response(JSON.stringify({ success: true, script: generatedScript }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Error in generate-youtube-script:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
});
