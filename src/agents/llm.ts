import { supabase } from "@/integrations/supabase/client";

/**
 * Shared LLM and image generation helpers.
 * Calls Supabase Edge Functions with multi-layer fallback.
 */

export async function callClaude(systemPrompt: string, userPrompt: string, requireJson = false): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke("chat-completions", {
      body: { systemPrompt, userPrompt, requireJson, temperature: 0.7 }
    });
    if (!error && data?.content) return data.content;
  } catch {
    // Edge Function indisponível, tentando fallback
  }

  try {
    const fullPrompt = `${systemPrompt}\n\nUser Request: ${userPrompt}\n\nIMPORTANT: Return ONLY the raw content or valid JSON as requested. No talk.`;
    const res = await fetch(`https://text.pollinations.ai/${encodeURIComponent(fullPrompt)}?model=openai&json=${requireJson}`);
    if (res.ok) {
      const text = await res.text();
      return text;
    }
  } catch (e) {
    console.error("[autodark] Pollinations.ai indisponível:", e);
  }

  throw new Error("Todos os provedores de IA falharam. Verifique a conectividade.");
}

export async function callImageGeneration(prompt: string): Promise<string> {
  try {
    const { data: submitData, error: submitError } = await supabase.functions.invoke("generate-kie-flow", {
      body: { action: "generate", prompt, aspectRatio: "16:9" }
    });
    if (!submitError && submitData?.taskId) {
      const taskId = submitData.taskId;
      const start = Date.now();
      while (Date.now() - start < 150_000) {
        await new Promise(r => setTimeout(r, 5000));
        const { data: pollData } = await supabase.functions.invoke("generate-kie-flow", {
          body: { action: "poll", taskId }
        });
        const result = pollData?.data;
        if (result?.successFlag === 1 && result.response?.resultImageUrl) return result.response.resultImageUrl;
        if (result?.errorCode) break;
      }
    }
  } catch {
    // Kie.ai indisponível, tentando fallback
  }

  try {
    const seed = Math.floor(Math.random() * 999999);
    const encoded = encodeURIComponent(prompt.slice(0, 400));
    const url = `https://image.pollinations.ai/prompt/${encoded}?width=1280&height=720&seed=${seed}&nologo=true`;
    const res = await fetch(url);
    if (res.ok) {
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    }
  } catch (e) {
    console.error("[autodark] Pollinations (imagem) indisponível:", e);
  }

  return generateCanvasDarkImage(prompt);
}

function generateCanvasDarkImage(prompt: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1280; canvas.height = 720;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#050508'; ctx.fillRect(0, 0, 1280, 720);
  ctx.fillStyle = '#ff8c00'; ctx.font = 'bold 32px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText("AutoDark Engine", 640, 300);
  ctx.fillStyle = '#ffffff'; ctx.font = '20px sans-serif';
  ctx.fillText(prompt.slice(0, 60) + "...", 640, 380);
  return canvas.toDataURL('image/jpeg');
}

export async function callTTS(text: string, voice: string = "ai33", voiceId: string = "onyx"): Promise<{ blob: Blob; durationSec: number }> {
  try {
    const { data, error } = await supabase.functions.invoke("youtube-generate-audio", {
      body: { text, voice: voiceId, provider: voice === "google" ? "google" : "ai33" }
    });
    if (!error && data) {
      const blob = data instanceof Blob ? data : new Blob([data], { type: "audio/mpeg" });
      const durationSec = await getAudioDuration(blob);
      return { blob, durationSec };
    }
  } catch {
    // TTS Edge indisponível, usando estimativa de duração por caracteres
  }

  return { blob: new Blob(), durationSec: Math.ceil(text.length / 15) };
}

async function getAudioDuration(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio(URL.createObjectURL(blob));
    audio.addEventListener("loadedmetadata", () => resolve(audio.duration || 5));
    setTimeout(() => resolve(5), 2000);
  });
}

export function extractJson(text: string): Record<string, any> {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return JSON.parse(text);
    return JSON.parse(match[0]);
  } catch (e) {
    console.error("[autodark] Falha ao parsear JSON:", text.slice(0, 200));
    throw e;
  }
}

export function stripMarkdown(text: string): string {
  return text.replace(/^#{1,6}\s+/gm, "").replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1").trim();
}
