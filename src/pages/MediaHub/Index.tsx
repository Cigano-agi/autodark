import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BeamsBackground } from "@/components/ui/beams-background";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useChannels } from "@/hooks/useChannels";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mic,
  Image as ImageIcon,
  Film,
  CheckCircle2,
  Play,
  Loader2,
  Zap,
  DollarSign,
  Star,
  ArrowLeft,
  Settings2,
  Layout,
  Layers,
} from "lucide-react";
import { toast } from "sonner";

const KIE_API_KEY = (import.meta.env.VITE_KIE_API_KEY as string | undefined)
  ?.replace(/['"]/g, "")
  .trim();

// ─── Storage ──────────────────────────────────────────────────────────────────
const STORAGE_KEY = "autodark_hub_defaults_v2";

interface ChannelDefaults {
  voice: string;
  voiceId: string;
  slidesImage: string;
  thumbImage: string;
  videoModel: string;
}

interface HubDefaults {
  [channelId: string]: ChannelDefaults;
}

const DEFAULT_CHANNEL: ChannelDefaults = {
  voice: "browser",
  voiceId: "browser_pt",
  slidesImage: "pexels",
  thumbImage: "kie_flux",
  videoModel: "none",
};

function loadDefaults(): HubDefaults {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveDefaults(defaults: HubDefaults): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
}

// ─── Voice Providers ──────────────────────────────────────────────────────────
interface VoiceOption {
  id: string;
  label: string;
  lang: string;
}

interface VoiceProvider {
  id: string;
  name: string;
  provider: string;
  description: string;
  pricePerMin: number;
  quality: "baixa" | "média" | "alta" | "premium";
  voices: VoiceOption[];
  available: boolean;
  badge?: string;
}

const VOICE_PROVIDERS: VoiceProvider[] = [
  {
    id: "browser",
    name: "Navegador (Web Speech)",
    provider: "Browser",
    description: "TTS nativo do Chrome/Edge. Sem custo, qualidade básica.",
    pricePerMin: 0,
    quality: "baixa",
    voices: [
      { id: "browser_pt", label: "Português (padrão)", lang: "pt-BR" },
      { id: "browser_en", label: "English (padrão)", lang: "en-US" },
    ],
    available: true,
    badge: "GRÁTIS",
  },
  {
    id: "openai",
    name: "OpenAI TTS",
    provider: "OpenAI via AI33",
    description: "Vozes naturais da OpenAI. Melhor custo-benefício.",
    pricePerMin: 0.45,
    quality: "alta",
    voices: [
      { id: "alloy", label: "Alloy (neutro)", lang: "pt-BR" },
      { id: "onyx", label: "Onyx (grave masculino)", lang: "pt-BR" },
      { id: "nova", label: "Nova (feminino suave)", lang: "pt-BR" },
      { id: "shimmer", label: "Shimmer (feminino cálido)", lang: "pt-BR" },
      { id: "echo", label: "Echo (masculino médio)", lang: "pt-BR" },
      { id: "fable", label: "Fable (britânico)", lang: "pt-BR" },
    ],
    available: true,
    badge: "R$ 0,45/min",
  },
  {
    id: "fish",
    name: "Fish Audio",
    provider: "Fish Audio API",
    description:
      "Qualidade próxima ao ElevenLabs, com clonagem de voz. Melhor custo-benefício premium.",
    pricePerMin: 1.8,
    quality: "premium",
    voices: [
      { id: "fish_en_male", label: "Male EN (Natural)", lang: "en-US" },
      { id: "fish_en_female", label: "Female EN (Warm)", lang: "en-US" },
      { id: "fish_es_male", label: "Male ES (Spain)", lang: "es-ES" },
      { id: "fish_pt_male", label: "Male PT-BR", lang: "pt-BR" },
    ],
    available: false,
    badge: "R$ 1,80/min",
  },
  {
    id: "elevenlabs",
    name: "ElevenLabs",
    provider: "ElevenLabs API",
    description: "Qualidade premium com clonagem de voz. Requer API key.",
    pricePerMin: 9.0,
    quality: "premium",
    voices: [
      { id: "Rachel", label: "Rachel (feminino EN)", lang: "en-US" },
      { id: "Adam", label: "Adam (masculino EN)", lang: "en-US" },
      { id: "Bella", label: "Bella (feminino suave)", lang: "en-US" },
    ],
    available: false,
    badge: "R$ 9,00/min",
  },
  {
    id: "google_chirp",
    name: "Google Cloud TTS — Chirp3-HD",
    provider: "Google Cloud",
    description: "Vozes Chirp3-HD. Melhor pronúncia em pt-BR do mercado. Requer GOOGLE_TTS_API_KEY.",
    pricePerMin: 0.18,
    quality: "premium",
    voices: [
      { id: "pt-BR-Chirp3-HD-Algenib",   label: "Algenib (masculino)", lang: "pt-BR" },
      { id: "pt-BR-Chirp3-HD-Autonoe",   label: "Autonoe (feminino)", lang: "pt-BR" },
      { id: "pt-BR-Chirp3-HD-Enceladus", label: "Enceladus (masculino grave)", lang: "pt-BR" },
      { id: "pt-BR-Chirp3-HD-Gacrux",    label: "Gacrux (feminino cálido)", lang: "pt-BR" },
      { id: "pt-BR-Chirp3-HD-Sadaltager",label: "Sadaltager (neutro)", lang: "pt-BR" },
      { id: "en-US-Chirp3-HD-Despina",   label: "Despina EN (feminino)", lang: "en-US" },
      { id: "en-US-Chirp3-HD-Gacrux",    label: "Gacrux EN (masculino)", lang: "en-US" },
    ],
    available: true,
    badge: "R$ 0,18/min",
  },
];

// ─── Image Providers ──────────────────────────────────────────────────────────
interface ImageProvider {
  id: string;
  name: string;
  provider: string;
  description: string;
  pricePerImage: number;
  quality: "baixa" | "média" | "alta" | "premium";
  resolution: string;
  avgTime: string;
  available: boolean;
  badge?: string;
  useCase: string;
}

const IMAGE_PROVIDERS: ImageProvider[] = [
  {
    id: "placeholder",
    name: "Placeholder Canvas",
    provider: "Browser Canvas",
    description: "Geração local no navegador. Sem custo, aparência básica.",
    pricePerImage: 0,
    quality: "baixa",
    resolution: "1792×1024",
    avgTime: "< 1s",
    available: true,
    badge: "GRÁTIS",
    useCase: "slides",
  },
  {
    id: "pexels",
    name: "Pexels / Unsplash",
    provider: "API Gratuita",
    description:
      "Fotos stock de alta qualidade. Ideal para slides de vídeos sem personagem específico.",
    pricePerImage: 0,
    quality: "média",
    resolution: "1920×1080",
    avgTime: "< 1s",
    available: true,
    badge: "GRÁTIS",
    useCase: "slides",
  },
  {
    id: "kie_flux",
    name: "FLUX Kontext Pro",
    provider: "Kie.ai",
    description: "Imagens fotorrealistas de alta qualidade. ~3 min por imagem.",
    pricePerImage: 0.3,
    quality: "premium",
    resolution: "16:9 (1280×720+)",
    avgTime: "~3 min",
    available: !!KIE_API_KEY,
    badge: "R$ 0,30/img",
    useCase: "thumbnail + slides",
  },
  {
    id: "dalle3",
    name: "DALL-E 3",
    provider: "OpenAI via AI33",
    description: "Qualidade HD com compreensão semântica avançada.",
    pricePerImage: 0.24,
    quality: "alta",
    resolution: "1792×1024",
    avgTime: "~15s",
    available: false,
    badge: "R$ 0,24/img",
    useCase: "thumbnail + slides",
  },
  {
    id: "ideogram",
    name: "Ideogram 2.0",
    provider: "Ideogram API",
    description:
      "Ótimo para texto em imagens e ilustrações. Requer API key.",
    pricePerImage: 0.48,
    quality: "alta",
    resolution: "1344×768",
    avgTime: "~10s",
    available: false,
    badge: "R$ 0,48/img",
    useCase: "thumbnail",
  },
];

// Providers adequados para thumbnail (qualidade alta+)
const THUMB_PROVIDERS = IMAGE_PROVIDERS.filter(
  (p) => p.quality === "alta" || p.quality === "premium"
);

// ─── Video Providers ───────────────────────────────────────────────────────────
interface VideoProvider {
  id: string;
  name: string;
  provider: string;
  description: string;
  pricePerClip: number;
  clipDuration: number;
  quality: "média" | "alta" | "premium";
  available: boolean;
  badge?: string;
}

const VIDEO_PROVIDERS: VideoProvider[] = [
  {
    id: "none",
    name: "Não usar (só imagens)",
    provider: "—",
    description:
      "100% imagens estáticas com Ken Burns. Mais barato e sem latência.",
    pricePerClip: 0,
    clipDuration: 0,
    quality: "média",
    available: true,
    badge: "GRÁTIS",
  },
  {
    id: "vo3",
    name: "Veo 3 (VO3)",
    provider: "Google via AI33",
    description:
      "Clipes de 10s de alta qualidade. Bom para cenas de ação e natureza.",
    pricePerClip: 1.8,
    clipDuration: 10,
    quality: "premium",
    available: false,
    badge: "R$ 1,80/clipe",
  },
  {
    id: "sora",
    name: "Sora 2",
    provider: "OpenAI via AI33",
    description:
      "Geração de vídeo realista com consistência temporal. Melhor para personagens.",
    pricePerClip: 3.6,
    clipDuration: 10,
    quality: "premium",
    available: false,
    badge: "R$ 3,60/clipe",
  },
];

// ─── Shared Helpers ────────────────────────────────────────────────────────────
const qualityColor: Record<string, string> = {
  baixa: "text-zinc-400 border-zinc-700",
  média: "text-blue-400 border-blue-700",
  alta: "text-orange-400 border-orange-700",
  premium: "text-yellow-400 border-yellow-600",
};

const qualityStars: Record<string, number> = {
  baixa: 1,
  média: 2,
  alta: 3,
  premium: 4,
};

function QualityStars({ quality }: { quality: string }) {
  const count = qualityStars[quality] ?? 1;
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4].map((n) => (
          <Star
            key={n}
            className={`w-3 h-3 ${
              n <= count
                ? "text-yellow-400 fill-yellow-400"
                : "text-zinc-700"
            }`}
          />
        ))}
      </div>
      <span className={`text-[10px] capitalize ${qualityColor[quality]}`}>
        {quality}
      </span>
    </div>
  );
}

