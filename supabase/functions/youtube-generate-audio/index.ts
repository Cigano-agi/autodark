import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI33_API_KEY = Deno.env.get("AI33_API_KEY");
const AI33_TTS_URL = "https://api.ai33.pro/v1/audio/speech";

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { text, voice } = await req.json();

        if (!text) {
            return new Response(JSON.stringify({ error: "Text is required" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const ttsResponse = await fetch(AI33_TTS_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${AI33_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "tts-1",
                input: text,
                voice: voice || "onyx",
                response_format: "mp3",
            }),
        });

        if (!ttsResponse.ok) {
            const errorText = await ttsResponse.text();
            console.error("TTS Error:", errorText);
            return new Response(JSON.stringify({ error: `TTS generation failed: ${ttsResponse.statusText}` }), {
                status: ttsResponse.status,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const audioBuffer = await ttsResponse.arrayBuffer();

        return new Response(audioBuffer, {
            status: 200,
            headers: {
                ...corsHeaders,
                "Content-Type": "audio/mpeg",
                "Content-Length": audioBuffer.byteLength.toString(),
            },
        });
    } catch (error) {
        console.error("Error in youtube-generate-audio:", error);
        return new Response(JSON.stringify({
            error: error instanceof Error ? error.message : "Unknown error"
        }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
