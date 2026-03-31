import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

        const authHeader = req.headers.get("Authorization");
        const token = authHeader ? authHeader.replace("Bearer ", "") : "";
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
        if (!user || authError) throw new Error("Unauthorized: " + (authError?.message || "Invalid or missing token"));

        const { contentId } = await req.json();
        if (!contentId) throw new Error("contentId is required");

        const { data: content, error: contentError } = await supabaseClient
            .from("channel_contents")
            .select("*")
            .eq("id", contentId)
            .single();

        if (contentError || !content) throw new Error("Content not found");

        const { data: blueprint } = await supabaseClient
            .from("channel_blueprints")
            .select("*")
            .eq("channel_id", content.channel_id)
            .maybeSingle();

        const charLimit = blueprint?.char_limit || 500;
        const cta = blueprint?.cta || "Se inscreva no canal e ative as notificações!";
        const scriptRules = blueprint?.script_rules || "";
        const personaPrompt = blueprint?.persona_prompt || "Você é um roteirista de vídeos curtos especializado em narrativas impactantes.";
        const targetAudience = blueprint?.target_audience || "Público geral do YouTube Shorts";

        const systemPrompt = `${personaPrompt}

PÚBLICO ALVO: ${targetAudience}

SUA MISSÃO: Criar um texto emocionante, envolvente e otimizado para narração (TTS) para um vídeo curto (Shorts/Reels/TikTok).

PARÂMETROS TÉCNICOS CRÍTICOS:

- Limite Estrito: O roteiro NUNCA deve ultrapassar ${charLimit} caracteres (contando espaços).
- Início: Comece exatamente com o hook: ${content.hook || content.title}
- Referência: Se houver uma referência específica (${content.reference || "a fonte original"}), mencione-a naturalmente.
- Final: Encerre com um pensamento impactante e finalize com o CTA: ${cta}
${scriptRules ? `\nREGRAS ADICIONAIS DO CANAL:\n${scriptRules}` : ""}

QUALIDADE NARRATIVA (PARA TTS):

- Ritmo de Fala: O texto deve ter pausas naturais para a voz da IA respirar. Use pontuação para guiar a entonação.
- Impacto: Foque no poder do evento e na reação emocional.

PROCESSO DE ESCRITA:

1. Leia o limite de caracteres disponível.
2. Escreva a narrativa focando no essencial para garantir retenção.
3. Se o texto ultrapassar o limite, corte palavras de preenchimento, mas mantenha o Hook e o CTA intactos.

FORMATO DE SAÍDA (JSON PURO):
{
  "roteiro_final": "O texto completo aqui.",
  "tema": "${content.topic || content.title}",
  "char_used": [número real de caracteres do roteiro_final]
}`;

        const AI33_API_KEY = Deno.env.get("AI33_API_KEY");
        const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");

        const callAI = async (provider: "AI33" | "OpenRouter") => {
            const key = provider === "AI33" ? AI33_API_KEY : OPENROUTER_API_KEY;
            const url = provider === "AI33" 
                ? "https://api.ai33.pro/v1/chat/completions" 
                : "https://openrouter.ai/api/v1/chat/completions";
            const model = provider === "AI33" ? "gpt-4o-mini" : "google/gemini-2.0-flash-lite:free";

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
                        { role: "user", content: `Gere o roteiro para o vídeo sobre: ${content.topic || content.title}` }
                    ],
                    temperature: 0.7,
                    response_format: { type: "json_object" },
                }),
            });

            if (!res.ok) {
                const err = await res.text();
                throw new Error(`${provider} failed (${res.status}): ${err.slice(0, 100)}`);
            }

            return await res.json();
        };

        let aiData;
        try {
            if (AI33_API_KEY) {
                try {
                    aiData = await callAI("AI33");
                } catch (e) {
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
        } catch (e) {
            throw new Error(`AI generation failed: ${e.message}`);
        }

        const rawContent = aiData.choices?.[0]?.message?.content || "{}";
        let parsed;
        try {
            parsed = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent;
        } catch {
            throw new Error("Failed to parse AI response as JSON: " + rawContent);
        }

        const script = parsed.roteiro_final;
        if (!script) throw new Error("No script generated in JSON: " + JSON.stringify(parsed));

        const { data: updated, error: updateError } = await supabaseClient
            .from("channel_contents")
            .update({
                script: script,
                status: "script_generated",
                updated_at: new Date().toISOString(),
            })
            .eq("id", contentId)
            .select()
            .single();

        if (updateError) {
            console.error("Update error:", updateError);
            throw new Error(`Failed to update content: ${updateError.message}`);
        }

        return new Response(JSON.stringify({
            success: true,
            content: updated,
            char_used: parsed.char_used,
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Error in generate-script:", error);
        return new Response(JSON.stringify({
            error: error instanceof Error ? error.message : "Unknown error",
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200, // Supabase invoke masks 400 errors, return 200 with error payload
        });
    }
});
