import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI33_URL = "https://api.ai33.pro/v1/chat/completions";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

async function callLLM(apiUrl: string, apiKey: string, body: object): Promise<string> {
    const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const errorText = await res.text();
        console.error(`LLM error (${apiUrl}):`, res.status, errorText);
        throw new Error(`API failed: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const AI33_API_KEY = Deno.env.get("AI33_API_KEY");
        const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");

        if (!AI33_API_KEY && !OPENROUTER_API_KEY) {
            return new Response(JSON.stringify({ error: "Nenhuma chave de API configurada." }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const { systemPrompt, userPrompt, temperature = 0.7, requireJson = false } = await req.json();

        const body: any = {
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature,
        };

        if (requireJson) {
            body.response_format = { type: "json_object" };
        }

        let content = "";

        // Try AI33 first, fall back to OpenRouter
        if (AI33_API_KEY) {
            try {
                content = await callLLM(AI33_URL, AI33_API_KEY, body);
            } catch (ai33Err) {
                console.warn("AI33 failed, trying OpenRouter:", ai33Err);
                if (!OPENROUTER_API_KEY) throw ai33Err;
                content = await callLLM(OPENROUTER_URL, OPENROUTER_API_KEY, {
                    ...body,
                    model: "openai/gpt-4o-mini",
                });
            }
        } else if (OPENROUTER_API_KEY) {
            content = await callLLM(OPENROUTER_URL, OPENROUTER_API_KEY, {
                ...body,
                model: "openai/gpt-4o-mini",
            });
        }

        return new Response(JSON.stringify({ content }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Error in chat-completions:", error);
        return new Response(JSON.stringify({
            error: error instanceof Error ? error.message : "Unknown error",
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
