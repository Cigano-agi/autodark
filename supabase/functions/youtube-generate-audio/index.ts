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

/**
 * Faz polling em uma task AI33 até que status === "done" ou timeout
 */
async function pollAI33Task(
  taskId: string,
  apiKey: string,
  timeoutMs = 120_000,
  intervalMs = 2_000
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`https://api.ai33.pro/v1/task/${taskId}`, {
      headers: { "xi-api-key": apiKey }
    });
    const task = await res.json();
    if (task.status === "done") return task.metadata?.audio_url as string;
    if (task.status === "error") throw new Error(task.error_message ?? "AI33 task falhou");
    await new Promise(r => setTimeout(r, intervalMs));
  }
  throw new Error("TTS timeout após 120s");
}

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

        const { text, voice_id, provider, language } = await req.json();

        // Validação
        if (!text || text.trim() === "") {
            return new Response(JSON.stringify({ error: "Texto não pode ser vazio" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        if (!voice_id || voice_id.trim() === "") {
            return new Response(JSON.stringify({ error: "voice_id é obrigatório" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // ── ElevenLabs TTS via AI33 (novo padrão) ────────────────────────────────
        if (!AI33_API_KEY) {
            return new Response(JSON.stringify({ error: "AI33_API_KEY não configurada" }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        try {
            // Chama ElevenLabs via AI33 para iniciar a task
            const ttsRes = await fetch(
                `https://api.ai33.pro/v1/text-to-speech/${voice_id}?output_format=mp3_44100_128`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "xi-api-key": AI33_API_KEY,
                    },
                    body: JSON.stringify({
                        text,
                        model_id: "eleven_multilingual_v2",
                        with_transcript: false,
                    }),
                }
            );

            if (!ttsRes.ok) {
                const errorText = await ttsRes.text();
                console.error(`[youtube-generate-audio] ElevenLabs error:`, ttsRes.status, errorText);
                if (ttsRes.status === 401) {
                    throw new Error("Chaves de acesso ElevenLabs revogadas ou sem créditos");
                }
                throw new Error(`ElevenLabs falhou: ${ttsRes.status}`);
            }

            const ttsData = await ttsRes.json();
            const taskId = ttsData.task_id;

            if (!taskId) {
                throw new Error("AI33 não retornou task_id");
            }

            // Faz polling até que a task esteja pronta
            const audio_url = await pollAI33Task(taskId, AI33_API_KEY);

            if (!audio_url || !audio_url.startsWith("https://")) {
                throw new Error("AI33 retornou audio_url inválida");
            }

            // Retorna como JSON com CDN URL (não blob)
            return new Response(JSON.stringify({ audio_url }), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        } catch (error) {
            const msg = error instanceof Error ? error.message : "Erro desconhecido";
            console.error("[youtube-generate-audio] ElevenLabs failed:", msg);

            // Se ElevenLabs falhar, tenta fallback Google TTS (LEGACY)
            if (GOOGLE_TTS_API_KEY) {
                console.warn("[youtube-generate-audio] Tentando fallback Google TTS");
                try {
                    const fallbackAudioUrl = await callGoogleTTSFallback(voice_id, text);
                    return new Response(JSON.stringify({ audio_url: fallbackAudioUrl }), {
                        status: 200,
                        headers: { ...corsHeaders, "Content-Type": "application/json" },
                    });
                } catch (fallbackError) {
                    const fallbackMsg = fallbackError instanceof Error ? fallbackError.message : "Unknown";
                    console.error("[youtube-generate-audio] Google TTS fallback também falhou:", fallbackMsg);
                    throw fallbackError;
                }
            }
            throw error;
        }

        // LEGACY: Google Chirp3-HD fallback (apenas se ElevenLabs falhar)
        const CHIRP_VOICE_MAP: Record<string, string> = {
            "pt-BR": "pt-BR-Chirp3-HD-Aoede",
            "en-US": "en-US-Chirp3-HD-Aoede",
            "en-GB": "en-GB-Chirp3-HD-Aoede",
            "es-ES": "es-ES-Chirp3-HD-Aoede",
            "es-US": "es-US-Chirp3-HD-Aoede",
            "de-DE": "de-DE-Chirp3-HD-Aoede",
            "fr-FR": "fr-FR-Chirp3-HD-Aoede",
            "it-IT": "it-IT-Chirp3-HD-Aoede",
            "ja-JP": "ja-JP-Chirp3-HD-Aoede",
            "ko-KR": "ko-KR-Chirp3-HD-Aoede",
            "zh-CN": "zh-CN-Chirp3-HD-Aoede",
        };

        // LEGACY: Google Chirp3 TTS fallback helper
        async function callGoogleTTSFallback(voiceIdOrLang: string, textToSpeak: string): Promise<string> {
            if (!GOOGLE_TTS_API_KEY) throw new Error("GOOGLE_TTS_API_KEY não configurada");

            // Tenta extrair idioma do voice_id (ex: "pt-BR-...") ou usa padrão
            let lang = "pt-BR";
            if (voiceIdOrLang.match(/^([a-z]{2}-[A-Z]{2})/)) {
                lang = voiceIdOrLang.match(/^([a-z]{2}-[A-Z]{2})/)![1];
            }

            const voiceName = CHIRP_VOICE_MAP[lang] ?? CHIRP_VOICE_MAP["pt-BR"];
            const languageCode = lang;

            const res = await fetch(
                `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        input: { text: textToSpeak },
                        voice: { languageCode, name: voiceName },
                        audioConfig: { audioEncoding: "MP3", speakingRate: 0.95 },
                    }),
                }
            );

            if (!res.ok) {
                const err = await res.text();
                throw new Error(`Google TTS fallback failed (${res.status}): ${err.slice(0, 200)}`);
            }

            const { audioContent } = await res.json();
            const audioBuffer = Uint8Array.from(atob(audioContent), c => c.charCodeAt(0));
            // Para fallback, precisamos retornar uma URL.
            // Como Google TTS retorna blob, criamos data URL base64
            const base64 = btoa(String.fromCharCode(...audioBuffer));
            return `data:audio/mp3;base64,${base64}`;
        }
    } catch (error) {
        console.error("[youtube-generate-audio] Error:", error);
        const msg = error instanceof Error ? error.message : "Unknown error";
        return new Response(JSON.stringify({ error: msg }), {
            status: error instanceof Error && msg.includes("timeout") ? 504 : 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
