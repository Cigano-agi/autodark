import { TTSRequest, TTSResponse } from "@/types/tts";

/**
 * ElevenLabs TTS via Edge Function youtube-generate-audio
 * Retorna uma URL permanente (CDN ou data URL)
 */
export async function generateTTSAudio(text: string, voiceId: string): Promise<string> {
  // Valida entrada
  if (!text || !text.trim()) {
    throw new Error("Texto não pode ser vazio");
  }
  if (!voiceId || !voiceId.trim()) {
    throw new Error("voice_id é obrigatório");
  }

  try {
    // Chama Edge Function ElevenLabs
    const payload: TTSRequest = { text: text.trim(), voice_id: voiceId };
    const res = await fetch("/.netlify/functions/youtube-generate-audio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || `Falha na geração de áudio: ${res.status}`);
    }

    const data = (await res.json()) as TTSResponse;
    if (!data.audio_url) {
      throw new Error("Edge Function não retornou audio_url");
    }

    return data.audio_url;
  } catch (err) {
    console.error("[tts] ElevenLabs falhou:", err);
    throw err;
  }
}


/** Gera WAV silencioso com duração exata — garante sincronismo de slides no Remotion */
export function generateSilentAudio(durationSec: number): string {
  const sampleRate = 22050;
  const numSamples = Math.floor(sampleRate * Math.max(1, durationSec));
  const buf = new ArrayBuffer(44 + numSamples * 2);
  const v = new DataView(buf);
  const write = (off: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); };
  write(0, 'RIFF'); v.setUint32(4, 36 + numSamples * 2, true);
  write(8, 'WAVE'); write(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  write(36, 'data'); v.setUint32(40, numSamples * 2, true);
  // bytes 44+ são zeros = silêncio
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

/**
 * Estima duração em segundos baseado no texto (PT-BR: ~150 palavras/min = 2.5 palavras/seg).
 */
export function estimateDurationSec(text: string): number {
  const wordCount = text.trim().split(/\s+/).length;
  return Math.max(3, Math.ceil(wordCount / 2.5));
}

/**
 * Extrai keywords de um prompt visual para uso no Unsplash Source.
 * Retorna string "keyword1,keyword2,keyword3" (max 5 keywords).
 */
export function extractUnsplashKeywords(prompt: string): string {
  const DARK_KEYWORD_MAP: Record<string, string> = {
    haunted: "haunted",
    mansion: "mansion",
    ghost: "ghost",
    spirit: "spirit",
    blood: "dark",
    gore: "horror",
    murder: "mystery",
    death: "night",
    forest: "forest",
    ancient: "ancient",
    ritual: "mystery",
    cult: "dark",
    demon: "horror",
    monster: "horror",
    vampire: "gothic",
    werewolf: "forest",
    cemetery: "cemetery",
    graveyard: "cemetery",
    abandoned: "abandoned",
    ruins: "ruins",
    castle: "castle",
    secret: "mystery",
    forbidden: "mystery",
    underground: "underground",
    cave: "cave",
    ocean: "ocean",
    ship: "ship",
    storm: "storm",
    lightning: "lightning",
    fog: "fog",
    mist: "mist",
    fire: "fire",
    dark: "dark",
    night: "night",
    shadow: "shadow",
    skull: "gothic",
  };

  const words = prompt.toLowerCase().split(/[\s,./]+/);
  const keywords = new Set<string>();

  for (const word of words) {
    if (DARK_KEYWORD_MAP[word]) {
      keywords.add(DARK_KEYWORD_MAP[word]);
    }
    if (keywords.size >= 4) break;
  }

  // Sempre inclui "dark" e "night" para manter estética do canal
  keywords.add("dark");
  keywords.add("night");

  return Array.from(keywords).slice(0, 5).join(",");
}
