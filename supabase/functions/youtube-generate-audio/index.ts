// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const AI33_API_KEY       = Deno.env.get("AI33_API_KEY");
const GOOGLE_TTS_API_KEY = Deno.env.get("GOOGLE_TTS_API_KEY");

/**
 * Mapeamento de vozes OpenAI → ElevenLabs equivalentes.
 * A rota OpenAI da AI33 não está disponível no plano atual.
 * Todas as chamadas são roteadas para ElevenLabs via AI33.
 */
const OPENAI_TO_ELEVENLABS_MAP: Record<string, string> = {
    "alloy":   "nPczCjzI2devNBz1zQrb", // Brian (neutro masculino)
    "echo":    "onwK4e9ZLuTAKqWW03F9", // Daniel (suave masculino)
    "fable":   "XB0fDUnXU5powFXDhCwa", // Charlotte (britânico feminino)
    "onyx":    "N2lVS1w4EtoT3dr4eOWO", // Callum (profundo masculino)
    "nova":    "EXAVITQu4vr4xnSDxMaL", // Sarah (feminino energético)
    "shimmer": "jsCqWAovK2LkecY7zXl4", // Matilda (feminino suave)
};

/**
 * Faz polling em uma task AI33 até status "done" ou timeout
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

/**
 * Gera áudio via Google TTS (fallback)
 */
async function callGoogleTTSFallback(voiceIdOrLang: string, textToSpeak: string): Promise<string> {
    if (!GOOGLE_TTS_API_KEY) throw new Error("GOOGLE_TTS_API_KEY não configurada");

    let lang = "pt-BR";
    const langMatch = voiceIdOrLang.match(/^([a-z]{2}-[A-Z]{2})/);
    if (langMatch) lang = langMatch[1];

    const CHIRP_VOICE_MAP: Record<string, string> = {
        "pt-BR": "pt-BR-Chirp3-HD-Aoede",
        "en-US": "en-US-Chirp3-HD-Aoede",
    };

    const voiceName = CHIRP_VOICE_MAP[lang] ?? CHIRP_VOICE_MAP["pt-BR"];
    const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            input: { text: textToSpeak },
            voice: { languageCode: lang, name: voiceName },
            audioConfig: { audioEncoding: "MP3", speakingRate: 0.95 },
        }),
    });
    if (!res.ok) throw new Error(`Google TTS fallback failed: ${res.status}`);
    const { audioContent } = await res.json();
    return `data:audio/mp3;base64,${audioContent}`;
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // JWT já foi validado pelo gateway Supabase (verify_jwt: true)
        const { text, voice_id, provider, model_id } = await req.json();

        if (!text?.trim()) throw new Error("Texto não pode ser vazio");
        if (!voice_id?.trim()) throw new Error("voice_id é obrigatório");
        if (!AI33_API_KEY) throw new Error("AI33_API_KEY não configurada");

        // ── Roteamento ──────────────────────────────────────────────────────

        // 1. Google TTS
        if (provider === "google_chirp" || provider === "google") {
            const audio_url = await callGoogleTTSFallback(voice_id, text);
            return new Response(JSON.stringify({ audio_url }), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // 2. ElevenLabs via AI33 (único TTS disponível no plano atual)
        // Se voz OpenAI for passada, mapeia automaticamente para equivalente ElevenLabs
        const isOpenAIVoice = voice_id.toLowerCase() in OPENAI_TO_ELEVENLABS_MAP;
        const resolvedVoiceId = isOpenAIVoice
            ? OPENAI_TO_ELEVENLABS_MAP[voice_id.toLowerCase()]
            : voice_id;

        if (isOpenAIVoice) {
            console.log(`[youtube-generate-audio] Voz OpenAI "${voice_id}" mapeada para ElevenLabs "${resolvedVoiceId}"`);
        }

        console.log(`[youtube-generate-audio] ElevenLabs via AI33 (Voice: ${resolvedVoiceId})`);

        const ttsRes = await fetch(
            `https://api.ai33.pro/v1/text-to-speech/${resolvedVoiceId}?output_format=mp3_44100_128`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "xi-api-key": AI33_API_KEY,
                },
                body: JSON.stringify({
                    text: text.trim(),
                    model_id: model_id || "eleven_multilingual_v2",
                    with_transcript: false,
                }),
            }
        );

        const ttsData = await ttsRes.json();
        if (!ttsRes.ok) throw new Error(ttsData.detail || ttsData.error || `ElevenLabs falhou: ${ttsRes.status}`);

        const taskId = ttsData.task_id;
        if (!taskId) throw new Error("AI33 não retornou task_id");

        const audio_url = await pollAI33Task(taskId, AI33_API_KEY);
        return new Response(JSON.stringify({ audio_url }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("[youtube-generate-audio] Error:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
