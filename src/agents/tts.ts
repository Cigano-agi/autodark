/**
 * TTS via Web Speech API (browser nativo, gratuito, zero dependência).
 * Fallback: Google Translate TTS endpoint (sem API key).
 */

/**
 * Captura speechSynthesis em um blob de áudio usando AudioContext + MediaRecorder.
 * Retorna um blob URL usável como <Audio src={...}> no Remotion.
 */
export async function generateTTSAudio(text: string): Promise<string> {
  // 1. StreamElements TTS — gratuito, sem key, voz pt-BR "Vitoria" (Amazon Polly)
  try {
    return await fetchStreamElementsTTS(text);
  } catch (err) {
    console.warn("[tts] StreamElements falhou:", err);
  }

  // 2. Google Translate TTS via proxy Vite
  try {
    return await fetchGoogleTTS(text);
  } catch (err) {
    console.warn("[tts] Google TTS falhou:", err);
  }

  // 3. Sem áudio — timing vem do durationSec, narração via Web Speech overlay
  return "";
}

/** StreamElements TTS — gratuito, sem auth, voz Vitoria (pt-BR) */
async function fetchStreamElementsTTS(text: string): Promise<string> {
  const chunks = splitIntoChunks(text, 200);
  const blobs: Blob[] = [];

  for (const chunk of chunks) {
    const encoded = encodeURIComponent(chunk);
    // Vitoria = pt-BR (Amazon Polly), Filipa = pt-PT
    const isDevMode = ["localhost", "127.0.0.1"].includes(window.location.hostname);
    const base = isDevMode ? `/api-streamelements` : `https://api.streamelements.com`;
    const url = `${base}/kappa/v2/speech?voice=Vitoria&text=${encoded}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`StreamElements TTS ${res.status}`);
    const blob = await res.blob();
    if (blob.size < 500) throw new Error("StreamElements retornou blob vazio");
    blobs.push(blob);
  }

  const merged = new Blob(blobs, { type: "audio/mpeg" });
  return URL.createObjectURL(merged);
}

async function captureWebSpeechAudio(text: string): Promise<string> {
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new AudioCtx();
  const dest = audioCtx.createMediaStreamDestination();

  // MediaRecorder captura o stream de saída do contexto de áudio
  const recorder = new MediaRecorder(dest.stream, { mimeType: getSupportedMimeType() });
  const chunks: BlobPart[] = [];

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  return new Promise<string>((resolve, reject) => {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "pt-BR";
    utter.rate = 0.95;
    utter.pitch = 1.0;

    // Seleciona voz pt-BR se disponível
    const voices = window.speechSynthesis.getVoices();
    const ptVoice = voices.find((v) => v.lang.startsWith("pt"));
    if (ptVoice) utter.voice = ptVoice;

    utter.onstart = () => recorder.start(100);

    utter.onend = () => {
      recorder.stop();
      audioCtx.close();
    };

    utter.onerror = (e) => {
      audioCtx.close();
      reject(new Error(`SpeechSynthesis error: ${e.error}`));
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: recorder.mimeType });
      if (blob.size < 100) {
        // Blob vazio — captura falhou (browser não roteia audio do speechSynthesis para AudioContext)
        reject(new Error("Blob de áudio vazio — fallback necessário"));
        return;
      }
      resolve(URL.createObjectURL(blob));
    };

    window.speechSynthesis.speak(utter);
  });
}

/**
 * Google Translate TTS — sem autenticação, CORS ok via proxy no dev.
 * Produção: requisição direta funciona como redirect para CDN do Google.
 */
async function fetchGoogleTTS(text: string): Promise<string> {
  // Divide texto longo em chunks de 200 chars (limite da API)
  const chunks = splitIntoChunks(text, 200);
  const blobs: Blob[] = [];

  for (const chunk of chunks) {
    const encoded = encodeURIComponent(chunk);
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=pt&client=tw-ob`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) throw new Error(`Google TTS falhou: ${res.status}`);
    blobs.push(await res.blob());
  }

  const merged = new Blob(blobs, { type: "audio/mpeg" });
  return URL.createObjectURL(merged);
}

function splitIntoChunks(text: string, maxLen: number): string[] {
  const words = text.split(" ");
  const chunks: string[] = [];
  let current = "";

  for (const word of words) {
    if ((current + " " + word).trim().length > maxLen) {
      if (current) chunks.push(current.trim());
      current = word;
    } else {
      current = (current + " " + word).trim();
    }
  }
  if (current) chunks.push(current.trim());
  return chunks;
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

function getSupportedMimeType(): string {
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/ogg"];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? "audio/webm";
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
