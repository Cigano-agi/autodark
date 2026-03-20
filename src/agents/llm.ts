/**
 * Shared LLM and image generation helpers.
 * Extracted from Production/Index.tsx so both the wizard and agents can use them.
 */

const AI33_API_KEY = (import.meta.env.VITE_AI33_API_KEY as string | undefined)?.replace(/['"]/g, '').trim();
const OPENROUTER_API_KEY = (import.meta.env.VITE_OPENROUTER_API_KEY as string | undefined)?.replace(/['"]/g, '').trim();
const KIE_API_KEY = (import.meta.env.VITE_KIE_API_KEY as string | undefined)?.replace(/['"]/g, '').trim();

function isDev(): boolean {
  return ["localhost", "127.0.0.1"].includes(window.location.hostname) ||
    window.location.hostname.startsWith("192.168.") ||
    window.location.hostname.startsWith("10.");
}

export async function callClaude(systemPrompt: string, userPrompt: string, requireJson = false): Promise<string> {
  try {
    const url = isDev() ? "/api-ai/v1/chat/completions" : "https://api.ai33.pro/v1/chat/completions";
    if (!AI33_API_KEY) throw new Error("AI33_API_KEY missing");
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${AI33_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        temperature: 0.7,
        ...(requireJson ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    if (res.ok) return (await res.json()).choices?.[0]?.message?.content || "";
    if (res.status === 401 && OPENROUTER_API_KEY) return callOpenRouter(systemPrompt, userPrompt, requireJson);
    throw new Error(`AI33 ${res.status}: ${(await res.text()).slice(0, 100)}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (OPENROUTER_API_KEY && msg.includes("AI33")) return callOpenRouter(systemPrompt, userPrompt, requireJson);
    throw err;
  }
}

export async function callOpenRouter(systemPrompt: string, userPrompt: string, requireJson = false): Promise<string> {
  // Try paid model first, fall back to free tier model
  const models = OPENROUTER_API_KEY
    ? ["openai/gpt-4o-mini", "mistralai/mistral-7b-instruct:free"]
    : ["mistralai/mistral-7b-instruct:free", "google/gemma-3-4b-it:free"];

  for (const model of models) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENROUTER_API_KEY || "sk-or-free"}`,
          "HTTP-Referer": window.location.origin,
          "X-Title": "AutoDark Production",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
          ...(requireJson ? { response_format: { type: "json_object" } } : {}),
        }),
      });
      if (res.ok) return (await res.json()).choices?.[0]?.message?.content || "";
    } catch { continue; }
  }
  throw new Error("Todos os modelos OpenRouter falharam");
}

export async function callKieImage(prompt: string): Promise<string> {
  if (!KIE_API_KEY) throw new Error("KIE_API_KEY missing");
  const baseUrl = isDev() ? "/api-kie" : "https://api.kie.ai";
  const submitRes = await fetch(`${baseUrl}/api/v1/flux/kontext/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${KIE_API_KEY}` },
    body: JSON.stringify({ prompt, aspectRatio: "16:9", outputFormat: "jpeg", model: "flux-kontext-pro", enableTranslation: true }),
  });
  if (!submitRes.ok) throw new Error(`Kie.ai submit failed (${submitRes.status})`);
  const taskId = (await submitRes.json())?.data?.taskId;
  if (!taskId) throw new Error("Kie.ai: no taskId returned");

  const start = Date.now();
  while (Date.now() - start < 200_000) {
    await new Promise(r => setTimeout(r, 5_000));
    const pollRes = await fetch(`${baseUrl}/api/v1/flux/kontext/record-info?taskId=${taskId}`, {
      headers: { "Authorization": `Bearer ${KIE_API_KEY}` },
    });
    if (!pollRes.ok) continue;
    const data = (await pollRes.json())?.data;
    if (!data) continue;
    if (data.successFlag === 1 && data.response?.resultImageUrl) return data.response.resultImageUrl;
    if (data.errorCode) throw new Error(`Kie.ai failed: ${data.errorMessage || data.errorCode}`);
  }
  throw new Error("Kie.ai: timeout");
}

export async function callImageGeneration(prompt: string): Promise<string> {
  if (KIE_API_KEY) {
    try { return await callKieImage(prompt); }
    catch (e) { console.warn("[autodark] Kie.ai failed:", e instanceof Error ? e.message : e); }
  }
  if (AI33_API_KEY) {
    try {
      const url = isDev() ? "/api-ai/v1/images/generations" : "https://api.ai33.pro/v1/images/generations";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${AI33_API_KEY}` },
        body: JSON.stringify({ model: "dall-e-3", prompt, size: "1792x1024", quality: "standard", n: 1 }),
      });
      if (res.ok) return (await res.json()).data[0].url as string;
    } catch { }
  }
  // Fallback: Pollinations.ai — 100% free, no API key needed
  return callPollinationsImage(prompt);
}

export async function callPollinationsImage(prompt: string): Promise<string> {
  const encoded = encodeURIComponent(prompt.slice(0, 500));
  const seed = Math.floor(Math.random() * 999999);
  const url = `https://image.pollinations.ai/prompt/${encoded}?width=1280&height=720&seed=${seed}&nologo=true&enhance=true`;
  // Pollinations returns the image directly at the URL — just verify it loads
  const res = await fetch(url);
  if (!res.ok) throw new Error("Pollinations.ai falhou");
  const blob = await res.blob();
  return URL.createObjectURL(blob);
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

  if (!AI33_API_KEY) throw new Error("AI33_API_KEY missing for TTS");

  const url = isDev() ? "/api-ai/v1/audio/speech" : "https://api.ai33.pro/v1/audio/speech";
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${AI33_API_KEY}` },
    body: JSON.stringify({ model: "tts-1", input: text, voice: voiceId || "alloy", response_format: "mp3" }),
  });
  if (!res.ok) throw new Error(`TTS failed: ${res.status}`);
  const blob = await res.blob();
  const durationSec = await getAudioDuration(blob);
  return { blob, durationSec };
}

async function getAudioDuration(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio(URL.createObjectURL(blob));
    audio.addEventListener("loadedmetadata", () => resolve(audio.duration));
  });
}
