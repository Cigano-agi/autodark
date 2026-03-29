import { supabase } from "@/integrations/supabase/client";

/**
 * Shared LLM and image generation helpers.
 * Calls Supabase Edge Functions instead of direct APIs to keep keys secure server-side.
 */

export async function callClaude(systemPrompt: string, userPrompt: string, requireJson = false): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke("chat-completions", {
      body: { systemPrompt, userPrompt, requireJson, temperature: 0.7 }
    });
    if (error) throw error;
    return data.content || "";
  } catch (err: unknown) {
    console.error("[autodark] callClaude failed:", err);
    throw err;
  }
}

export async function callOpenRouter(systemPrompt: string, userPrompt: string, requireJson = false): Promise<string> {
  // Edge Function chat-completions should handle fallbacks
  return callClaude(systemPrompt, userPrompt, requireJson);
}

export async function callKieImage(prompt: string): Promise<string> {
  const { data: submitData, error: submitError } = await supabase.functions.invoke("generate-kie-flow", {
    body: { action: "generate", prompt, aspectRatio: "16:9" }
  });
  if (submitError) throw submitError;
  const taskId = submitData?.taskId;
  if (!taskId) throw new Error("Kie.ai: no taskId returned from edge function");

  const start = Date.now();
  while (Date.now() - start < 200_000) {
    await new Promise(r => setTimeout(r, 5_000));
    const { data: pollData, error: pollError } = await supabase.functions.invoke("generate-kie-flow", {
      body: { action: "poll", taskId }
    });
    if (pollError) continue;
    const result = pollData?.data;
    if (!result) continue;
    if (result.successFlag === 1 && result.response?.resultImageUrl) return result.response.resultImageUrl;
    if (result.errorCode) throw new Error(`Kie.ai failed: ${result.errorMessage || result.errorCode}`);
  }
  throw new Error("Kie.ai: timeout");
}

export async function callAI33Image(prompt: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("generate-image", {
    body: { prompt }
  });
  if (error) throw error;
  if (!data?.url) throw new Error("AI33: no image URL returned");
  return data.url as string;
}

export async function callImageGeneration(prompt: string): Promise<string> {
  // 1. Kie.ai (best quality)
  try {
    return await callKieImage(prompt);
  } catch (e) {
    console.warn("[autodark] Kie.ai failed:", e instanceof Error ? e.message : e);
  }
  // 2. AI33 DALL-E 3 (server-side, same chain as b44b45b Cigano commit)
  try {
    return await callAI33Image(prompt);
  } catch (e) {
    console.warn("[autodark] AI33 image failed:", e instanceof Error ? e.message : e);
  }
  // 3. Pollinations.ai — free, no API key
  return callPollinationsImage(prompt);
}

export async function callUnsplashImage(keywords: string): Promise<string> {
  // Picsum.photos — ultra-confiável, sem auth, seed único por cena = imagem diferente sempre
  const seed = Math.floor(Math.random() * 9999) + 1;
  const url = `https://picsum.photos/seed/${seed}/1280/720`;
  const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`Picsum ${res.status}`);
  const blob = await res.blob();
  if (blob.size < 5000) throw new Error("Picsum retornou blob vazio");
  return URL.createObjectURL(blob);
}

export async function callPollinationsImage(prompt: string): Promise<string> {
  const encoded = encodeURIComponent(prompt.slice(0, 400));
  const seed = Math.floor(Math.random() * 999999);
  // Use new Pollinations API endpoint (gen.pollinations.ai/image)
  const url = `https://gen.pollinations.ai/image/${encoded}?width=1280&height=720&seed=${seed}&nologo=true&model=flux`;

  // Tenta até 3 vezes com backoff generoso (imagens AI demoram)
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (res.ok) {
        const blob = await res.blob();
        if (blob.size > 1000) return URL.createObjectURL(blob);
      }
      if (res.status === 429 && attempt < 3) {
        await new Promise(r => setTimeout(r, 3000 * attempt));
        continue;
      }
    } catch {
      if (attempt < 3) {
        await new Promise(r => setTimeout(r, 2000 * attempt));
        continue;
      }
    }
  }
  // Fallback: gera imagem dark cinematográfica via Canvas (100% offline)
  return generateCanvasDarkImage(prompt);
}

