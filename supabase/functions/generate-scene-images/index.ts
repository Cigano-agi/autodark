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

        const { data: content, error: contentError } = await supabaseClient
            .from("channel_contents")
            .select("scenes")
            .eq("id", contentId)
            .single();
        if (contentError || !content) throw new Error("Content not found or scenes missing");

        const scenes = [...(content.scenes as any[])];
        
        // Placeholder for image generation (Picsum)
        // In the future, this will call Kie.ai or DALL-E 3
        for (let i = 0; i < scenes.length; i++) {
            if (!scenes[i].image_url) {
                const seed = Math.floor(Math.random() * 100000);
                scenes[i].image_url = `https://picsum.photos/seed/${seed}/1280/720`;
            }
        }

        const { data: updated, error: updateError } = await supabaseClient
            .from("channel_contents")
            .update({ scenes, status: 'production_ready', updated_at: new Date().toISOString() })
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
