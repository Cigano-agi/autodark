import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") || "http://localhost:5173";

const corsHeaders = {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI33_API_KEY = Deno.env.get("AI33_API_KEY");
if (!AI33_API_KEY) throw new Error("AI33_API_KEY não configurado nas variáveis de ambiente");
const AI33_TTS_URL = "https://api.ai33.pro/v1/audio/speech";
const AI33_WHISPER_URL = "https://api.ai33.pro/v1/audio/transcriptions";

// Phoneme dictionary for PT-BR TTS
const phonemeDict: Record<string, { ipa: string }> = {
    "Moisés": { ipa: "mo.iˈzɛjs" },
    "Abraão": { ipa: "abɾaˈɑ̃w̃" },
    "Isaías": { ipa: "izaˈi.as" },
    "Noé": { ipa: "noˈɛ" },
    "Jesus": { ipa: "ʒeˈzus" },
    "Eliseu": { ipa: "e.liˈzew" },
    "Ezequiel": { ipa: "e.ze.kiˈɛw" },
    "Naamã": { ipa: "na.aˈmɑ̃" },
};

function applyPhonemes(text: string): string {
    for (const word in phonemeDict) {
        const { ipa } = phonemeDict[word];
        const regex = new RegExp(`\\b${word}\\b`, "g");
        text = text.replace(regex, `<phoneme alphabet="ipa" ph="${ipa}">${word}</phoneme>`);
    }
    return text;
}

function textToSSML(rawText: string): string {
    let text = rawText
        .replace(/["']/g, "")
        .replace(/\n+/g, " ")
        .trim();

    text = applyPhonemes(text);

    const sentences = text
        .split(/(?<=[.!?])\s+(?=[A-ZÀ-Ú])/)
        .filter(s => s.trim() !== "");

    let ssmlText = "";
    if (sentences.length > 1) {
        const lastSentence = sentences.pop()!.trim();
        const body = sentences
            .map(s => `${s.trim()}<break time="300ms"/>`)
            .join(" ");
        ssmlText = `${body} <break time="300ms"/> ${lastSentence}`;
    } else {
        ssmlText = text.endsWith(".") ? text : text + ".";
    }

    return `<speak>${ssmlText}</speak>`;
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

        const supabaseClient = createClient(
            supabaseUrl,
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            {
                global: {
                    headers: { Authorization: req.headers.get("Authorization")! },
                },
            }
        );

        // Service role client for Storage operations
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error("Unauthorized");

        const { contentId } = await req.json();
        if (!contentId) throw new Error("contentId is required");

        const { data: content, error: contentError } = await supabaseClient
            .from("channel_contents")
            .select("*")
            .eq("id", contentId)
            .single();

        if (contentError || !content) throw new Error("Content not found");
        if (!content.script) throw new Error("Content has no script. Generate a script first.");

        const { data: blueprint } = await supabaseClient
            .from("channel_blueprints")
            .select("voice_id, voice_name")
            .eq("channel_id", content.channel_id)
            .maybeSingle();

        const voice = blueprint?.voice_id || "onyx";

        // STEP 1: Update status to processing
        await supabaseClient
            .from("channel_contents")
            .update({ status: "tts_processing", updated_at: new Date().toISOString() })
            .eq("id", contentId);

        // STEP 2: Generate SSML (saves to cache)
        const ssml = textToSSML(content.script);
        await supabaseClient
            .from("channel_contents")
            .update({ ssml_cache: ssml })
            .eq("id", contentId);

        // STEP 3: Generate TTS audio via ai33.pro
        const ttsResponse = await fetch(AI33_TTS_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${AI33_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "tts-1",
                input: content.script,
                voice: voice,
                response_format: "mp3",
            }),
        });

        if (!ttsResponse.ok) {
            const errorText = await ttsResponse.text();
            console.error("TTS Error:", errorText);
            await supabaseClient
                .from("channel_contents")
                .update({ status: "tts_failed", error_log: `TTS Error: ${errorText}`, updated_at: new Date().toISOString() })
                .eq("id", contentId);
            throw new Error(`TTS generation failed: ${ttsResponse.statusText}`);
        }

        const audioBuffer = await ttsResponse.arrayBuffer();
        const audioUint8 = new Uint8Array(audioBuffer);

        // STEP 4: Upload audio to Storage
        const nichoSlug = content.nicho_slug || "geral";
        const audioPath = `${content.channel_id}/${nichoSlug}/audios/audio_${contentId}.mp3`;

        const { error: uploadError } = await supabaseAdmin.storage
            .from("content-media")
            .upload(audioPath, audioUint8, {
                contentType: "audio/mpeg",
                upsert: true,
            });

        if (uploadError) {
            console.error("Storage upload error:", uploadError);
            await supabaseClient
                .from("channel_contents")
                .update({ status: "audio_storage_failed", error_log: `Storage Error: ${uploadError.message}`, updated_at: new Date().toISOString() })
                .eq("id", contentId);
            throw new Error(`Audio upload failed: ${uploadError.message}`);
        }

        // STEP 5: Generate subtitle via Whisper
        let subtitlePath: string | null = null;
        try {
            const formData = new FormData();
            const audioBlob = new Blob([audioUint8], { type: "audio/mpeg" });
            formData.append("file", audioBlob, `audio_${contentId}.mp3`);
            formData.append("model", "whisper-1");
            formData.append("response_format", "srt");

            const whisperResponse = await fetch(AI33_WHISPER_URL, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${AI33_API_KEY}`,
                },
                body: formData,
            });

            if (whisperResponse.ok) {
                const srtContent = await whisperResponse.text();
                subtitlePath = `${content.channel_id}/${nichoSlug}/legendas/legenda_${contentId}.srt`;

                const srtUint8 = new TextEncoder().encode(srtContent);
                await supabaseAdmin.storage
                    .from("content-media")
                    .upload(subtitlePath, srtUint8, {
                        contentType: "text/plain",
                        upsert: true,
                    });
            } else {
                console.error("Whisper failed, continuing without subtitles");
            }
        } catch (whisperError) {
            console.error("Whisper error (non-blocking):", whisperError);
        }

        // STEP 6: Calculate rough audio duration
        const estimatedDuration = parseFloat((audioUint8.length / 16000).toFixed(3));

        // STEP 7: Update content with all paths
        const { data: finalContent, error: finalError } = await supabaseClient
            .from("channel_contents")
            .update({
                status: "tts_done",
                audio_path: audioPath,
                subtitle_path: subtitlePath,
                audio_duration: estimatedDuration,
                error_log: null,
                updated_at: new Date().toISOString(),
            })
            .eq("id", contentId)
            .select()
            .single();

        if (finalError) throw new Error(`Failed to update content: ${finalError.message}`);

        const { data: publicUrl } = supabaseAdmin.storage
            .from("content-media")
            .getPublicUrl(audioPath);

        return new Response(JSON.stringify({
            success: true,
            content: finalContent,
            audioUrl: publicUrl?.publicUrl,
            estimatedDuration,
            hasSubtitle: !!subtitlePath,
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Error in process-content-audio:", error);
        return new Response(JSON.stringify({
            error: error instanceof Error ? error.message : "Unknown error",
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
