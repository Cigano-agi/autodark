import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");

        if (!OPENROUTER_API_KEY) {
            return new Response(JSON.stringify({ error: "OPENROUTER_API_KEY não configurada." }), {
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

        const t0 = Date.now();
        const body: any = { 
            model: "openai/gpt-4o-mini", 
            messages, 
            temperature 
        };
        
        if (requireJson) body.response_format = { type: "json_object" };

        const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://autodark.app",
                "X-Title": "AutoDark"
            },
            body: JSON.stringify(body),
        });

        if (!aiResponse.ok) {
            const errorText = await aiResponse.text();
            throw new Error(`OpenRouter failed (${aiResponse.status}): ${errorText.slice(0, 200)}`);
        }

        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content || "";
        const finalProvider = "OpenRouter";
        const latencyMs = Date.now() - t0;
        
        if (!content) {
            throw new Error(`OpenRouter provided empty content`);
        }

        return new Response(JSON.stringify({
            content,
            _debug: { provider: finalProvider, latencyMs, attempts: 1, status: 200 },
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
