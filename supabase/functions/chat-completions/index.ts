import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI33_URL = "https://api.ai33.pro/v1/chat/completions";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // API keys resolved inside handler to avoid startup crashes
        const AI33_API_KEY = Deno.env.get("AI33_API_KEY");
        const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");

        if (!AI33_API_KEY && !OPENROUTER_API_KEY) {
            return new Response(JSON.stringify({ error: "Nenhuma API key configurada." }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 500,
            });
        }

        const { systemPrompt, userPrompt, temperature = 0.7, requireJson = false } = await req.json();
        
        if (!systemPrompt || !userPrompt) {
            throw new Error("systemPrompt and userPrompt are required");
        }

        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
        ];

        // Build provider chain: AI33 first, OpenRouter fallback
        const providers: { name: string; url: string; key: string; model: string }[] = [];
        if (AI33_API_KEY) providers.push({ name: "AI33", url: AI33_URL, key: AI33_API_KEY, model: "gpt-4o" });
        if (OPENROUTER_API_KEY) providers.push({ name: "OpenRouter", url: OPENROUTER_URL, key: OPENROUTER_API_KEY, model: "openai/gpt-4o-mini" });

        let content = "";
        let lastError = "";
        let finalProvider = "";
        let fallbackUsed: string | undefined;
        let attempts = 0;
        const t0 = Date.now();

        for (const prov of providers) {
            attempts++;
            try {
                const body: any = { model: prov.model, messages, temperature };
                if (requireJson) body.response_format = { type: "json_object" };

                const aiResponse = await fetch(prov.url, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${prov.key}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(body),
                });

                if (!aiResponse.ok) {
                    const errorText = await aiResponse.text();
                    console.warn(`${prov.name} failed (${aiResponse.status}): ${errorText.slice(0, 200)}`);
                    lastError = `${prov.name}: ${aiResponse.statusText}`;
                    continue; // try next provider
                }

                const aiData = await aiResponse.json();
                content = aiData.choices?.[0]?.message?.content || "";
                finalProvider = prov.name;
                if (attempts > 1) fallbackUsed = prov.name;
                console.log(`LLM response via ${prov.name} (${prov.model})`);
                break; // success
            } catch (e) {
                console.warn(`${prov.name} exception: ${e.message}`);
                lastError = `${prov.name}: ${e.message}`;
                continue;
            }
        }

        const latencyMs = Date.now() - t0;

        if (!content && lastError) {
            throw new Error(`All LLM providers failed. Last: ${lastError}`);
        }

        return new Response(JSON.stringify({
            content,
            _debug: { provider: finalProvider, latencyMs, fallbackUsed, attempts, status: 200 },
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Error in chat-completions:", error);
        return new Response(JSON.stringify({
            error: error instanceof Error ? error.message : "Unknown error",
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
