// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    try {
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
        );

        const { contentId } = await req.json();
        if (!contentId) throw new Error("contentId is required");

        // Fetch content and blueprint
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

        const customScriptPrompt = blueprint?.custom_script_prompt || "";
        const visualStyle = blueprint?.visual_style || "cinematic, high detail, dark atmosphere";

        const systemPrompt = `You are a video scriptwriter. Break the following idea into at least 5 scenes for a short video.
Each scene must have "narration_text" and "visual_prompt".
Format the "visual_prompt" to be descriptive for an AI image generator, including the style: ${visualStyle}.
${customScriptPrompt ? `Rules: ${customScriptPrompt}` : ""}

Output JSON format:
{
  "scenes": [
    { "narration_text": "...", "visual_prompt": "..." }
  ]
}`;

        const AI33_API_KEY = Deno.env.get("AI33_API_KEY");
        const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");

        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Idea: ${content.title}. Hook: ${content.hook}. Topic: ${content.topic}` }
        ];

        const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

        const callOpenRouterModel = async (model: string) => {
            if (!OPENROUTER_API_KEY) throw new Error("OpenRouter API key not found");
            const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: { "Authorization": `Bearer ${OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
                body: JSON.stringify({ model, messages, response_format: { type: "json_object" } }),
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
                body: JSON.stringify({ model: "gpt-4o-mini", messages, response_format: { type: "json_object" } }),
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

        const rawContent = aiData.choices[0].message.content;
        const parsed = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent;
        const scenes = parsed.scenes;

        const { data: updated, error: updateError } = await supabaseClient
            .from("channel_contents")
            .update({ scenes, status: 'script_generated', updated_at: new Date().toISOString() })
            .eq("id", contentId)
            .select()
            .single();

        if (updateError) throw updateError;

        return new Response(JSON.stringify({ success: true, scenes: updated.scenes }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    }
});