/** Gera background dark cinematográfico via Canvas — sem API, sempre funciona */
function generateCanvasDarkImage(prompt: string): string {
  const W = 1280, H = 720;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Paleta baseada em keywords do prompt
  const isBlood = /blood|gore|kill|murder|death/i.test(prompt);
  const isMystery = /mystery|secret|unknown|ancient|forbidden/i.test(prompt);
  const isHaunted = /ghost|haunted|spirit|phantom|mansion|aband/i.test(prompt);

  const c1 = isBlood ? '#1a0000' : isMystery ? '#00001a' : '#050508';
  const c2 = isBlood ? '#3d0000' : isMystery ? '#0a0030' : '#0d0d15';
  const accent = isBlood ? '#8b0000' : isMystery ? '#1a006b' : isHaunted ? '#1a1a3e' : '#111122';

  // Fundo gradiente
  const grad = ctx.createRadialGradient(W * 0.5, H * 0.4, 0, W * 0.5, H * 0.4, W * 0.75);
  grad.addColorStop(0, accent);
  grad.addColorStop(0.6, c2);
  grad.addColorStop(1, c1);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Vinheta pesada nas bordas
  const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, W * 0.8);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.85)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  // Partículas/estrelas atmosféricas
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  for (let i = 0; i < 80; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H * 0.7;
    const r = Math.random() * 1.2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Barras cinematográficas (letterbox)
  ctx.fillStyle = 'rgba(0,0,0,0.9)';
  ctx.fillRect(0, 0, W, 60);
  ctx.fillRect(0, H - 60, W, 60);

  // Texto do prompt (limitado, estilo legenda)
  const shortText = prompt.replace(/Style:.*$/i, '').trim().slice(0, 80);
  ctx.font = 'italic 18px Georgia, serif';
  ctx.fillStyle = 'rgba(200,180,150,0.7)';
  ctx.textAlign = 'center';
  ctx.fillText(shortText, W / 2, H - 25);

  return canvas.toDataURL('image/jpeg', 0.85);
}

export function extractJson(text: string): Record<string, unknown> {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("JSON não encontrado na resposta");
  return JSON.parse(match[0]);
}

export function stripMarkdown(text: string): string {
  return text.replace(/^#{1,6}\s+/gm, "").replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1")
    .replace(/~~(.+?)~~/g, "$1").replace(/`(.+?)`/g, "$1").replace(/^[-*_]{3,}\s*$/gm, "")
    .replace(/^[-*+]\s+/gm, "").replace(/^\d+\.\s+/gm, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\n{3,}/g, "\n\n").trim();
}

export async function callTTS(text: string, voice: string, voiceId: string): Promise<{ blob: Blob; durationSec: number }> {
  if (voice === "browser") {
    // Estimate duration for browser TTS (~15 chars/sec)
    return { blob: new Blob(), durationSec: Math.ceil(text.length / 15) };
  }

  const { data, error } = await supabase.functions.invoke("youtube-generate-audio", {
    body: { text, voice: voiceId, provider: voice === "google" || voice === "google_chirp" ? "google" : "ai33" }
  });

  if (error) throw error;
  if (!data) throw new Error("TTS edge function returned no data");

  // Supabase client automatically converts audio response to Blob
  const blob = data instanceof Blob ? data : new Blob([data], { type: "audio/mpeg" });
  const durationSec = await getAudioDuration(blob);
  return { blob, durationSec };
}

async function getAudioDuration(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio(URL.createObjectURL(blob));
    audio.addEventListener("loadedmetadata", () => resolve(audio.duration));
  });
}
