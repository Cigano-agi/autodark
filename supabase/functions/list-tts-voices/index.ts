const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TTSVoice {
  voice_id: string;
  name: string;
  gender: "Female" | "Male";
  language: string;
  sample_audio_url?: string;
}

interface TTSVoiceListResponse {
  voices: TTSVoice[];
}

// Vozes default em Português para garantir variedade
const DEFAULT_PT_VOICES: TTSVoice[] = [
  {
    voice_id: "sarah",
    name: "Sarah (Feminino Suave)",
    gender: "Female",
    language: "pt",
  },
  {
    voice_id: "laura",
    name: "Laura (Feminino Claro)",
    gender: "Female",
    language: "pt",
  },
  {
    voice_id: "antonio",
    name: "Antônio (Masculino Grave)",
    gender: "Male",
    language: "pt",
  },
  {
    voice_id: "paulo",
    name: "Paulo (Masculino Neutro)",
    gender: "Male",
    language: "pt",
  },
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const AI33_API_KEY = Deno.env.get("AI33_API_KEY");

    if (!AI33_API_KEY) {
      return new Response(JSON.stringify({ error: "AI33_API_KEY não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { language } = (await req.json()) as { language?: string };

    // Busca vozes do catálogo ElevenLabs via AI33
    const voicesRes = await fetch("https://api.ai33.pro/v2/voices", {
      method: "GET",
      headers: { "xi-api-key": AI33_API_KEY },
    });

    if (!voicesRes.ok) {
      const errorText = await voicesRes.text();
      console.error(`[list-tts-voices] AI33 error:`, voicesRes.status, errorText);
      return new Response(
        JSON.stringify({ error: `Falha ao buscar vozes: ${voicesRes.status}` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await voicesRes.json() as Record<string, unknown>;
    const allVoices = Array.isArray(data.voices) ? data.voices : [];

    // Filtra por idioma se especificado
    let filtered = allVoices as TTSVoice[];
    if (language) {
      const langLower = language.toLowerCase();
      filtered = allVoices.filter((v: unknown) => {
        const voice = v as Record<string, unknown>;
        const voiceLang = String(voice.language || "").toLowerCase();
        const voiceName = String(voice.name || "").toLowerCase();
        return voiceLang.startsWith(langLower) || voiceName.includes(langLower);
      }) as TTSVoice[];

      // Se não houver muitas vozes em PT, use vozes default
      if (langLower === "pt" && filtered.length < 3) {
        filtered = DEFAULT_PT_VOICES;
      }
    } else {
      // Se nenhum idioma especificado, use vozes PT default
      filtered = DEFAULT_PT_VOICES;
    }

    const mappedVoices = filtered.map((v: unknown) => {
      const voice = v as Record<string, unknown>;
      return {
        voice_id: String(voice.voice_id || ""),
        name: String(voice.name || ""),
        gender: String(voice.gender || "Female") as "Female" | "Male",
        language: String(voice.language || "pt"),
        sample_audio_url: voice.sample_audio_url || voice.preview_url ? String(voice.sample_audio_url || voice.preview_url) : undefined,
      };
    });

    const response: TTSVoiceListResponse = {
      voices: mappedVoices,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[list-tts-voices] Error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno ao listar vozes" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