// ─── Duration Pill Selector ────────────────────────────────────────────────────
const DURATION_PRESETS = [8, 15, 20] as const;

function DurationSelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [custom, setCustom] = useState("");
  const isPreset = (DURATION_PRESETS as readonly number[]).includes(value);

  const handleCustomChange = (raw: string) => {
    setCustom(raw);
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed) && parsed > 0) onChange(parsed);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {DURATION_PRESETS.map((d) => (
        <button
          key={d}
          onClick={() => { onChange(d); setCustom(""); }}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
            value === d && isPreset
              ? "bg-primary/20 text-primary border-primary/40"
              : "border-white/10 text-muted-foreground hover:text-white hover:border-white/30"
          }`}
        >
          {d} min
        </button>
      ))}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => { if (!isPreset) return; onChange(0); setCustom(""); }}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
            !isPreset
              ? "bg-primary/20 text-primary border-primary/40"
              : "border-white/10 text-muted-foreground hover:text-white hover:border-white/30"
          }`}
        >
          Personalizado
        </button>
        {!isPreset && (
          <Input
            type="number"
            min={1}
            value={custom}
            onChange={(e) => handleCustomChange(e.target.value)}
            placeholder="min"
            className="w-16 h-7 text-xs bg-black/30 border-white/10 text-white text-center"
          />
        )}
      </div>
    </div>
  );
}

