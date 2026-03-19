import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
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

        const { systemPrompt, userPrompt, temperature = 0.7, requireJson = false } = await req.json();
        
        if (!systemPrompt || !userPrompt) {
            throw new Error("systemPrompt and userPrompt are required");
        }

        const body: any = {
            model: "gpt-4o",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature,
        };
        
        if (requireJson) {
            body.response_format = { type: "json_object" };
        }

        const aiResponse = await fetch(AI33_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${AI33_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        if (!aiResponse.ok) {
            const errorText = await aiResponse.text();
            console.error("AI33 Error:", errorText);
            throw new Error(`AI API failed: ${aiResponse.statusText}`);
        }

        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content || "";

        return new Response(JSON.stringify({ content }), {
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
