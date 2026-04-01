// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const AI33_API_KEY       = Deno.env.get("AI33_API_KEY");
const OPENAI_API_KEY     = Deno.env.get("OPENAI_API_KEY");
const GOOGLE_TTS_API_KEY = Deno.env.get("GOOGLE_TTS_API_KEY");

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

        const { text, voice, provider } = await req.json();

        if (!text) {
            return new Response(JSON.stringify({ error: "Text is required" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // ── Google Cloud TTS Chirp3-HD ────────────────────────────────────────
        if (provider === "google") {
            if (!GOOGLE_TTS_API_KEY) {
                return new Response(JSON.stringify({ error: "GOOGLE_TTS_API_KEY não configurada" }), {
                    status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }
            const voiceName = voice || "pt-BR-Chirp3-HD-Algenib";
            // Derive languageCode from the voice name prefix (e.g. "pt-BR-Chirp3..." → "pt-BR")
            const langPrefix = voiceName.split("-").slice(0, 2).join("-"); // "pt-BR" | "en-US" | "es-ES"
            const supportedLangs = ["pt-BR", "en-US", "en-GB", "es-ES", "es-US", "fr-FR", "de-DE"];
            const languageCode = supportedLangs.includes(langPrefix) ? langPrefix : "pt-BR";
            const res = await fetch(
                `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        input: { text },
                        voice: { languageCode, name: voiceName },
                        audioConfig: { audioEncoding: "MP3", speakingRate: 0.95 },
                    }),
                }
            );
            if (!res.ok) {
                const err = await res.text();
                throw new Error(`Google TTS failed (${res.status}): ${err.slice(0, 200)}`);
            }
            const { audioContent } = await res.json();
            const audioBuffer = Uint8Array.from(atob(audioContent), c => c.charCodeAt(0)).buffer;
            return new Response(audioBuffer, {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "audio/mpeg" },
            });
        }

        const callTTS = async (provider: "AI33" | "OpenAI") => {
            const key = provider === "AI33" ? AI33_API_KEY : OPENAI_API_KEY;
            const url = provider === "AI33" 
                ? "https://api.ai33.pro/v1/audio/speech" 
                : "https://api.openai.com/v1/audio/speech";

            if (!key) throw new Error(`${provider} API key not found`);

            const res = await fetch(url, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${key}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: "tts-1",
                    input: text,
                    voice: voice || "onyx",
                    response_format: "mp3",
                }),
            });

            if (!res.ok) {
                const err = await res.text();
                throw new Error(`${provider} failed (${res.status}): ${err.slice(0, 100)}`);
            }

            return await res.arrayBuffer();
        };

        const callGoogleTTSFallback = async () => {
            if (!GOOGLE_TTS_API_KEY) throw new Error("GOOGLE_TTS_API_KEY não configurada");
            const voiceName = "pt-BR-Chirp3-HD-Algenib";
            const res = await fetch(
                `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        input: { text },
                        voice: { languageCode: "pt-BR", name: voiceName },
                        audioConfig: { audioEncoding: "MP3", speakingRate: 0.95 },
                    }),
                }
            );
            if (!res.ok) {
                const err = await res.text();
                throw new Error(`Google TTS fallback failed (${res.status}): ${err.slice(0, 200)}`);
            }
            const { audioContent } = await res.json();
            return Uint8Array.from(atob(audioContent), c => c.charCodeAt(0)).buffer;
        };

        let audioBuffer;
        try {
            if (AI33_API_KEY) {
                try {
                    audioBuffer = await callTTS("AI33");
                } catch (e: any) {
                    console.warn(`AI33 TTS failed: ${e.message}. Trying fallback.`);
                    if (OPENAI_API_KEY) {
                        audioBuffer = await callTTS("OpenAI");
                    } else if (GOOGLE_TTS_API_KEY) {
                        console.warn("Falling back to Google TTS.");
                        audioBuffer = await callGoogleTTSFallback();
                    } else {
                        throw e;
                    }
                }
            } else if (OPENAI_API_KEY) {
                audioBuffer = await callTTS("OpenAI");
            } else if (GOOGLE_TTS_API_KEY) {
                audioBuffer = await callGoogleTTSFallback();
            } else {
                throw new Error("Nenhuma chave de TTS configurada (AI33, OpenAI ou Google)");
            }
        } catch (e: any) {
            throw new Error(`TTS generation failed: ${e.message}`);
        }

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