// ─── Cost Calculator ───────────────────────────────────────────────────────────
const VIDEO_MIX_RATIO = 0.3; // 30% dos slides substituídos por clipes

interface CostBreakdown {
  narration: number;
  slides: number;
  thumb: number;
  video: number;
  total: number;
  slideCount: number;
  clipCount: number;
}

function calcCost(
  durationMin: number,
  defaults: ChannelDefaults
): CostBreakdown {
  const voice = VOICE_PROVIDERS.find((v) => v.id === defaults.voice);
  const slidesProvider = IMAGE_PROVIDERS.find(
    (p) => p.id === defaults.slidesImage
  );
  const thumbProvider = IMAGE_PROVIDERS.find(
    (p) => p.id === defaults.thumbImage
  );
  const videoProvider = VIDEO_PROVIDERS.find(
    (v) => v.id === defaults.videoModel
  );

  const narration = (voice?.pricePerMin ?? 0) * durationMin;

  const totalSlides = Math.ceil((durationMin * 60) / 8);
  const slides = (slidesProvider?.pricePerImage ?? 0) * totalSlides;

  const thumb = thumbProvider?.pricePerImage ?? 0;

  const totalSeconds = durationMin * 60;
  const clipCount =
    videoProvider && videoProvider.clipDuration > 0
      ? Math.ceil(
          (totalSeconds * VIDEO_MIX_RATIO) / videoProvider.clipDuration
        )
      : 0;
  const video = (videoProvider?.pricePerClip ?? 0) * clipCount;

  return {
    narration,
    slides,
    thumb,
    video,
    total: narration + slides + thumb + video,
    slideCount: totalSlides,
    clipCount,
  };
}

