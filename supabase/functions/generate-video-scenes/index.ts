import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
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
        
        const callAI = async (provider: "AI33" | "OpenRouter") => {
            const key = provider === "AI33" ? AI33_API_KEY : OPENROUTER_API_KEY;
            const url = provider === "AI33" ? "https://api.ai33.pro/v1/chat/completions" : "https://openrouter.ai/api/v1/chat/completions";
            const model = provider === "AI33" ? "gpt-4o-mini" : "google/gemini-2.0-flash-exp:free";

            if (!key) throw new Error(`${provider} API key not found`);

            const res = await fetch(url, {
                method: "POST",
                headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                    model,
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: `Idea: ${content.title}. Hook: ${content.hook}. Topic: ${content.topic}` }
                    ],
                    response_format: { type: "json_object" },
                }),
            });
            if (!res.ok) throw new Error(`${provider} failed: ${res.status}`);
            return await res.json();
        };

        let aiData;
        if (AI33_API_KEY) {
            try { 
                aiData = await callAI("AI33"); 
            } catch (e) { 
                console.warn("AI33 failed, falling back to OpenRouter", e.message);
                aiData = await callAI("OpenRouter"); 
            }
        } else if (OPENROUTER_API_KEY) {
            aiData = await callAI("OpenRouter");
        } else {
            throw new Error("No AI keys found");
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
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    }
});
