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

        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Gere o roteiro para o vídeo sobre: ${content.topic || content.title}` }
        ];

        const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

        const callOpenRouterModel = async (model: string) => {
            if (!OPENROUTER_API_KEY) throw new Error("OpenRouter API key not found");
            const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: { "Authorization": `Bearer ${OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
                body: JSON.stringify({ model, messages, temperature: 0.7, response_format: { type: "json_object" } }),
            });
            if (!res.ok) {
                const errText = await res.text();
                let reason = errText.slice(0, 200);
                try { const p = JSON.parse(errText); reason = p.error?.message || p.message || reason; } catch (_) {}
                if (res.status === 401) throw new Error(`OpenRouter: credenciais inválidas (401). ${reason}`);
                if (res.status === 429) throw Object.assign(new Error(`OpenRouter: rate limit (429). ${reason}`), { isRateLimit: true });
                throw new Error(`OpenRouter recusou (${res.status}). ${reason}`);
            }
            return await res.json();
        };

        const callAI33 = async () => {
            if (!AI33_API_KEY) throw new Error("AI33 API key not found");
            const res = await fetch("https://api.ai33.pro/v1/chat/completions", {
                method: "POST",
                headers: { "Authorization": `Bearer ${AI33_API_KEY}`, "Content-Type": "application/json" },
                body: JSON.stringify({ model: "gpt-4o-mini", messages, temperature: 0.7, response_format: { type: "json_object" } }),
            });
            if (!res.ok) {
                const errText = await res.text();
                let reason = errText.slice(0, 200);
                try { const p = JSON.parse(errText); reason = p.error?.message || p.message || reason; } catch (_) {}
                throw new Error(`AI33 falhou (${res.status}). ${reason}`);
            }
            return await res.json();
        };

        const callOpenRouterWithFallback = async () => {
            const MODELS = [
                "meta-llama/llama-3.3-70b-instruct",
                "mistralai/mistral-7b-instruct:free",
            ];
            for (const model of MODELS) {
                try {
                    return await callOpenRouterModel(model);
                } catch (e: any) {
                    if (e.isRateLimit) {
                        console.warn(`Rate limit em ${model}, aguardando 4s e tentando próximo modelo...`);
                        await sleep(4000);
                        continue;
                    }
                    throw e;
                }
            }
            throw new Error("Todos os modelos OpenRouter atingiram o rate limit. Tente novamente em alguns minutos.");
        };

        let aiData;
        try {
            if (AI33_API_KEY) {
                try {
                    aiData = await callAI33();
                } catch (e: any) {
                    console.warn(`AI33 falhou: ${e.message}. Usando OpenRouter.`);
                    if (OPENROUTER_API_KEY) {
                        aiData = await callOpenRouterWithFallback();
                    } else {
                        throw e;
                    }
                }
            } else if (OPENROUTER_API_KEY) {
                aiData = await callOpenRouterWithFallback();
            } else {
                throw new Error("Nenhuma chave de API configurada (AI33_API_KEY ou OPENROUTER_API_KEY).");
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