function formatBRL(value: number): string {
  return value === 0
    ? "R$ 0"
    : `R$ ${value.toFixed(2).replace(".", ",")}`;
}

function CostCalculator({ defaults }: { defaults: ChannelDefaults }) {
  const [duration, setDuration] = useState(15);
  const voice = VOICE_PROVIDERS.find((v) => v.id === defaults.voice);
  const slidesProvider = IMAGE_PROVIDERS.find(
    (p) => p.id === defaults.slidesImage
  );
  const thumbProvider = IMAGE_PROVIDERS.find(
    (p) => p.id === defaults.thumbImage
  );
  const videoProvider = VIDEO_PROVIDERS.find(
    (v) => v.id === defaults.videoModel
  );
  const breakdown = calcCost(duration, defaults);

  const voiceLabel = voice
    ? `${voice.name} • ${VOICE_PROVIDERS.find((v) => v.id === defaults.voice)?.voices.find((vo) => vo.id === defaults.voiceId)?.label ?? voice.voices[0]?.label ?? "—"}`
    : "—";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-muted-foreground">Duração:</span>
        <DurationSelector value={duration} onChange={setDuration} />
      </div>

      <div className="p-5 bg-black/30 border border-white/10 rounded-xl space-y-3">
        <p className="text-sm font-semibold text-white">
          Vídeo de {duration} min
        </p>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Narração ({voiceLabel})</span>
            <span className="text-white font-medium">
              {formatBRL(breakdown.narration)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              Slides ({slidesProvider?.name ?? "—"} • {breakdown.slideCount} slides)
            </span>
            <span className="text-white font-medium">
              {formatBRL(breakdown.slides)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              Thumbnail ({thumbProvider?.name ?? "—"})
            </span>
            <span className="text-white font-medium">
              {formatBRL(breakdown.thumb)}
            </span>
          </div>
          {videoProvider && videoProvider.id !== "none" && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Vídeo ({videoProvider.name} • {breakdown.clipCount} clipes • 30%)
              </span>
              <span className="text-white font-medium">
                {formatBRL(breakdown.video)}
              </span>
            </div>
          )}
        </div>

        <div className="border-t border-white/10 pt-3 space-y-1">
          <div className="flex justify-between text-sm font-bold">
            <span className="text-white">TOTAL ESTIMADO</span>
            <span className="text-primary">{formatBRL(breakdown.total)}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-muted-foreground">Por mês (4 vídeos/semana)</span>
            <span className="text-muted-foreground">
              {formatBRL(breakdown.total * 16)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function MediaHub() {
  const navigate = useNavigate();
  const { channels } = useChannels();
  const [selectedChannelId, setSelectedChannelId] = useState("global");
  const [defaults, setDefaults] = useState<HubDefaults>(loadDefaults);

  // Voice test
  const [testText, setTestText] = useState(
    "Olá! Este é um teste de voz para o canal AutoDark. A narração soa natural e clara."
  );
  const [testingVoice, setTestingVoice] = useState<string | null>(null);

  // Pending voice selection (before confirming as default)
  const [pendingVoiceProvider, setPendingVoiceProvider] = useState<string | null>(null);
  const [pendingVoiceId, setPendingVoiceId] = useState<string>("");

  const currentDefaults: ChannelDefaults =
    defaults[selectedChannelId] ?? { ...DEFAULT_CHANNEL };

  const updateDefault = (patch: Partial<ChannelDefaults>) => {
    const updated: HubDefaults = {
      ...defaults,
      [selectedChannelId]: { ...currentDefaults, ...patch },
    };
    setDefaults(updated);
    saveDefaults(updated);
    toast.success(
      `Padrão salvo para ${
        selectedChannelId === "global" ? "todos os canais" : "este canal"
      }!`
    );
  };

  const handleSetVoiceDefault = (provider: VoiceProvider) => {
    if (pendingVoiceProvider === provider.id && pendingVoiceId) {
      updateDefault({ voice: provider.id, voiceId: pendingVoiceId });
      setPendingVoiceProvider(null);
      setPendingVoiceId("");
    } else {
      setPendingVoiceProvider(provider.id);
      setPendingVoiceId(provider.voices[0]?.id ?? "");
    }
  };

  const confirmVoiceDefault = (provider: VoiceProvider) => {
    if (!pendingVoiceId) return;
    updateDefault({ voice: provider.id, voiceId: pendingVoiceId });
    setPendingVoiceProvider(null);
    setPendingVoiceId("");
  };

  const testVoice = async (provider: VoiceProvider, voiceId: string) => {
    if (!provider.available) {
      toast.error("API não configurada.");
      return;
    }
    setTestingVoice(voiceId);
    try {
      if (provider.id === "browser") {
        const utterance = new SpeechSynthesisUtterance(testText);
        utterance.lang = "pt-BR";
        utterance.rate = 0.95;
        const voices = speechSynthesis.getVoices();
        const ptVoice = voices.find((v) => v.lang.startsWith("pt"));
        if (ptVoice) utterance.voice = ptVoice;
        await new Promise<void>((resolve) => {
          utterance.onend = () => resolve();
          speechSynthesis.speak(utterance);
        });
      } else {
        toast.info("API não disponível no momento.");
      }
    } catch {
      toast.error("Erro ao testar voz.");
    } finally {
      setTestingVoice(null);
    }
  };

  return (
    <BeamsBackground intensity="subtle" className="bg-background">
      <main className="pt-28 pb-16 px-6 max-w-6xl mx-auto min-h-screen relative z-10">
        <div className="space-y-10 animate-in fade-in duration-300">

          {/* ── Header ── */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-white gap-1.5 -ml-2"
                  onClick={() => navigate(-1)}
                >
                  <ArrowLeft className="w-4 h-4" /> Voltar
                </Button>
              </div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Settings2 className="w-8 h-8 text-primary" />
                Media Hub
              </h1>
              <p className="text-muted-foreground mt-1">
                Configure as APIs de voz, imagem e vídeo por canal.
              </p>
            </div>

            <div className="flex flex-col items-end gap-1">
              <span className="text-xs text-muted-foreground">
                Configurar padrão para:
              </span>
              <Select
                value={selectedChannelId}
                onValueChange={setSelectedChannelId}
              >
                <SelectTrigger className="w-52 bg-black/30 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Todos os canais</SelectItem>
                  {channels.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── Vozes TTS ── */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Mic className="w-5 h-5 text-green-400" />
              <h2 className="text-xl font-semibold text-white">Narração (TTS)</h2>
              <Badge
                variant="outline"
                className="text-muted-foreground border-white/10 text-xs ml-1"
              >
                Preços estimados em BRL (USD × 6)
              </Badge>
            </div>

            <div className="p-4 bg-black/20 border border-white/10 rounded-xl">
              <label className="text-xs text-muted-foreground mb-2 block">
                Texto para teste de voz:
              </label>
              <Textarea
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                className="bg-black/30 border-white/10 text-white text-sm h-16 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {VOICE_PROVIDERS.map((provider) => {
                const isDefault = currentDefaults.voice === provider.id;
                const isPending = pendingVoiceProvider === provider.id;

                return (
                  <Card
                    key={provider.id}
                    className={`relative bg-card/40 backdrop-blur border transition-all duration-200 ${
                      isDefault
                        ? "border-primary/60 ring-1 ring-primary/30"
                        : "border-white/10"
                    } ${!provider.available ? "opacity-60" : ""}`}
                  >
                    {isDefault && (
                      <div className="absolute top-3 right-3">
                        <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" /> PADRÃO
                        </Badge>
                      </div>
                    )}
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <CardTitle className="text-base text-white">
                            {provider.name}
                          </CardTitle>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {provider.provider}
                          </p>
                        </div>
                        {provider.badge && (
                          <Badge
                            variant="outline"
                            className={`text-[10px] border shrink-0 ${
                              provider.pricePerMin === 0
                                ? "text-green-400 border-green-700"
                                : qualityColor[provider.quality]
                            }`}
                          >
                            {provider.badge}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {provider.description}
                      </p>

                      <QualityStars quality={provider.quality} />

                      {provider.pricePerMin > 0 && (
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <DollarSign className="w-3 h-3 text-green-500" />
                          Vídeo 5min ≈{" "}
                          <span className="text-white font-medium">
                            R$ {(provider.pricePerMin * 5).toFixed(2)}
                          </span>
                        </div>
                      )}

                      <div className="space-y-1">
                        {provider.voices.slice(0, 3).map((v) => (
                          <div
                            key={v.id}
                            className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-white/5 group"
                          >
                            <span className="text-xs text-white">{v.label}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-[10px] text-muted-foreground group-hover:text-white gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => testVoice(provider, v.id)}
                              disabled={
                                testingVoice === v.id || !provider.available
                              }
                            >
                              {testingVoice === v.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Play className="w-3 h-3" />
                              )}
                              Testar
                            </Button>
                          </div>
                        ))}
                        {provider.voices.length > 3 && (
                          <p className="text-[10px] text-muted-foreground pl-2">
                            +{provider.voices.length - 3} vozes...
                          </p>
                        )}
                      </div>

                      {/* Voice selection before saving default */}
                      {isPending && (
                        <div className="pt-1 space-y-2">
                          <label className="text-[10px] text-muted-foreground">
                            Voz padrão:
                          </label>
                          <Select
                            value={pendingVoiceId}
                            onValueChange={setPendingVoiceId}
                          >
                            <SelectTrigger className="h-7 text-xs bg-black/30 border-white/10 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {provider.voices.map((v) => (
                                <SelectItem key={v.id} value={v.id}>
                                  {v.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            className="w-full text-xs bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 gap-1.5"
                            onClick={() => confirmVoiceDefault(provider)}
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            Confirmar padrão
                          </Button>
                        </div>
                      )}

                      {!isPending && (
                        <div className="pt-1">
                          {provider.available ? (
                            <Button
                              size="sm"
                              variant={isDefault ? "default" : "outline"}
                              className={`w-full text-xs gap-1.5 ${
                                isDefault
                                  ? "bg-primary/20 text-primary border-primary/30 hover:bg-primary/30"
                                  : "border-white/10 text-muted-foreground hover:text-white"
                              }`}
                              onClick={() => handleSetVoiceDefault(provider)}
                            >
                              <Zap className="w-3 h-3" />
                              {isDefault ? "Padrão ativo" : "Usar como padrão"}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full text-xs border-white/10 text-muted-foreground/50 cursor-not-allowed"
                              disabled
                            >
                              API não configurada
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          {/* ── Imagens — Slides ── */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Layout className="w-5 h-5 text-orange-400" />
              <h2 className="text-xl font-semibold text-white">
                Imagens — Slides
              </h2>
              <Badge
                variant="outline"
                className="text-muted-foreground border-white/10 text-xs ml-1"
              >
                1 imagem a cada ~8s
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {IMAGE_PROVIDERS.map((provider) => {
                const isDefault = currentDefaults.slidesImage === provider.id;
                return (
                  <ImageProviderCard
                    key={provider.id}
                    provider={provider}
                    isDefault={isDefault}
                    accentColor="orange"
                    onSelect={() =>
                      updateDefault({ slidesImage: provider.id })
                    }
                  />
                );
              })}
            </div>
          </section>

          {/* ── Imagens — Thumbnail ── */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-yellow-400" />
              <h2 className="text-xl font-semibold text-white">
                Imagens — Thumbnail
              </h2>
              <Badge
                variant="outline"
                className="text-muted-foreground border-white/10 text-xs ml-1"
              >
                1 thumbnail por vídeo
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {THUMB_PROVIDERS.map((provider) => {
                const isDefault = currentDefaults.thumbImage === provider.id;
                return (
                  <ImageProviderCard
                    key={provider.id}
                    provider={provider}
                    isDefault={isDefault}
                    accentColor="yellow"
                    onSelect={() =>
                      updateDefault({ thumbImage: provider.id })
                    }
                  />
                );
              })}
            </div>
          </section>

          {/* ── Geração de Vídeo ── */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Film className="w-5 h-5 text-purple-400" />
              <h2 className="text-xl font-semibold text-white">
                Geração de Vídeo (VO3 / Sora)
              </h2>
              <Badge
                variant="outline"
                className="text-muted-foreground border-white/10 text-xs ml-1"
              >
                30% dos slides substituídos por clipes
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {VIDEO_PROVIDERS.map((provider) => {
                const isDefault = currentDefaults.videoModel === provider.id;
                return (
                  <Card
                    key={provider.id}
                    className={`relative bg-card/40 backdrop-blur border transition-all duration-200 ${
                      isDefault
                        ? "border-purple-500/60 ring-1 ring-purple-500/30"
                        : "border-white/10"
                    } ${!provider.available ? "opacity-60" : ""}`}
                  >
                    {isDefault && (
                      <div className="absolute top-3 right-3">
                        <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-[10px] gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" /> PADRÃO
                        </Badge>
                      </div>
                    )}
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <CardTitle className="text-sm text-white pr-14">
                            {provider.name}
                          </CardTitle>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {provider.provider}
                          </p>
                        </div>
                        {provider.badge && (
                          <Badge
                            variant="outline"
                            className={`text-[10px] border shrink-0 ${
                              provider.pricePerClip === 0
                                ? "text-green-400 border-green-700"
                                : "text-purple-400 border-purple-700"
                            }`}
                          >
                            {provider.badge}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {provider.description}
                      </p>

                      {provider.clipDuration > 0 && (
                        <div className="space-y-1 text-[10px]">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Duração do clipe:
                            </span>
                            <span className="text-white">
                              {provider.clipDuration}s
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Custo/clipe:
                            </span>
                            <span className="text-purple-300 font-bold">
                              R$ {provider.pricePerClip.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )}

                      {provider.available ? (
                        <Button
                          size="sm"
                          variant={isDefault ? "default" : "outline"}
                          className={`w-full text-xs gap-1.5 ${
                            isDefault
                              ? "bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30"
                              : "border-white/10 text-muted-foreground hover:text-white"
                          }`}
                          onClick={() =>
                            updateDefault({ videoModel: provider.id })
                          }
                        >
                          <Zap className="w-3 h-3" />
                          {isDefault ? "Padrão ativo" : "Usar como padrão"}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs border-white/10 text-muted-foreground/50"
                          disabled
                        >
                          Não disponível
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          {/* ── Calculadora de Custo ── */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              <h2 className="text-xl font-semibold text-white">
                Calculadora de Custo
              </h2>
              <Badge
                variant="outline"
                className="text-muted-foreground border-white/10 text-xs ml-1"
              >
                Baseada nos padrões do canal selecionado
              </Badge>
            </div>
            <div className="max-w-lg p-5 bg-black/20 border border-white/10 rounded-xl">
              <CostCalculator defaults={currentDefaults} />
            </div>
          </section>

        </div>
      </main>
    </BeamsBackground>
  );
}

// ─── Image Provider Card (shared between Slides and Thumbnail sections) ────────
interface ImageProviderCardProps {
  provider: ImageProvider;
  isDefault: boolean;
  accentColor: "orange" | "yellow";
  onSelect: () => void;
}

function ImageProviderCard({
  provider,
  isDefault,
  accentColor,
  onSelect,
}: ImageProviderCardProps) {
  const accent =
    accentColor === "orange"
      ? {
          border: "border-orange-500/60 ring-1 ring-orange-500/30",
          badge: "bg-orange-500/20 text-orange-400 border-orange-500/30",
          button: "bg-orange-500/20 text-orange-400 border-orange-500/30 hover:bg-orange-500/30",
        }
      : {
          border: "border-yellow-500/60 ring-1 ring-yellow-500/30",
          badge: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
          button: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30",
        };

  return (
    <Card
      className={`relative bg-card/40 backdrop-blur border transition-all duration-200 ${
        isDefault ? accent.border : "border-white/10"
      } ${!provider.available ? "opacity-60" : ""}`}
    >
      {isDefault && (
        <div className="absolute top-3 right-3">
          <Badge className={`${accent.badge} text-[10px] gap-1`}>
            <CheckCircle2 className="w-2.5 h-2.5" /> PADRÃO
          </Badge>
        </div>
      )}
      <CardHeader className="pb-2">
        <div>
          <CardTitle className="text-sm text-white pr-14">
            {provider.name}
          </CardTitle>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {provider.provider}
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground leading-relaxed">
          {provider.description}
        </p>

        {/* Use-case badge */}
        <Badge
          variant="outline"
          className="text-[10px] border-white/10 text-muted-foreground"
        >
          {provider.useCase}
        </Badge>

        <QualityStars quality={provider.quality} />

        <div className="space-y-1 text-[10px]">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Resolução:</span>
            <span className="text-white">{provider.resolution}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tempo médio:</span>
            <span className="text-white">{provider.avgTime}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Custo/imagem:</span>
            <span
              className={`font-bold ${
                provider.pricePerImage === 0
                  ? "text-green-400"
                  : "text-orange-300"
              }`}
            >
              {provider.pricePerImage === 0
                ? "Grátis"
                : `R$ ${provider.pricePerImage.toFixed(2)}`}
            </span>
          </div>
        </div>

        {provider.available ? (
          <Button
            size="sm"
            variant={isDefault ? "default" : "outline"}
            className={`w-full text-xs gap-1.5 ${
              isDefault
                ? accent.button
                : "border-white/10 text-muted-foreground hover:text-white"
            }`}
            onClick={onSelect}
          >
            <Zap className="w-3 h-3" />
            {isDefault ? "Padrão ativo" : "Usar como padrão"}
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="w-full text-xs border-white/10 text-muted-foreground/50"
            disabled
          >
            Não configurado
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
