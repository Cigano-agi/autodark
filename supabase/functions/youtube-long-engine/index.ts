import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

export const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY não configurado nas variáveis de ambiente");
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // Auth guard
        const authHeader = req.headers.get("Authorization");
        const token = authHeader?.replace("Bearer ", "") ?? "";
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            { global: { headers: { Authorization: authHeader! } } }
        );
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (!user || authError) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 401,
            });
        }

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
                model: "google/gemini-2.5-flash",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.7,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("OpenRouter API Error:", errorText);
            throw new Error(`OpenRouter API failed: ${response.statusText}`);
        }

        const data = await response.json();
        const rawContent: string = data.choices[0].message.content || "";

        // Strip markdown code fences if model wraps JSON in ```json ... ```
        const jsonStr = rawContent.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Modelo não retornou JSON válido");

        const generatedScript = JSON.parse(jsonMatch[0]);

        // Handle models that wrap everything under a "script" key
        const script = generatedScript.script ?? generatedScript;

        if (!Array.isArray(script.scenes)) {
            throw new Error("Roteiro gerado sem campo 'scenes'. Tente novamente.");
        }

        return new Response(JSON.stringify({ success: true, script }), {
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
