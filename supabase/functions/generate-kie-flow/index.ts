import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface KieFlowRequest {
    action?: 'generate' | 'poll';
    taskId?: string;
    prompt?: string;
    aspectRatio?: string;
}

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get("Authorization");
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            { global: { headers: { Authorization: authHeader! } } }
        );

        // Auth guard
        const token = authHeader?.replace("Bearer ", "") ?? "";
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
        if (!user || authError) {
            return new Response(JSON.stringify({ status: "error", message: "Unauthorized" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 401,
            });
        }

        const body = await req.json() as KieFlowRequest;
        const action = body.action || 'generate';

        const kieApiKey = Deno.env.get("KIE_API_KEY");
        if (!kieApiKey) {
            throw new Error("KIE_API_KEY not found in environment.");
        }

        if (action === 'generate') {
            const prompt = body.prompt;
            if (!prompt) throw new Error("prompt is required for generate action.");

            const res = await fetch("https://api.kie.ai/api/v1/flux/kontext/generate", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${kieApiKey}` },
                body: JSON.stringify({
                    prompt,
                    aspectRatio: body.aspectRatio || "16:9",
                    outputFormat: "jpeg",
                    model: "flux-kontext-pro",
                    enableTranslation: true
                })
            });
            if (!res.ok) throw new Error(`Kie.ai Error: ${await res.text()}`);
            const data = await res.json();
            return new Response(JSON.stringify({ status: 'success', taskId: data?.data?.taskId }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } else if (action === 'poll') {
            const taskId = body.taskId;
            if (!taskId) throw new Error("taskId is required for poll action.");

            const res = await fetch(`https://api.kie.ai/api/v1/flux/kontext/record-info?taskId=${taskId}`, {
                headers: { 'Authorization': `Bearer ${kieApiKey}` }
            });
            if (!res.ok) throw new Error(`Kie.ai Poll Error: ${await res.text()}`);
            const data = await res.json();
            return new Response(JSON.stringify({ status: 'success', data: data?.data }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        throw new Error("Invalid action.");
    } catch (error) {
        console.error("Error in generate-kie-flow:", error);
        return new Response(
            JSON.stringify({
                status: 'error',
                message: error instanceof Error ? error.message : "An unexpected error occurred."
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            }
        );
    }
});
