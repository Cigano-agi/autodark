import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useChannels } from "@/hooks/useChannels";
import { useBlueprint, VISUAL_STYLE_PROMPTS } from "@/hooks/useBlueprint";
import { useContentIdeas } from "@/hooks/useContentIdeas";
import { useChannelPrompts } from "@/hooks/useChannelPrompts";
import { useContents } from "@/hooks/useContents";
import { useVideoAssembler } from "@/hooks/useVideoAssembler";
import { useFFmpegExport } from "@/hooks/useFFmpegExport";
import { RemotionPreview } from "@/remotion/RemotionPreview";
import type { SlideData } from "@/remotion/types";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import {
  Loader2, Wand2, Image as ImageIcon, FileText,
  Zap, ArrowRight, Lightbulb, Mic, Film,
  Video, Play, Download, CheckCircle2, ChevronDown, ChevronRight,
  Pencil, X, Globe, Clock, DollarSign, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { BeamsBackground } from "@/components/ui/beams-background";
import { KieGenerator } from "@/components/ui/kie-generator";

// ─── API Keys ────────────────────────────────────────────────────────────────

const AI33_API_KEY = (import.meta.env.VITE_AI33_API_KEY as string | undefined)?.replace(/['"]/g, '').trim();
const OPENROUTER_API_KEY = (import.meta.env.VITE_OPENROUTER_API_KEY as string | undefined)?.replace(/['"]/g, '').trim();
const KIE_API_KEY = (import.meta.env.VITE_KIE_API_KEY as string | undefined)?.replace(/['"]/g, '').trim();

// Resolves a visual_style value (preset key or free-text) to an image prompt string
function resolveVisualStyle(raw: string | null | undefined): string {
  if (!raw) return "cinematic, dark aesthetic, dramatic lighting, high contrast, 4K";
  return VISUAL_STYLE_PROMPTS[raw] ?? raw;
}

// ─── Types ───────────────────────────────────────────────────────────────────

type VideoLanguage = "en" | "es" | "pt-BR";
type VideoDuration = 8 | 15 | 20 | "custom";

interface VideoChapter {
  id: string;
  title: string;
  summary: string;
  script: string;
  scenes: Scene[];
  audioUrl?: string;
  audioDurationSec?: number;
}

interface Scene {
  title: string;
  narration: string;
  visual_prompt: string;
  emotion?: string;
  imageUrl?: string;
  chapterId?: string;
  durationSec?: number;
}

interface HubDefaults {
  voice: string;
  voiceId: string;
  slidesImage: string;
  thumbImage: string;
  videoModel: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const VOICE_PRICES: Record<string, number> = {
  browser: 0,
  openai: 0.45,
  google_chirp: 0.18,
  fish: 1.80,
  elevenlabs: 9.00,
};

const IMAGE_PRICES: Record<string, number> = {
  placeholder: 0,
  pexels: 0,
  kie_flux: 0.30,
  dalle3: 0.24,
  ideogram: 0.48,
};

const TOTAL_STEPS = 8;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function loadHubDefaults(channelId: string): HubDefaults {
  try {
    const raw = localStorage.getItem("autodark_hub_defaults_v2");
    const all = raw ? JSON.parse(raw) : {};
    return all[channelId] || all["global"] || {
      voice: "browser", voiceId: "browser_pt",
      slidesImage: "pexels", thumbImage: "kie_flux", videoModel: "none",
    };
  } catch {
    return { voice: "browser", voiceId: "browser_pt", slidesImage: "pexels", thumbImage: "kie_flux", videoModel: "none" };
  }
}

function durationToChapters(durationMin: number): number {
  if (durationMin <= 8)  return 3;
  if (durationMin <= 12) return 4;
  if (durationMin <= 18) return 5;
  if (durationMin <= 25) return 6;
  return Math.ceil(durationMin / 4);
}

function durationToScenes(durationMin: number): number {
  return Math.ceil((durationMin * 60) / 8);
}

function estimateCost(
  durationMin: number,
  hub: HubDefaults,
): { voice: number; slides: number; thumb: number; total: number } {
  const voicePrice = VOICE_PRICES[hub.voice] ?? 0;
  const slidePrice = IMAGE_PRICES[hub.slidesImage] ?? 0;
  const thumbPrice = IMAGE_PRICES[hub.thumbImage] ?? 0;
  const voice = durationMin * voicePrice;
  const slides = durationToScenes(durationMin) * slidePrice;
  const thumb = thumbPrice;
  return { voice, slides, thumb, total: voice + slides + thumb };
}

function generateId(): string {
  return crypto.randomUUID?.() || Math.random().toString(36).slice(2, 10);
}

// ─── Chat completion helper ────────────────────────────────────────────────────

const fetchWithTimeout = (url: string, options: RequestInit, timeoutMs = 45000): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
};

const callClaude = async (systemPrompt: string, userPrompt: string, requireJson = false): Promise<string> => {
  const isDev = ["localhost", "127.0.0.1"].includes(window.location.hostname) ||
                window.location.hostname.startsWith("192.168.") ||
                window.location.hostname.startsWith("10.");
  try {
    const url = isDev ? "/api-ai/v1/chat/completions" : "https://api.ai33.pro/v1/chat/completions";
    if (!AI33_API_KEY) throw new Error("AI33_API_KEY missing");
    const res = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${AI33_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        temperature: 0.7,
        ...(requireJson ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error(`AI33 sem resposta: ${data.message || JSON.stringify(data).slice(0, 80)}`);
      return content;
    }
    if (res.status === 401 && OPENROUTER_API_KEY) return callOpenRouter(systemPrompt, userPrompt, requireJson);
    throw new Error(`AI33 ${res.status}: ${(await res.text()).slice(0, 100)}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (err instanceof Error && err.name === "AbortError") throw new Error("AI33 timeout — tentando OpenRouter...");
    if (OPENROUTER_API_KEY && (msg.includes("AI33") || msg.includes("timeout"))) return callOpenRouter(systemPrompt, userPrompt, requireJson);
    throw err;
  }
};

const callOpenRouter = async (systemPrompt: string, userPrompt: string, requireJson = false): Promise<string> => {
  const res = await fetchWithTimeout("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": window.location.origin,
      "X-Title": "AutoDark Production",
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      ...(requireJson ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
  return (await res.json()).choices?.[0]?.message?.content || "";
};

// ─── Image generation helper ──────────────────────────────────────────────────

const generatePlaceholderImage = (prompt: string, index: number): string => {
  const canvas = document.createElement("canvas");
  canvas.width = 1792; canvas.height = 1024;
  const ctx = canvas.getContext("2d")!;
  const colors = ["#1a0a2e", "#0a1628", "#1c0b0b", "#0b1c1c", "#1b1b0a", "#0e0a1e"];
  ctx.fillStyle = colors[index % colors.length];
  ctx.fillRect(0, 0, 1792, 1024);
  const grd = ctx.createLinearGradient(0, 0, 1792, 1024);
  grd.addColorStop(0, "rgba(255,140,0,0.15)"); grd.addColorStop(1, "rgba(120,0,255,0.15)");
  ctx.fillStyle = grd; ctx.fillRect(0, 0, 1792, 1024);
  ctx.fillStyle = "#ff8c00"; ctx.font = "bold 48px sans-serif"; ctx.textAlign = "center";
  ctx.fillText(`Cena ${index + 1}`, 896, 460);
  ctx.fillStyle = "#ccc"; ctx.font = "28px sans-serif";
  const words = prompt.split(" ").slice(0, 12).join(" ");
  ctx.fillText(words + "...", 896, 530);
  ctx.fillStyle = "rgba(255,255,255,0.3)"; ctx.font = "20px sans-serif";
  ctx.fillText("Placeholder — imagem será gerada por IA", 896, 600);
  return canvas.toDataURL("image/jpeg", 0.85);
};

let _placeholderIdx = 0;

const callKieImage = async (prompt: string): Promise<string> => {
  if (!KIE_API_KEY) throw new Error("KIE_API_KEY missing");
  const isDev = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const baseUrl = isDev ? "/api-kie" : "https://api.kie.ai";
  const submitRes = await fetch(`${baseUrl}/api/v1/flux/kontext/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${KIE_API_KEY}` },
    body: JSON.stringify({ prompt, aspectRatio: "16:9", outputFormat: "jpeg", model: "flux-kontext-pro", enableTranslation: true }),
  });
  if (!submitRes.ok) {
    const errText = await submitRes.text();
    throw new Error(`Kie.ai submit failed (${submitRes.status}): ${errText.slice(0, 120)}`);
  }
  const submitData = await submitRes.json();
  const taskId = submitData?.data?.taskId;
  if (!taskId) throw new Error("Kie.ai: no taskId returned");
  const maxWait = 200_000;
  const pollInterval = 5_000;
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    await new Promise(r => setTimeout(r, pollInterval));
    const pollRes = await fetch(`${baseUrl}/api/v1/flux/kontext/record-info?taskId=${taskId}`, {
      headers: { "Authorization": `Bearer ${KIE_API_KEY}` },
    });
    if (!pollRes.ok) continue;
    const pollData = await pollRes.json();
    if (pollData?.code === 422) continue;
    const data = pollData?.data;
    if (!data) continue;
    if (data.successFlag === 1 && data.response?.resultImageUrl) return data.response.resultImageUrl;
    if (data.errorCode || data.errorMessage) throw new Error(`Kie.ai failed: ${data.errorMessage || data.errorCode}`);
  }
  throw new Error("Kie.ai: timeout waiting for image (120s)");
};

const callImageGeneration = async (prompt: string): Promise<string> => {
  if (KIE_API_KEY) {
    try { return await callKieImage(prompt); }
    catch (e) { console.warn("[autodark] Kie.ai failed:", e instanceof Error ? e.message : e); }
  }
  if (AI33_API_KEY) {
    try {
      const isDev = ["localhost", "127.0.0.1"].includes(window.location.hostname);
      const url = isDev ? "/api-ai/v1/images/generations" : "https://api.ai33.pro/v1/images/generations";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${AI33_API_KEY}` },
        body: JSON.stringify({ model: "dall-e-3", prompt, size: "1792x1024", quality: "standard", n: 1 }),
      });
      if (res.ok) { const data = await res.json(); return data.data[0].url as string; }
    } catch { }
  }
  return generatePlaceholderImage(prompt, _placeholderIdx++);
};

const extractJson = (text: string) => {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("JSON não encontrado na resposta");
  return JSON.parse(match[0]);
};

const stripMarkdown = (text: string): string =>
  text.replace(/^#{1,6}\s+/gm, "").replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1")
    .replace(/~~(.+?)~~/g, "$1").replace(/`(.+?)`/g, "$1").replace(/^[-*_]{3,}\s*$/gm, "")
    .replace(/^[-*+]\s+/gm, "").replace(/^\d+\.\s+/gm, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\n{3,}/g, "\n\n").trim();

const renderMarkdown = (text: string): string =>
  text.replace(/^### (.+)$/gm, '<h4 class="text-sm font-bold text-white/90 mt-3 mb-1">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="text-base font-bold text-white mt-4 mb-1">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 class="text-lg font-bold text-white mt-4 mb-2">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^[-*+] (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
    .replace(/\n{2,}/g, '<br/><br/>').replace(/\n/g, '<br/>');

async function getAudioDuration(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio(URL.createObjectURL(blob));
    audio.addEventListener("loadedmetadata", () => resolve(audio.duration));
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProductionWizard() {
  const { channels } = useChannels();
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams<{ id?: string }>();
  const channelId = params.id || location.state?.channelId || "";

  const channel = channels?.find(c => c.id === channelId);
  const { blueprint } = useBlueprint(channelId);
  const { prompts } = useChannelPrompts(channelId || undefined);
  const { ideas } = useContentIdeas(channelId || undefined);
  const { createContent } = useContents(channelId || undefined);
  const { assembleVideo, assembling, progress: videoProgress, log: videoLog } = useVideoAssembler();
  const { exportToMp4, exporting: ffmpegExporting, progress: ffmpegProgress, log: ffmpegLog, error: ffmpegError } = useFFmpegExport();

  // ── Step & UI state ──
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  // ── Step 1: Configuration ──
  const [language, setLanguage] = useState<VideoLanguage>("pt-BR");
  const [duration, setDuration] = useState<VideoDuration>(8);
  const [customMinutes, setCustomMinutes] = useState(25);
  const [idea, setIdea] = useState<string>(location.state?.idea || "");
  const [showIdeas, setShowIdeas] = useState(false);

  const effectiveDuration = duration === "custom" ? customMinutes : duration;
  const hub = loadHubDefaults(channelId);
  const cost = estimateCost(effectiveDuration, hub);

  // ── Step 2: Summary + Chapters ──
  const [title, setTitle] = useState("");
  const [hook, setHook] = useState("");
  const [chapters, setChapters] = useState<VideoChapter[]>([]);

  // ── Step 3: Scripts per chapter ──
  const [generatingChapter, setGeneratingChapter] = useState<string | null>(null);
  const [openChapters, setOpenChapters] = useState<Record<string, boolean>>({});

  // ── Step 4: TTS per chapter ──
  const [generatingAudio, setGeneratingAudio] = useState<string | null>(null);
  const audioBlobsRef = useRef<Record<string, Blob>>({});

  // ── Step 5: Scenes + Images ──
  const [generatingSceneImage, setGeneratingSceneImage] = useState<Record<string, boolean>>({});
  const [allScenesLoading, setAllScenesLoading] = useState(false);
  const cancelImagesRef = useRef(false);

  // ── Step 6: Thumbnail ──
  const [thumbPrompt, setThumbPrompt] = useState("");
  const [thumbImageUrl, setThumbImageUrl] = useState<string | null>(null);

  // ── Step 7: Video ──
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [mp4Url, setMp4Url] = useState<string | null>(null);
  const webmBlobRef = useRef<Blob | null>(null);

  // ── Misc ──
  const [kieOpen, setKieOpen] = useState(false);
  const [previewingSceneIdx, setPreviewingSceneIdx] = useState<number | null>(null);
  const [showConfirmSave, setShowConfirmSave] = useState(false);
  const [selectedPromptId, setSelectedPromptId] = useState<string>("none");

  // ── Derived ──
  const allScenes = chapters.flatMap(ch => ch.scenes.map(s => ({ ...s, chapterId: ch.id })));
  const scenesWithImages = allScenes.filter(s => s.imageUrl);
  const allScenesHaveImages = allScenes.length > 0 && scenesWithImages.length === allScenes.length;
  const allChaptersHaveScripts = chapters.length > 0 && chapters.every(ch => ch.script.trim().length > 0);
  const allChaptersHaveAudio = chapters.length > 0 && chapters.every(ch => ch.audioUrl);
  const allChaptersHaveScenes = chapters.length > 0 && chapters.every(ch => ch.scenes.length > 0);

  // Build Remotion slide data from chapters
  const remotionSlides: SlideData[] = chapters.flatMap((ch, ci) =>
    ch.scenes.map((scene, si) => ({
      imageUrl: scene.imageUrl || "",
      narration: scene.narration,
      durationSec: scene.durationSec || 6,
      audioUrl: si === 0 ? ch.audioUrl : undefined, // audio only on first scene of chapter
      chapterTitle: ch.title,
      isChapterStart: si === 0 && ci > 0, // title card before each chapter (skip first)
    }))
  ).filter(s => s.imageUrl);

  // ── Persistence ──────────────────────────────────────────────────────────
  const [restored, setRestored] = useState(false);
  const storageKey = `autodark_prod_wizard_v3_${channelId}`;

  useEffect(() => {
    if (!channelId) return;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setStep(data.step || 1);
        setLanguage(data.language || "pt-BR");
        setDuration(data.duration || 8);
        setCustomMinutes(data.customMinutes || 25);
        setIdea(data.idea || "");
        setTitle(data.title || "");
        setHook(data.hook || "");
        setChapters(data.chapters || []);
        setThumbPrompt(data.thumbPrompt || "");
        setThumbImageUrl(data.thumbImageUrl || null);
        setVideoUrl(data.videoUrl || null);
        console.log("[autodark] State restored for channel", channelId);
      } catch (e) {
        console.error("Failed to restore wizard state", e);
      }
    }
    setRestored(true);
  }, [channelId]);

  useEffect(() => {
    if (!restored || !channelId) return;
    const stateToSave = {
      step, language, duration, customMinutes, idea, title, hook,
      chapters, thumbPrompt, thumbImageUrl, videoUrl,
    };
    const timer = setTimeout(() => {
      localStorage.setItem(storageKey, JSON.stringify(stateToSave));
    }, 1000);
    return () => clearTimeout(timer);
  }, [restored, channelId, step, language, duration, customMinutes, idea, title, hook, chapters, thumbPrompt, thumbImageUrl, videoUrl]);

  const reset = () => {
    setLanguage("pt-BR"); setDuration(8); setCustomMinutes(25);
    setIdea(""); setTitle(""); setHook("");
    setChapters([]); setSelectedPromptId("none");
    setThumbPrompt(""); setThumbImageUrl(null);
    setVideoUrl(null); setMp4Url(null); setStep(1);
    webmBlobRef.current = null;
    audioBlobsRef.current = {};
    if (channelId) localStorage.removeItem(storageKey);
  };

  // ── Step 1 → Step 2: Generate Summary + Chapters ──────────────────────

  const handleGenerateSummary = async () => {
    if (!idea.trim()) { toast.error("Digite uma ideia primeiro."); return; }
    setLoading(true);
    try {
      setStatusMessage("Gerando sumário e capítulos...");
      const numChapters = durationToChapters(effectiveDuration);
      const langLabel = language === "en" ? "English" : language === "es" ? "Español" : "Português Brasileiro";

      const raw = await callClaude(
        `Você é um roteirista especializado em vídeos de YouTube de alto engajamento.
Canal: ${channel?.name || "Canal"} | Nicho: ${(channel as Record<string, unknown>)?.niche || "geral"}
Persona: ${blueprint?.persona_prompt || "narrador envolvente"}
Regras: ${blueprint?.script_rules || ""}`,
        `Crie um sumário estruturado para um vídeo de ${effectiveDuration} minutos sobre: "${idea}"
Idioma: ${langLabel}

Retorne JSON:
{
  "title": "Título otimizado para YouTube (máx 70 chars)",
  "hook": "Frase de abertura de 1 linha para prender atenção",
  "chapters": [
    {
      "id": "ch1",
      "title": "Título do Capítulo",
      "summary": "O que será abordado neste capítulo (2-3 frases)"
    }
  ]
}

Gere exatamente ${numChapters} capítulos.`,
        true
      );

      const parsed = extractJson(raw);
      setTitle(parsed.title || "");
      setHook(parsed.hook || "");
      setChapters(
        (parsed.chapters || []).map((ch: { id?: string; title: string; summary: string }) => ({
          id: ch.id || generateId(),
          title: ch.title,
          summary: ch.summary,
          script: "",
          scenes: [],
        }))
      );
      setStep(2);
      toast.success(`Sumário gerado com ${parsed.chapters?.length || 0} capítulos!`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar sumário.");
    } finally {
      setLoading(false);
      setStatusMessage("");
    }
  };

  // ── Step 2 → Step 3: Generate Scripts per Chapter ─────────────────────

  const generateChapterScript = async (chapter: VideoChapter) => {
    const chapterIndex = chapters.findIndex(c => c.id === chapter.id);
    const isFirst = chapterIndex === 0;
    const isLast = chapterIndex === chapters.length - 1;
    const langLabel = language === "en" ? "English" : language === "es" ? "Español" : "Português Brasileiro";
    const chapterDurationMin = Math.ceil(effectiveDuration / chapters.length);

    let systemPrompt = blueprint?.persona_prompt || "Você é um roteirista profissional de YouTube.";
    if (selectedPromptId !== "none") {
      const selectedPrompt = prompts.find(p => p.id === selectedPromptId);
      if (selectedPrompt?.prompt_template) systemPrompt = selectedPrompt.prompt_template;
    }

    const prompt = `Você é um roteirista para o canal "${channel?.name || "Canal"}".
Idioma: ${langLabel}
Estilo: ${blueprint?.persona_prompt || "narrador envolvente e direto"}
Regras: ${blueprint?.script_rules || ""}

Este é o capítulo ${chapterIndex + 1} de ${chapters.length} do vídeo "${title}".
Contexto geral: ${chapters.map(c => `${c.title}: ${c.summary}`).join(" | ")}

Escreva o roteiro COMPLETO para o capítulo: "${chapter.title}"
Resumo: ${chapter.summary}

${isFirst ? "Este é o capítulo de ABERTURA — comece com o hook: capture a atenção nos primeiros 30 segundos." : ""}
${isLast ? "Este é o capítulo FINAL — feche com CTA forte (like, inscrição, próximo vídeo)." : ""}

Duração alvo: ~${chapterDurationMin} minutos de narração.
Escreva APENAS o texto da narração. Sem estágios, sem [PAUSA], sem comentários de produção.`;

    return await callClaude(systemPrompt, prompt);
  };

  const handleGenerateChapterScript = async (chapterId: string) => {
    const chapter = chapters.find(c => c.id === chapterId);
    if (!chapter) return;
    setGeneratingChapter(chapterId);
    try {
      const script = await generateChapterScript(chapter);
      setChapters(prev => prev.map(ch =>
        ch.id === chapterId ? { ...ch, script } : ch
      ));
      toast.success(`Roteiro do capítulo "${chapter.title}" gerado!`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar roteiro.");
    } finally {
      setGeneratingChapter(null);
    }
  };

  const handleGenerateAllScripts = async () => {
    setLoading(true);
    try {
      for (const chapter of chapters) {
        if (chapter.script.trim()) continue;
        setStatusMessage(`Escrevendo cap. "${chapter.title}"...`);
        setGeneratingChapter(chapter.id);
        const script = await generateChapterScript(chapter);
        setChapters(prev => prev.map(ch =>
          ch.id === chapter.id ? { ...ch, script } : ch
        ));
      }
      setStep(3);
      toast.success("Todos os roteiros gerados!");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido ao gerar roteiros";
      console.error("[AutoDark] handleGenerateAllScripts failed:", e);
      toast.error(msg, { duration: 6000 });
    } finally {
      setLoading(false);
      setStatusMessage("");
      setGeneratingChapter(null);
    }
  };

  // ── Step 3 → Step 4: TTS per Chapter ──────────────────────────────────

  const handleGenerateChapterAudio = async (chapterId: string) => {
    const chapter = chapters.find(c => c.id === chapterId);
    if (!chapter || !chapter.script.trim()) return;
    setGeneratingAudio(chapterId);
    try {
      const text = stripMarkdown(chapter.script);

      if (hub.voice === "browser" && !AI33_API_KEY) {
        setChapters(prev => prev.map(ch =>
          ch.id === chapterId ? { ...ch, audioUrl: "browser_tts", audioDurationSec: Math.ceil(text.length / 15) } : ch
        ));
        toast.warning(`TTS browser: vídeo ficará sem áudio (configure AI33_API_KEY para narração real)`);
        return;
      }

      let res: Response;

      if (hub.voice === "google_chirp") {
        // Route through Edge Function (keeps GOOGLE_TTS_API_KEY server-side)
        const { data: { session } } = await supabase.auth.getSession();
        res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/youtube-generate-audio`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({ text, voice: hub.voiceId, provider: "google" }),
          }
        );
      } else {
        const isDev = ["localhost", "127.0.0.1"].includes(window.location.hostname);
        const ttsUrl = isDev ? "/api-ai/v1/audio/speech" : "https://api.ai33.pro/v1/audio/speech";
        res = await fetch(ttsUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${AI33_API_KEY}` },
          body: JSON.stringify({
            model: "tts-1",
            input: text,
            voice: hub.voiceId || "alloy",
            response_format: "mp3",
          }),
        });
      }
      if (!res.ok) throw new Error(`TTS failed: ${res.status}`);
      const blob = await res.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audioDuration = await getAudioDuration(blob);
      audioBlobsRef.current[chapterId] = blob;
      setChapters(prev => prev.map(ch =>
        ch.id === chapterId ? { ...ch, audioUrl, audioDurationSec: audioDuration } : ch
      ));
      toast.success(`Áudio de "${chapter.title}" gerado!`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar áudio.");
    } finally {
      setGeneratingAudio(null);
    }
  };

  const handleGenerateAllAudio = async () => {
    setLoading(true);
    try {
      for (const chapter of chapters) {
        if (chapter.audioUrl && chapter.audioUrl !== "browser_tts") continue;
        setStatusMessage(`Narrando "${chapter.title}"...`);
        await handleGenerateChapterAudio(chapter.id);
      }
      setStep(4);
      toast.success("Narração completa!");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro na narração.");
    } finally {
      setLoading(false);
      setStatusMessage("");
    }
  };

  const handleSkipNarration = () => {
    setStep(4);
    toast.info("Narração pulada.");
  };

  // ── Step 4 → Step 5: Extract Scenes per Chapter ──────────────────────

  const handleExtractScenes = async () => {
    setLoading(true);
    try {
      const style = resolveVisualStyle(blueprint?.visual_style);
      const updatedChapters = [...chapters];

      for (let i = 0; i < updatedChapters.length; i++) {
        const chapter = updatedChapters[i];
        if (chapter.scenes.length > 0) continue;
        setStatusMessage(`Extraindo cenas do cap. ${i + 1}...`);

        const chapterDurationMin = effectiveDuration / chapters.length;
        const sceneCount = Math.ceil((chapterDurationMin * 60) / 8);

        const raw = await callClaude(
          "Você é um diretor de vídeo. Retorne APENAS JSON válido.",
          `Roteiro do capítulo "${chapter.title}":
${chapter.script}

Divida este roteiro em exatamente ${sceneCount} cenas visuais para slides.
Para cada cena, retorne JSON:
{
  "scenes": [
    {
      "title": "Título curto da cena",
      "narration": "Trecho exato do roteiro que será narrado nesta cena (5-15 segundos de fala)",
      "visual_prompt": "Prompt detalhado para geração de imagem. ${style}. Cinematic. No text, no letters, no watermarks.",
      "emotion": "urgency | shock | motivation | curiosity | inspiration | neutral"
    }
  ]
}

Escolha a emotion que melhor representa o tom emocional dominante de cada cena.`,
          true
        );
        const parsed = extractJson(raw);
        updatedChapters[i] = {
          ...chapter,
          scenes: (parsed.scenes || []).map((s: Scene) => ({ ...s, chapterId: chapter.id })),
        };
        setChapters([...updatedChapters]);
      }
      setStep(5);
      toast.success("Cenas extraídas!");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao extrair cenas.");
    } finally {
      setLoading(false);
      setStatusMessage("");
    }
  };

  // ── Step 5: Image Generation ──────────────────────────────────────────

  const handleGenerateSceneImage = async (chapterId: string, sceneIdx: number) => {
    const key = `${chapterId}_${sceneIdx}`;
    setGeneratingSceneImage(prev => ({ ...prev, [key]: true }));
    try {
      const chapter = chapters.find(c => c.id === chapterId);
      if (!chapter) return;
      const scene = chapter.scenes[sceneIdx];
      const styleHint = resolveVisualStyle(blueprint?.visual_style);
      const charHint = blueprint?.character_description ? ` Featuring: ${blueprint.character_description}.` : "";
      const fullPrompt = `${scene.visual_prompt}.${charHint} Style: ${styleHint}. No text, no letters, no watermarks.`;
      const rawUrl = await callImageGeneration(fullPrompt);
      // Convert external URLs to blob URLs to avoid CORS issues in canvas assembler
      let imageUrl = rawUrl;
      if (rawUrl.startsWith("http")) {
        try {
          const resp = await fetch(rawUrl);
          const blob = await resp.blob();
          imageUrl = URL.createObjectURL(blob);
        } catch {
          imageUrl = rawUrl;
        }
      }
      setChapters(prev => prev.map(ch =>
        ch.id === chapterId
          ? { ...ch, scenes: ch.scenes.map((s, i) => i === sceneIdx ? { ...s, imageUrl } : s) }
          : ch
      ));
      toast.success(`Imagem gerada!`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar imagem.");
    } finally {
      const key = `${chapterId}_${sceneIdx}`;
      setGeneratingSceneImage(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleGenerateAllImages = async () => {
    cancelImagesRef.current = false;
    setAllScenesLoading(true);

    // Coleta todas as cenas pendentes upfront (evita closure stale)
    const pending: Array<{ chapterId: string; sceneIdx: number }> = [];
    for (const chapter of chapters) {
      for (let i = 0; i < chapter.scenes.length; i++) {
        if (!chapter.scenes[i].imageUrl) pending.push({ chapterId: chapter.id, sceneIdx: i });
      }
    }

    const total = pending.length;
    let done = 0;
    const BATCH = 3; // 3 imagens simultâneas — respeita rate limit da API

    for (let i = 0; i < pending.length; i += BATCH) {
      if (cancelImagesRef.current) break;
      const batch = pending.slice(i, i + BATCH);
      setStatusMessage(`Gerando imagens ${done + 1}–${Math.min(done + batch.length, total)}/${total}...`);
      await Promise.all(
        batch.map(({ chapterId, sceneIdx }) =>
          cancelImagesRef.current ? Promise.resolve() : handleGenerateSceneImage(chapterId, sceneIdx)
        )
      );
      done += batch.length;
    }

    cancelImagesRef.current = false;
    setAllScenesLoading(false);
    setStatusMessage("");
    if (allScenes.every(s => s.imageUrl)) {
      setStep(6);
      toast.success("Todas as imagens geradas!");
    }
  };

  // ── Step 6: Thumbnail ─────────────────────────────────────────────────

  const handleGenerateThumb = async () => {
    setLoading(true);
    try {
      setStatusMessage("Criando conceito da thumbnail...");
      const raw = await callClaude(
        "Você é um especialista em thumbnails virais de YouTube. Crie um prompt detalhado para DALL-E 3. O prompt DEVE ser em inglês, cinematográfico.",
        `Título: ${title}\nResumo: ${hook}\nEstilo visual: ${resolveVisualStyle(blueprint?.visual_style)}`
      );
      setThumbPrompt(raw);
      toast.success("Conceito criado!");
    } catch { toast.error("Erro ao gerar conceito."); }
    finally { setLoading(false); setStatusMessage(""); }
  };

  const handleGenerateThumbImage = async () => {
    if (!thumbPrompt) return;
    setLoading(true);
    try {
      setStatusMessage("Gerando thumbnail...");
      const url = await callImageGeneration(thumbPrompt);
      setThumbImageUrl(url);
      setStep(7);
      toast.success("Thumbnail gerada!");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar imagem.");
    } finally { setLoading(false); setStatusMessage(""); }
  };

  // ── Step 7: Assemble Video ────────────────────────────────────────────

  const handleAssembleVideo = async () => {
    if (scenesWithImages.length === 0) { toast.error("Gere imagens antes."); return; }
    try {
      const totalChars = allScenes.reduce((sum, s) => sum + s.narration.length, 0);
      const fullNarration = chapters.map(ch => stripMarkdown(ch.script)).join(" ");

      // Combine all audio blobs into one if available
      const audioBlobs = chapters
        .map(ch => audioBlobsRef.current[ch.id])
        .filter(Boolean);
      const combinedBlob = audioBlobs.length > 0
        ? new Blob(audioBlobs, { type: audioBlobs[0].type })
        : null;

      const assemblyScenes = allScenes
        .filter(s => s.imageUrl)
        .map(s => ({
          imageUrl: s.imageUrl!,
          durationSec: combinedBlob && totalChars > 0
            ? Math.min(15, Math.max(4, Math.round((s.narration.length / totalChars) * (fullNarration.length / 2.5))))
            : 6,
          subtitle: s.narration,
          emotion: s.emotion,
        }));

      const url = await assembleVideo(assemblyScenes, combinedBlob);
      setVideoUrl(url);
      setStep(8);
      toast.success("Vídeo montado!");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao montar vídeo.");
    }
  };

  // ── Step 7b: Export MP4 via FFmpeg.wasm ─────────────────────────────

  const handleExportMp4 = async () => {
    if (!videoUrl) { toast.error("Monte o vídeo WebM primeiro."); return; }
    try {
      // Fetch the WebM blob from the object URL
      let blob = webmBlobRef.current;
      if (!blob) {
        const res = await fetch(videoUrl);
        blob = await res.blob();
        webmBlobRef.current = blob;
      }
      const mp4 = await exportToMp4(blob);
      setMp4Url(mp4);
      toast.success("MP4 exportado!");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao exportar MP4.");
    }
  };

  // ── Step 8: Finalize ──────────────────────────────────────────────────

  const handleFinalize = async () => {
    if (!channelId) return;
    setLoading(true);
    try {
      setStatusMessage("Salvando conteúdo...");
      const fullScript = chapters.map(ch => `## ${ch.title}\n\n${ch.script}`).join("\n\n---\n\n");
      const scenesSection = allScenes.length > 0
        ? `\n\n## Cenas\n${allScenes.map((s, i) => `### ${i + 1}. ${s.title}\n**Visual:** ${s.visual_prompt}${s.imageUrl ? `\n**Image:** ${s.imageUrl}` : ''}`).join('\n\n')}`
        : "";

      await createContent.mutateAsync({
        title,
        hook: `${hook}\n\n## Thumbnail\n${thumbPrompt}${scenesSection}`,
        script: fullScript,
        topic: blueprint?.topic || undefined,
        status: "awaiting_review",
      });

      toast.success("Conteúdo salvo!");
      setTimeout(() => navigate(`/channel/${channelId}`), 1500);
    } catch { toast.error("Erro ao salvar conteúdo."); }
    finally { setLoading(false); setStatusMessage(""); }
  };

  // ── UI ─────────────────────────────────────────────────────────────────

  const scriptPrompts = prompts.filter(p => p.content_type === "script" && p.is_active !== false);
  const approvedIdeas = ideas.filter(i => i.status === "approved");

  const stepLabels = [
    { icon: Zap, label: "Config", color: "yellow" },
    { icon: Lightbulb, label: "Sumário", color: "blue" },
    { icon: FileText, label: "Roteiro", color: "purple" },
    { icon: Mic, label: "Narração", color: "green" },
    { icon: Film, label: "Cenas", color: "orange" },
    { icon: ImageIcon, label: "Imagens", color: "pink" },
    { icon: ImageIcon, label: "Thumb", color: "rose" },
    { icon: Video, label: "Vídeo", color: "emerald" },
  ];

  return (
    <BeamsBackground intensity="medium" className="bg-background">
      <main className="pt-28 pb-12 px-6 max-w-7xl mx-auto min-h-screen relative z-10 text-foreground">
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">

          {/* Header + Progress */}
          <div className="mb-8 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">Produção</h1>
                {channel && <p className="text-sm text-muted-foreground mt-0.5">{channel.name}</p>}
                {(loading || assembling || allScenesLoading) && statusMessage && (
                  <div className="mt-1.5 flex items-center gap-2 text-primary animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span className="text-sm">{statusMessage}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">Passo {step} de {TOTAL_STEPS}</span>
                <Button size="sm" variant="ghost" onClick={reset} className="text-muted-foreground hover:text-white text-xs">
                  <RefreshCw className="w-3 h-3 mr-1" /> Novo
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {stepLabels.map((s, i) => {
                const StepIcon = s.icon;
                const isActive = step === i + 1;
                const isDone = step > i + 1;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className={`w-full h-1.5 rounded-full transition-all duration-300 ${isDone ? 'bg-primary' : isActive ? 'bg-primary/60' : 'bg-white/10'}`} />
                    <div className={`flex items-center gap-1 transition-colors ${isActive ? 'text-primary' : isDone ? 'text-primary/50' : 'text-muted-foreground/40'}`}>
                      <StepIcon className="w-3 h-3" />
                      <span className="text-[10px] hidden sm:inline">{s.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ═══════════════════════════ STEP 1: CONFIGURATION ═══════════════════════════ */}
          <Card className={`transition-all duration-300 bg-card/30 backdrop-blur border-white/10 ${step === 1 ? 'ring-1 ring-primary/50 border-primary/30' : ''}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Zap className="w-5 h-5 text-yellow-500" /> 1. Configuração do Vídeo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Language */}
              <div className="space-y-2">
                <Label className="text-white flex items-center gap-2"><Globe className="w-4 h-4" /> Idioma</Label>
                <div className="grid grid-cols-3 gap-2">
                  {([["pt-BR", "Português"], ["en", "English"], ["es", "Español"]] as const).map(([code, label]) => (
                    <Button
                      key={code}
                      variant={language === code ? "default" : "outline"}
                      className={language === code ? "bg-primary" : "border-white/10 hover:bg-white/5"}
                      onClick={() => setLanguage(code as VideoLanguage)}
                      disabled={step > 1}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label className="text-white flex items-center gap-2"><Clock className="w-4 h-4" /> Duração</Label>
                <div className="grid grid-cols-4 gap-2">
                  {([8, 15, 20] as const).map(d => (
                    <Button
                      key={d}
                      variant={duration === d ? "default" : "outline"}
                      className={duration === d ? "bg-primary" : "border-white/10 hover:bg-white/5"}
                      onClick={() => setDuration(d)}
                      disabled={step > 1}
                    >
                      {d} min
                    </Button>
                  ))}
                  <Button
                    variant={duration === "custom" ? "default" : "outline"}
                    className={duration === "custom" ? "bg-primary" : "border-white/10 hover:bg-white/5"}
                    onClick={() => setDuration("custom")}
                    disabled={step > 1}
                  >
                    Custom
                  </Button>
                </div>
                {duration === "custom" && (
                  <div className="flex items-center gap-3 mt-2">
                    <Slider
                      value={[customMinutes]}
                      min={20}
                      max={60}
                      step={5}
                      onValueChange={([v]) => setCustomMinutes(v)}
                      className="flex-1"
                      disabled={step > 1}
                    />
                    <span className="text-white font-bold w-16 text-center">{customMinutes} min</span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  {durationToChapters(effectiveDuration)} capítulos · {durationToScenes(effectiveDuration)} slides estimados
                </p>
              </div>

              {/* Idea */}
              <div className="space-y-2">
                <Label className="text-white flex items-center gap-2"><Lightbulb className="w-4 h-4" /> Tópico / Ideia</Label>
                <Textarea
                  value={idea}
                  onChange={e => setIdea(e.target.value)}
                  placeholder="Sobre o que será o vídeo?"
                  disabled={step > 1}
                  className="bg-black/40 border-white/10 text-white min-h-[80px]"
                />
                {approvedIdeas.length > 0 && step === 1 && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowIdeas(!showIdeas)}
                      className="gap-1.5 text-muted-foreground hover:text-white"
                    >
                      <Lightbulb className="w-4 h-4 text-yellow-500" /> {approvedIdeas.length} ideias aprovadas
                    </Button>
                    {showIdeas && (
                      <div className="space-y-1 p-3 bg-card/30 border border-white/10 rounded-xl max-h-48 overflow-y-auto">
                        {approvedIdeas.map(i => (
                          <button
                            key={i.id}
                            onClick={() => { setIdea(i.title); setShowIdeas(false); }}
                            className="w-full text-left text-sm text-white/80 hover:text-white p-2 rounded hover:bg-white/5"
                          >
                            {i.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Prompt selector */}
              {scriptPrompts.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-white">Prompt de Roteiro</Label>
                  <Select onValueChange={setSelectedPromptId} value={selectedPromptId}>
                    <SelectTrigger className="bg-black/20 border-white/10 text-white"><SelectValue placeholder="Padrão (IA)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Padrão (IA)</SelectItem>
                      {scriptPrompts.map(p => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Cost Estimation */}
              <div className="p-4 bg-black/20 border border-white/10 rounded-xl">
                <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <DollarSign className="w-3 h-3" /> Estimativa de Custo
                </h4>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Narração ({effectiveDuration} min · {hub.voice})</span>
                    <span className="text-white">{cost.voice === 0 ? "Grátis" : `R$ ${cost.voice.toFixed(2)}`}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Slides ({durationToScenes(effectiveDuration)} imgs · {hub.slidesImage})</span>
                    <span className="text-white">{cost.slides === 0 ? "Grátis" : `R$ ${cost.slides.toFixed(2)}`}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Thumbnail ({hub.thumbImage})</span>
                    <span className="text-white">{cost.thumb === 0 ? "Grátis" : `R$ ${cost.thumb.toFixed(2)}`}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-white/10 pt-1.5 mt-1">
                    <span className="text-white">Total estimado</span>
                    <span className="text-primary text-lg">R$ {cost.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Hub + Kie shortcuts */}
              <div className="flex gap-2">
                <button
                  onClick={() => navigate("/hub")}
                  className="flex-1 flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
                >
                  <span className="flex items-center gap-2"><Zap className="w-4 h-4" /> Media Hub</span>
                  <span className="text-[10px] text-muted-foreground">Vozes · Preços</span>
                </button>
              </div>

              <Collapsible open={kieOpen} onOpenChange={setKieOpen}>
                <CollapsibleTrigger asChild>
                  <button className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm font-medium text-white hover:bg-black/40 transition-colors">
                    <span className="flex items-center gap-2"><ImageIcon className="w-4 h-4 text-orange-400" /> Gerador Kie</span>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${kieOpen ? 'rotate-180' : ''}`} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2"><KieGenerator channelId={channelId} topic={blueprint?.topic} /></CollapsibleContent>
              </Collapsible>

              {/* Generate button */}
              {step === 1 && (
                <Button
                  onClick={handleGenerateSummary}
                  disabled={!channelId || !idea.trim() || loading}
                  className="w-full gap-2 h-12 text-base"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                  Gerar Sumário e Capítulos
                </Button>
              )}
            </CardContent>
          </Card>

          {/* ═══════════════════════════ STEP 2: SUMMARY + CHAPTERS ═══════════════════════════ */}
          {step >= 2 && (
            <Card className={`transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 bg-card/30 backdrop-blur border-white/10 ${step === 2 ? 'ring-1 ring-primary/50 border-primary/30' : ''}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Lightbulb className="w-5 h-5 text-blue-500" /> 2. Sumário e Capítulos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Title + Hook */}
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <input
                      value={title}
                      onChange={e => setTitle(e.target.value.slice(0, 100))}
                      maxLength={100}
                      className="text-lg font-bold text-white bg-transparent flex-1 outline-none"
                      placeholder="Título do vídeo..."
                    />
                    <span className={`text-xs shrink-0 tabular-nums mt-1.5 ${title.length > 70 ? 'text-yellow-400' : 'text-muted-foreground'}`}>
                      {title.length}/70
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground italic">{hook}</p>
                </div>

                {/* Chapters list */}
                <div className="space-y-2">
                  {chapters.map((ch, i) => (
                    <div key={ch.id} className="p-3 bg-black/30 border border-white/10 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-primary/30 text-primary text-xs">Cap {i + 1}</Badge>
                        <input
                          value={ch.title}
                          onChange={e => {
                            setChapters(prev => prev.map(c =>
                              c.id === ch.id ? { ...c, title: e.target.value } : c
                            ));
                          }}
                          className="font-semibold text-white bg-transparent flex-1 outline-none text-sm"
                        />
                      </div>
                      <textarea
                        value={ch.summary}
                        onChange={e => {
                          setChapters(prev => prev.map(c =>
                            c.id === ch.id ? { ...c, summary: e.target.value } : c
                          ));
                        }}
                        className="mt-1.5 text-xs text-muted-foreground bg-transparent w-full outline-none resize-none"
                        rows={2}
                      />
                    </div>
                  ))}
                </div>

                {/* Generate all scripts */}
                {step === 2 && (
                  <Button
                    onClick={handleGenerateAllScripts}
                    disabled={loading || chapters.length === 0}
                    className="w-full gap-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                    Gerar Roteiros ({chapters.length} capítulos)
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* ═══════════════════════════ STEP 3: SCRIPTS PER CHAPTER ═══════════════════════════ */}
          {step >= 3 && (
            <Card className={`transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 bg-card/30 backdrop-blur border-white/10 ${step === 3 ? 'ring-1 ring-primary/50 border-primary/30' : ''}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <FileText className="w-5 h-5 text-purple-500" /> 3. Roteiros por Capítulo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {chapters.map((ch, i) => {
                  const isOpen = openChapters[ch.id] ?? (step === 3);
                  return (
                    <Collapsible key={ch.id} open={isOpen} onOpenChange={v => setOpenChapters(prev => ({ ...prev, [ch.id]: v }))}>
                      <div className="bg-black/30 border border-white/10 rounded-lg overflow-hidden">
                        <CollapsibleTrigger asChild>
                          <button className="flex w-full items-center justify-between p-3 hover:bg-white/5 transition-colors">
                            <div className="flex items-center gap-2">
                              {isOpen
                                ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                              <Badge variant="outline" className="border-purple-500/30 text-purple-400 text-xs">Cap {i + 1}</Badge>
                              <span className="text-sm font-medium text-white">{ch.title}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {ch.script.trim() ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                              ) : generatingChapter === ch.id ? (
                                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                              ) : null}
                            </div>
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="px-3 pb-3 space-y-2">
                            {ch.script.trim() ? (
                              <>
                                <textarea
                                  value={ch.script}
                                  onChange={e => setChapters(prev => prev.map(c =>
                                    c.id === ch.id ? { ...c, script: e.target.value } : c
                                  ))}
                                  className="w-full min-h-[200px] text-sm bg-black/40 border border-white/10 rounded-lg p-3 text-muted-foreground resize-y leading-relaxed"
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleGenerateChapterScript(ch.id)}
                                  disabled={generatingChapter === ch.id}
                                  className="gap-1.5 text-muted-foreground hover:text-white"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" /> Regenerar
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => handleGenerateChapterScript(ch.id)}
                                disabled={generatingChapter === ch.id}
                                className="gap-1.5"
                              >
                                {generatingChapter === ch.id
                                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  : <Wand2 className="w-3.5 h-3.5" />}
                                Gerar Roteiro
                              </Button>
                            )}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })}

                {step === 3 && allChaptersHaveScripts && (
                  <div className="flex gap-2">
                    <Button onClick={handleGenerateAllAudio} disabled={loading} className="flex-1 gap-2">
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                      Gerar Narração
                    </Button>
                    <Button onClick={handleSkipNarration} variant="outline" className="border-white/10">
                      Pular
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ═══════════════════════════ STEP 4: TTS PER CHAPTER ═══════════════════════════ */}
          {step === 4 && !allChaptersHaveAudio && chapters.some(ch => ch.audioUrl) && (
            <Card className="transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 bg-card/30 backdrop-blur border-white/10 ring-1 ring-primary/50 border-primary/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Mic className="w-5 h-5 text-green-500" /> 4. Narração por Capítulo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {chapters.map((ch, i) => (
                  <div key={ch.id} className="p-3 bg-black/30 border border-white/10 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="border-green-500/30 text-green-400 text-xs">Cap {i + 1}</Badge>
                      <span className="text-sm text-white">{ch.title}</span>
                    </div>
                    {ch.audioUrl ? (
                      ch.audioUrl === "browser_tts" ? (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Browser TTS</Badge>
                      ) : (
                        <audio controls src={ch.audioUrl} className="h-8" />
                      )
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleGenerateChapterAudio(ch.id)}
                        disabled={generatingAudio === ch.id}
                      >
                        {generatingAudio === ch.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mic className="w-3 h-3" />}
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* ═══════════════════════════ STEP 4→5: EXTRACT SCENES ═══════════════════════════ */}
          {step >= 4 && !allChaptersHaveScenes && (
            <Card className={`transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 bg-card/30 backdrop-blur border-white/10 ${step === 4 ? 'ring-1 ring-primary/50 border-primary/30' : ''}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Film className="w-5 h-5 text-orange-500" /> 5. Cenas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={handleExtractScenes} disabled={loading} className="w-full gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Film className="w-4 h-4" />}
                  Extrair Cenas dos Roteiros
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ═══════════════════════════ STEP 5: IMAGES ═══════════════════════════ */}
          {step >= 5 && allChaptersHaveScenes && (
            <Card className={`transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 bg-card/30 backdrop-blur border-white/10 ${step === 5 ? 'ring-1 ring-primary/50 border-primary/30' : ''}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <ImageIcon className="w-5 h-5 text-orange-500" /> 6. Imagens das Cenas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!allScenesHaveImages && (
                  <div className="flex gap-2">
                    <Button
                      onClick={handleGenerateAllImages}
                      disabled={allScenesLoading || loading}
                      className="flex-1 bg-orange-600 hover:bg-orange-700 text-white gap-2"
                    >
                      <ImageIcon className="w-4 h-4" />
                      Gerar Imagens ({scenesWithImages.length}/{allScenes.length})
                    </Button>
                    {allScenesLoading && (
                      <Button
                        variant="outline"
                        className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                        onClick={() => { cancelImagesRef.current = true; }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                )}

                {/* Scene grid by chapter */}
                {chapters.map((ch, ci) => (
                  <div key={ch.id}>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Cap {ci + 1}: {ch.title}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                      {ch.scenes.map((scene, si) => {
                        const key = `${ch.id}_${si}`;
                        return (
                          <div key={key} className="bg-black/30 border border-white/10 rounded-lg overflow-hidden">
                            {scene.imageUrl ? (
                              <div className="relative group">
                                <img src={scene.imageUrl} className="w-full h-40 object-cover" />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-white h-10 w-10 p-0 rounded-full bg-white/10 hover:bg-primary/20 backdrop-blur-md border border-white/10"
                                    onClick={() => {
                                      const flatIdx = chapters.slice(0, ci).reduce((sum, c) => sum + c.scenes.length, 0) + si;
                                      setPreviewingSceneIdx(flatIdx);
                                    }}
                                  >
                                    <Play className="w-5 h-5" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-white h-10 w-10 p-0 rounded-full bg-white/10 hover:bg-primary/20 backdrop-blur-md border border-white/10"
                                    onClick={() => handleGenerateSceneImage(ch.id, si)}
                                    disabled={!!generatingSceneImage[key]}
                                  >
                                    {generatingSceneImage[key] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="h-40 flex items-center justify-center bg-black/20">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleGenerateSceneImage(ch.id, si)}
                                  disabled={!!generatingSceneImage[key] || allScenesLoading}
                                >
                                  {generatingSceneImage[key] ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />} Gerar
                                </Button>
                              </div>
                            )}
                            <div className="p-2 space-y-1">
                              <p className="text-xs font-semibold text-orange-400 truncate">{si + 1}. {scene.title}</p>
                              <textarea
                                value={scene.narration}
                                onChange={e => {
                                  setChapters(prev => prev.map(c =>
                                    c.id === ch.id
                                      ? { ...c, scenes: c.scenes.map((s, i) => i === si ? { ...s, narration: e.target.value } : s) }
                                      : c
                                  ));
                                }}
                                className="w-full text-[10px] bg-black/40 border border-white/5 rounded p-1 text-muted-foreground resize-none h-10"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Remotion Preview */}
                {remotionSlides.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Play className="w-3 h-3" /> Preview Remotion
                    </h4>
                    <RemotionPreview slides={remotionSlides} />
                  </div>
                )}

                {allScenesHaveImages && step === 5 && (
                  <Button onClick={() => setStep(6)} className="w-full gap-2">
                    <ArrowRight className="w-4 h-4" /> Avançar para Thumbnail
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* ═══════════════════════════ STEP 6: THUMBNAIL ═══════════════════════════ */}
          {step >= 6 && (
            <Card className={`transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 bg-card/30 backdrop-blur border-white/10 ${step === 6 ? 'ring-1 ring-primary/50 border-primary/30' : ''}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <ImageIcon className="w-5 h-5 text-pink-500" /> 7. Thumbnail
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!thumbPrompt ? (
                  <Button onClick={handleGenerateThumb} disabled={loading} variant="secondary" className="w-full gap-2">
                    <Wand2 className="w-4 h-4" /> Gerar Conceito
                  </Button>
                ) : (
                  <div className="p-3 bg-black/40 border border-white/10 rounded-lg text-xs text-muted-foreground font-mono">{thumbPrompt}</div>
                )}
                {thumbPrompt && !thumbImageUrl && (
                  <Button onClick={handleGenerateThumbImage} disabled={loading} className="w-full bg-pink-600 hover:bg-pink-700 gap-2">
                    <ImageIcon className="w-4 h-4" /> Gerar Imagem
                  </Button>
                )}
                {thumbImageUrl && (
                  <div className="rounded-lg overflow-hidden border border-white/10">
                    <img src={thumbImageUrl} className="w-full object-cover" />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ═══════════════════════════ STEP 7: ASSEMBLE VIDEO ═══════════════════════════ */}
          {step >= 7 && (
            <Card className={`transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 bg-card/30 backdrop-blur border-white/10 ${step === 7 ? 'ring-1 ring-primary/50 border-primary/30' : ''}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Video className="w-5 h-5 text-emerald-500" /> 8. Montagem
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!videoUrl ? (
                  <div className="space-y-3">
                    <Button
                      onClick={handleAssembleVideo}
                      disabled={assembling || scenesWithImages.length === 0}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2"
                    >
                      {assembling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                      {assembling ? "Montando..." : "Montar Vídeo"}
                    </Button>
                    {assembling && (
                      <div className="space-y-2">
                        <Progress value={Math.min(videoProgress, 100)} className="h-2" />
                        <p className="text-xs text-muted-foreground font-mono">{Math.min(videoProgress, 100)}% concluído</p>
                        {videoLog && <pre className="text-xs text-green-400 bg-black/40 rounded p-2 max-h-24 overflow-y-auto whitespace-pre-wrap">{videoLog}</pre>}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="group relative rounded-xl overflow-hidden border-2 border-emerald-500/20 bg-black shadow-2xl">
                      <video
                        src={mp4Url || videoUrl}
                        controls
                        className="w-full aspect-video"
                        poster={thumbImageUrl || scenesWithImages[0]?.imageUrl}
                      />
                    </div>

                    {/* Download buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button asChild variant="outline" className="border-white/10">
                        <a href={videoUrl} download={`${title.replace(/[^a-zA-Z0-9]/g, '_')}.webm`}>
                          <Download className="w-4 h-4 mr-2" /> WebM
                        </a>
                      </Button>
                      {mp4Url ? (
                        <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
                          <a href={mp4Url} download={`${title.replace(/[^a-zA-Z0-9]/g, '_')}.mp4`}>
                            <Download className="w-4 h-4 mr-2" /> MP4
                          </a>
                        </Button>
                      ) : (
                        <Button
                          onClick={handleExportMp4}
                          disabled={ffmpegExporting}
                          className="bg-emerald-600 hover:bg-emerald-700 gap-2"
                        >
                          {ffmpegExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                          Exportar MP4
                        </Button>
                      )}
                    </div>

                    {/* FFmpeg progress */}
                    {ffmpegExporting && (
                      <div className="space-y-2">
                        <Progress value={ffmpegProgress} className="h-2" />
                        <p className="text-xs text-muted-foreground font-mono">{ffmpegProgress}% — FFmpeg.wasm</p>
                        {ffmpegLog && (
                          <pre className="text-xs text-blue-400 bg-black/40 rounded p-2 max-h-24 overflow-y-auto whitespace-pre-wrap">
                            {ffmpegLog.split("\n").slice(-8).join("\n")}
                          </pre>
                        )}
                      </div>
                    )}
                    {ffmpegError && (
                      <p className="text-xs text-red-400">{ffmpegError}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ═══════════════════════════ STEP 8: FINALIZE ═══════════════════════════ */}
          {step === 8 && (
            <div className="flex justify-end animate-in fade-in slide-in-from-bottom-4">
              <Button
                size="lg"
                onClick={() => setShowConfirmSave(true)}
                disabled={loading}
                className="w-full md:w-auto bg-green-600 hover:bg-green-700 gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Finalizar Conteúdo
              </Button>
            </div>
          )}

        </div>
      </main>

      {/* Confirmation Modal before Save */}
      {showConfirmSave && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="relative w-full max-w-2xl bg-card/50 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-transparent" />
            <div className="p-8 space-y-4">
              <h2 className="text-2xl font-bold text-white">Confirmar Publicação</h2>

              {/* Thumbnail preview */}
              {thumbImageUrl && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Thumbnail:</p>
                  <img src={thumbImageUrl} className="w-full max-h-40 object-cover rounded-lg" />
                </div>
              )}

              {/* Title + Description preview */}
              <div className="space-y-3 p-4 bg-black/30 border border-white/10 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Título</p>
                  <p className="text-lg font-bold text-white">{title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{title.length}/70 chars</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Descrição</p>
                  <p className="text-sm text-white/80 line-clamp-3">{hook}</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => setShowConfirmSave(false)}
                  variant="outline"
                  className="flex-1 border-white/10"
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleFinalize}
                  className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Confirmar e Salvar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scene Preview Modal */}
      {previewingSceneIdx !== null && allScenes[previewingSceneIdx] && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="relative w-full max-w-4xl aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
            <div className="absolute top-6 right-6 z-50">
              <Button variant="ghost" size="icon" onClick={() => setPreviewingSceneIdx(null)} className="rounded-full bg-white/10 text-white h-12 w-12 backdrop-blur-md border border-white/10">
                <X className="w-6 h-6" />
              </Button>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <ScenePreviewPlayer
                imageUrl={allScenes[previewingSceneIdx].imageUrl!}
                subtitle={allScenes[previewingSceneIdx].narration}
              />
            </div>
            <div className="absolute bottom-8 left-8 right-8 pointer-events-none">
              <Badge variant="secondary" className="w-fit bg-primary/20 text-primary border-primary/20 mb-2">
                Cena {previewingSceneIdx + 1}: {allScenes[previewingSceneIdx].title}
              </Badge>
              <p className="text-sm text-white/60 font-medium tracking-tight">Ken Burns 8% + Legendas Alta Retenção</p>
            </div>
          </div>
        </div>
      )}
    </BeamsBackground>
  );
}

// ─── Scene Preview Player ─────────────────────────────────────────────────────

function ScenePreviewPlayer({ imageUrl, subtitle }: { imageUrl: string; subtitle: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    let af: number;
    const start = Date.now();
    const DURATION = 6000;
    const draw = () => {
      const elapsed = (Date.now() - start) % DURATION;
      const progress = elapsed / DURATION;
      canvas.width = 1920; canvas.height = 1080;
      ctx.fillStyle = "#000"; ctx.fillRect(0, 0, 1920, 1080);
      if (img.complete) {
        const scale = Math.max(1920 / img.naturalWidth, 1080 / img.naturalHeight);
        const w = img.naturalWidth * scale; const h = img.naturalHeight * scale;
        const zoom = 1 + progress * 0.08;
        ctx.save();
        ctx.translate(960, 540); ctx.scale(zoom, zoom); ctx.translate(-960, -540);
        ctx.drawImage(img, (1920 - w) / 2, (1080 - h) / 2, w, h);
        ctx.restore();
        const words = subtitle.split(" ");
        const CHUNK = 7;
        const chunks: string[] = [];
        for (let w = 0; w < words.length; w += CHUNK) chunks.push(words.slice(w, w + CHUNK).join(" "));
        const chunkIdx = Math.floor(progress * chunks.length) % chunks.length;
        const sub = chunks[chunkIdx] || "";
        if (sub) {
          ctx.font = "bold 64px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
          const y = 1080 - 120;
          const m = ctx.measureText(sub);
          const pad = 30;
          ctx.fillStyle = "rgba(0,0,0,0.55)";
          ctx.beginPath();
          ctx.roundRect(960 - m.width / 2 - pad, y - 74, m.width + pad * 2, 84, 10);
          ctx.fill();
          ctx.strokeStyle = "rgba(0,0,0,0.9)"; ctx.lineWidth = 12; ctx.strokeText(sub, 960, y);
          ctx.fillStyle = "#FFFF00"; ctx.fillText(sub, 960, y);
        }
      } else {
        ctx.fillStyle = "#333"; ctx.font = "48px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("Carregando Preview...", 960, 540);
      }
      af = requestAnimationFrame(draw);
    };
    img.onload = () => { draw(); };
    draw();
    return () => cancelAnimationFrame(af);
  }, [imageUrl, subtitle]);
  return <canvas ref={canvasRef} className="w-full h-full object-contain" />;
}
