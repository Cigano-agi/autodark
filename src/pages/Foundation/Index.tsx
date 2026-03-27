import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Loader2, Wand2, CheckCircle2, ChevronRight, ChevronLeft, Sparkles, BookOpen, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  useChannelFoundation, useSaveFoundation, useGenerateDirectives,
  FOUNDATION_DEFAULTS, type ChannelFoundation, type SeedChannel,
} from "@/hooks/useChannelFoundation";


// ─── Block labels ─────────────────────────────────────────────────────────────

const BLOCKS = [
  { id: "A", label: "Identidade",         questions: "1–5",  description: "Nicho, angle, inimigo narrativo, assinatura" },
  { id: "B", label: "Modelo de Negócio",  questions: "6–10", description: "Frequência, duração, sub-nichos, monetização" },
  { id: "C", label: "Stack de Produção",  questions: "11–15",description: "Hardware, APIs, voz, evidências" },
  { id: "D", label: "Arquitetura",        questions: "16–20",description: "Canais seed, RSS, Z-Score, narrativa, qualidade" },
  { id: "E", label: "Operação",           questions: "21–25",description: "Calendário, feedback loop, riscos, fosso" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FormField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm text-white/80">{label}</Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}

function TagInput({ value, onChange, placeholder }: {
  value: string[]; onChange: (v: string[]) => void; placeholder?: string;
}) {
  const [input, setInput] = useState("");
  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
      setInput("");
    }
  };
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder ?? "Digite e pressione Enter"}
          className="bg-white/5 border-white/10 text-sm"
        />
        <Button type="button" variant="outline" size="sm" onClick={add} className="shrink-0 border-white/10">
          Adicionar
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map(tag => (
            <Badge
              key={tag}
              variant="outline"
              className="text-xs border-white/10 text-white/80 cursor-pointer hover:border-red-500/50 hover:text-red-400"
              onClick={() => onChange(value.filter(t => t !== tag))}
            >
              {tag} ×
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Block A ──────────────────────────────────────────────────────────────────

function BlockA({ f, set }: { f: ChannelFoundation; set: (k: keyof ChannelFoundation, v: unknown) => void }) {
  return (
    <div className="space-y-5">
      <FormField label="1. Nicho principal" hint="ex: geopolítica, finanças, cybersec, true crime">
        <Input value={f.niche} onChange={e => set("niche", e.target.value)}
          placeholder="geopolítica & guerra econômica" className="bg-white/5 border-white/10" />
      </FormField>

      <FormField label="2. Insider angle" hint="O canal fala de dentro ou de fora do sistema?">
        <Textarea value={f.insider_angle} onChange={e => set("insider_angle", e.target.value)}
          placeholder="Insider cínico que expõe o que o poder corporativo e o Estado não querem que você saiba"
          className="bg-white/5 border-white/10 min-h-[80px]" />
      </FormField>

      <FormField label="3. Inimigo narrativo" hint="Todo canal de sucesso tem um vilão implícito">
        <Input value={f.narrative_enemy} onChange={e => set("narrative_enemy", e.target.value)}
          placeholder="ex: poder corporativo + Estado capturado" className="bg-white/5 border-white/10" />
      </FormField>

      <FormField label="4. Racional do nome do canal" hint="Por que esse nome? Qual promessa carrega?">
        <Textarea value={f.channel_name_rationale} onChange={e => set("channel_name_rationale", e.target.value)}
          placeholder="Veritas = verdade. Gold = ouro como ativo de fuga do sistema."
          className="bg-white/5 border-white/10 min-h-[60px]" />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="5a. Paleta de cores">
          <Input value={f.visual_signature.palette}
            onChange={e => set("visual_signature", { ...f.visual_signature, palette: e.target.value })}
            placeholder="azul-aço, cinza grafite, vermelho sangue" className="bg-white/5 border-white/10" />
        </FormField>
        <FormField label="5b. Estilo musical">
          <Input value={f.visual_signature.music_style}
            onChange={e => set("visual_signature", { ...f.visual_signature, music_style: e.target.value })}
            placeholder="dark ambient, tension riser" className="bg-white/5 border-white/10" />
        </FormField>
        <FormField label="5c. Fonte de legendas">
          <Input value={f.visual_signature.font}
            onChange={e => set("visual_signature", { ...f.visual_signature, font: e.target.value })}
            placeholder="Bold sans-serif, branco com outline preto" className="bg-white/5 border-white/10" />
        </FormField>
        <FormField label="5d. Tom da voz">
          <Input value={f.visual_signature.voice_tone}
            onChange={e => set("visual_signature", { ...f.visual_signature, voice_tone: e.target.value })}
            placeholder="masculino grave, cínico, pausas dramáticas" className="bg-white/5 border-white/10" />
        </FormField>
      </div>
    </div>
  );
}

// ─── Block B ──────────────────────────────────────────────────────────────────

function BlockB({ f, set }: { f: ChannelFoundation; set: (k: keyof ChannelFoundation, v: unknown) => void }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="6. Frequência de publicação">
          <Input value={f.publish_frequency} onChange={e => set("publish_frequency", e.target.value)}
            placeholder="2x_week / daily / 1x_week" className="bg-white/5 border-white/10" />
        </FormField>
        <FormField label="7. Duração alvo (minutos)">
          <Input type="number" value={f.target_duration_min}
            onChange={e => set("target_duration_min", Number(e.target.value))}
            min={3} max={60} className="bg-white/5 border-white/10" />
        </FormField>
      </div>

      <FormField label="8. Sub-nichos" hint="Mínimo 2. Pressione Enter para adicionar.">
        <TagInput value={f.sub_niches} onChange={v => set("sub_niches", v)}
          placeholder="ex: guerra econômica" />
      </FormField>

      <FormField label="9. Idioma primário">
        <Input value={f.primary_language} onChange={e => set("primary_language", e.target.value)}
          placeholder="en / pt-BR / es" className="bg-white/5 border-white/10" />
      </FormField>

      <FormField label="10. Modelos de monetização" hint="Pressione Enter para adicionar">
        <TagInput value={f.monetization_model} onChange={v => set("monetization_model", v)}
          placeholder="ex: adsense, memberships, affiliates" />
      </FormField>
    </div>
  );
}

// ─── Block C ──────────────────────────────────────────────────────────────────

function BlockC({ f, set }: { f: ChannelFoundation; set: (k: keyof ChannelFoundation, v: unknown) => void }) {
  const ALL_APIS = ["GEMINI_API_KEY", "ANTHROPIC_API_KEY", "PERPLEXITY_API_KEY",
    "SILICONFLOW_API_KEY", "SERPER_API_KEY", "APIFY_API_TOKEN", "REPLICATE_API_TOKEN",
    "ELEVENLABS_API_KEY", "YOUTUBE_DATA_API_KEY"];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <FormField label="11a. VRAM GPU (GB)">
          <Input type="number" value={f.hardware_profile.gpu_vram_gb}
            onChange={e => set("hardware_profile", { ...f.hardware_profile, gpu_vram_gb: Number(e.target.value) })}
            min={2} max={80} className="bg-white/5 border-white/10" />
        </FormField>
        <FormField label="11b. RAM (GB)">
          <Input type="number" value={f.hardware_profile.ram_gb}
            onChange={e => set("hardware_profile", { ...f.hardware_profile, ram_gb: Number(e.target.value) })}
            min={8} max={256} className="bg-white/5 border-white/10" />
        </FormField>
        <FormField label="11c. NVENC disponível">
          <div className="flex items-center gap-2 mt-2">
            <Switch checked={f.hardware_profile.has_nvenc}
              onCheckedChange={v => set("hardware_profile", { ...f.hardware_profile, has_nvenc: v })} />
            <span className="text-xs text-muted-foreground">{f.hardware_profile.has_nvenc ? "Sim" : "Não (libx264)"}</span>
          </div>
        </FormField>
      </div>

      <FormField label="12. Budget mensal de API (USD)">
        <Input type="number" value={f.monthly_api_budget}
          onChange={e => set("monthly_api_budget", Number(e.target.value))}
          min={0} className="bg-white/5 border-white/10" />
      </FormField>

      <FormField label="13. APIs obrigatórias" hint="Clique para selecionar">
        <div className="flex flex-wrap gap-2">
          {ALL_APIS.map(api => (
            <Badge
              key={api}
              variant="outline"
              className={cn(
                "cursor-pointer text-xs",
                f.required_apis.includes(api)
                  ? "border-blue-600 bg-blue-950 text-blue-300"
                  : "border-white/10 text-muted-foreground hover:border-white/30"
              )}
              onClick={() => {
                const next = f.required_apis.includes(api)
                  ? f.required_apis.filter(a => a !== api)
                  : [...f.required_apis, api];
                set("required_apis", next);
              }}
            >
              {api}
            </Badge>
          ))}
        </div>
      </FormField>

      <FormField label="14. Clonagem de voz local">
        <div className="flex items-center gap-3">
          <Switch checked={f.voice_cloning} onCheckedChange={v => set("voice_cloning", v)} />
          <span className="text-xs text-muted-foreground">
            {f.voice_cloning ? "ChatterboxTTS (necessita reference.wav ≥30s)" : "Edge-TTS ou ElevenLabs"}
          </span>
        </div>
      </FormField>

      <FormField label="15. Estratégia de evidências visuais">
        <div className="grid grid-cols-3 gap-2">
          {["real_images", "ai_generated", "mix"].map(strategy => (
            <button
              key={strategy}
              type="button"
              onClick={() => set("evidence_strategy", strategy)}
              className={cn(
                "p-2.5 rounded border text-xs transition-colors",
                f.evidence_strategy === strategy
                  ? "border-blue-600 bg-blue-950 text-blue-300"
                  : "border-white/10 text-muted-foreground hover:border-white/30"
              )}
            >
              {strategy === "real_images" ? "Imagens reais (Serper)" :
               strategy === "ai_generated" ? "IA gerada (FLUX)" : "Mix (recomendado)"}
            </button>
          ))}
        </div>
      </FormField>
    </div>
  );
}

// ─── Block D ──────────────────────────────────────────────────────────────────

function BlockD({ f, set }: { f: ChannelFoundation; set: (k: keyof ChannelFoundation, v: unknown) => void }) {
  const [newChannel, setNewChannel] = useState<SeedChannel>({ channel_id: "", name: "", pillar: "veritas" });

  const addSeedChannel = () => {
    if (!newChannel.channel_id || !newChannel.name) return;
    set("seed_channels", [...f.seed_channels, { ...newChannel }]);
    setNewChannel({ channel_id: "", name: "", pillar: "veritas" });
  };

  return (
    <div className="space-y-5">
      <FormField label="16. Canais semente (mín. 5)" hint="Canais YouTube para monitorar no radar. Format: @handle">
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <Input value={newChannel.channel_id}
              onChange={e => setNewChannel(p => ({ ...p, channel_id: e.target.value }))}
              placeholder="@VisualPolitik" className="bg-white/5 border-white/10 text-xs" />
            <Input value={newChannel.name}
              onChange={e => setNewChannel(p => ({ ...p, name: e.target.value }))}
              placeholder="Nome do canal" className="bg-white/5 border-white/10 text-xs" />
            <div className="flex gap-2">
              <select
                value={newChannel.pillar}
                onChange={e => setNewChannel(p => ({ ...p, pillar: e.target.value }))}
                className="flex-1 bg-white/5 border border-white/10 rounded text-xs text-white/80 px-2"
              >
                <option value="veritas">veritas</option>
                <option value="gold">gold</option>
              </select>
              <Button type="button" size="sm" variant="outline" onClick={addSeedChannel}
                className="border-white/10 text-xs shrink-0">+</Button>
            </div>
          </div>

          {f.seed_channels.length > 0 && (
            <div className="space-y-1">
              {f.seed_channels.map((ch, i) => (
                <div key={i} className="flex items-center justify-between bg-card/20 rounded px-3 py-1.5 text-xs">
                  <span className="text-white/80 font-mono">{ch.channel_id}</span>
                  <span className="text-muted-foreground mx-2">{ch.name}</span>
                  <Badge variant="outline" className="text-xs border-white/10 text-muted-foreground mr-2">{ch.pillar}</Badge>
                  <button
                    type="button"
                    onClick={() => set("seed_channels", f.seed_channels.filter((_, idx) => idx !== i))}
                    className="text-muted-foreground hover:text-red-400"
                  >×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </FormField>

      <FormField label="17. Feeds RSS (opcional)" hint="URLs de feeds RSS como fallback do radar">
        <TagInput value={f.rss_feeds} onChange={v => set("rss_feeds", v)}
          placeholder="https://feeds.reuters.com/reuters/topNews" />
      </FormField>

      <FormField label="18. Z-Score threshold de viralidade">
        <div className="flex items-center gap-3">
          <Input type="number" value={f.z_score_threshold} step={0.1} min={1.0} max={5.0}
            onChange={e => set("z_score_threshold", Number(e.target.value))}
            className="bg-white/5 border-white/10 w-32" />
          <span className="text-xs text-muted-foreground">Padrão: 2.5. Menor = mais sensível. Maior = só outliers extremos.</span>
        </div>
      </FormField>

      <FormField label="19. Estrutura narrativa obrigatória" hint="Descreva o padrão de storytelling">
        <Textarea value={f.narrative_structure}
          onChange={e => set("narrative_structure", e.target.value)}
          placeholder="But/Therefore obrigatório a cada 45s. 5-Step Hook na cena 01: número + contradição + revelação + pausa + promessa. 2 Wall-Pushers por vídeo..."
          className="bg-white/5 border-white/10 min-h-[100px]" />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="20a. Checks automáticos do CriticAgent">
          <TagInput value={f.quality_system.checks}
            onChange={v => set("quality_system", { ...f.quality_system, checks: v })}
            placeholder="ex: but_therefore_violation" />
        </FormField>
        <FormField label="20b. Score mínimo de aprovação">
          <Input type="number" value={f.quality_system.pass_score} min={0} max={10} step={0.5}
            onChange={e => set("quality_system", { ...f.quality_system, pass_score: Number(e.target.value) })}
            className="bg-white/5 border-white/10" />
        </FormField>
      </div>
    </div>
  );
}

// ─── Block E ──────────────────────────────────────────────────────────────────

function BlockE({ f, set }: { f: ChannelFoundation; set: (k: keyof ChannelFoundation, v: unknown) => void }) {
  const DAYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
  const DAY_LABELS: Record<string, string> = {
    monday: "Seg", tuesday: "Ter", wednesday: "Qua",
    thursday: "Qui", friday: "Sex", saturday: "Sáb", sunday: "Dom",
  };

  return (
    <div className="space-y-5">
      <FormField label="21. Calendário de publicação">
        <div className="flex flex-wrap gap-2 mb-2">
          {DAYS.map(day => (
            <button
              key={day} type="button"
              onClick={() => {
                const days = f.publish_schedule.days.includes(day)
                  ? f.publish_schedule.days.filter(d => d !== day)
                  : [...f.publish_schedule.days, day];
                set("publish_schedule", { ...f.publish_schedule, days });
              }}
              className={cn(
                "px-3 py-1.5 rounded text-xs border transition-colors",
                f.publish_schedule.days.includes(day)
                  ? "border-blue-600 bg-blue-950 text-blue-300"
                  : "border-white/10 text-muted-foreground hover:border-white/30"
              )}
            >
              {DAY_LABELS[day]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Horário UTC:</Label>
          <Input type="time" value={f.publish_schedule.time_utc}
            onChange={e => set("publish_schedule", { ...f.publish_schedule, time_utc: e.target.value })}
            className="bg-white/5 border-white/10 w-32 text-xs" />
        </div>
      </FormField>

      <FormField label="22. Feedback loop" hint="Como o Analytics retroalimenta o sistema?">
        <Textarea value={f.feedback_loop} onChange={e => set("feedback_loop", e.target.value)}
          placeholder="retention_30s → score do hook. CTR < 5% em 48h → reformular thumbnail. Hook Z-score calculado por tipo..."
          className="bg-white/5 border-white/10 min-h-[80px]" />
      </FormField>

      <FormField label="23. Plano de escalonamento">
        <Textarea value={f.scaling_plan} onChange={e => set("scaling_plan", e.target.value)}
          placeholder="10k inscritos: +1 vídeo/semana. 100k: segundo idioma (espanhol). 500k: spin-off channel Gold..."
          className="bg-white/5 border-white/10 min-h-[80px]" />
      </FormField>

      <FormField label="24. Riscos operacionais e mitigações">
        <Textarea value={f.operational_risks} onChange={e => set("operational_risks", e.target.value)}
          placeholder="Queda de energia: checkpoints por arquivo. Limite de API: rodízio de keys no account_pools. Copyright strike: evidências de domínio público..."
          className="bg-white/5 border-white/10 min-h-[80px]" />
      </FormField>

      <FormField label="25. Fosso defensivo" hint="O que esse canal tem que ninguém pode copiar em 30 dias?">
        <Textarea value={f.defensive_moat} onChange={e => set("defensive_moat", e.target.value)}
          placeholder="Feedback loop de retenção treinado em 50+ vídeos + voz clonada única + dossiê forense de evidências com 3 camadas de verificação..."
          className="bg-white/5 border-white/10 min-h-[80px]" />
      </FormField>
    </div>
  );
}

// ─── Directives viewer ────────────────────────────────────────────────────────

function DirectivesViewer({ directives }: { directives: Record<string, string> }) {
  const [copied, setCopied] = useState<string | null>(null);
  const LABELS: Record<string, string> = {
    identity: "D-001: Identidade",
    script_agent: "D-002/D-005: Roteirista",
    intelligence_radar: "D-004: Radar",
    assembly: "D-006: Montagem",
    publisher: "D-007: YouTube SEO",
    flux_style: "FLUX_STYLE",
  };

  const copyTo = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="space-y-3">
      {Object.entries(directives).map(([key, value]) => (
        <Card key={key} className="border-white/10 bg-card/30 backdrop-blur">
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-white/80">{LABELS[key] ?? key}</CardTitle>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-white/80"
              onClick={() => copyTo(key, value)}>
              {copied === key ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </Button>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-40">
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">{value}</pre>
            </ScrollArea>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FoundationPage() {
  const { id: channelId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [block, setBlock] = useState(0);
  const [form, setForm] = useState<ChannelFoundation>({
    ...FOUNDATION_DEFAULTS,
    channel_id: channelId ?? "",
  });
  const [showDirectives, setShowDirectives] = useState(false);

  const { data: existing } = useChannelFoundation(channelId ?? "");
  const { mutate: save, isPending: saving } = useSaveFoundation();
  const { mutate: generate, isPending: generating } = useGenerateDirectives();

  useEffect(() => {
    if (existing) {
      setForm({ ...FOUNDATION_DEFAULTS, ...existing } as ChannelFoundation);
      if (existing.generated_directives && Object.keys(existing.generated_directives).length > 0) {
        setShowDirectives(true);
      }
    }
  }, [existing]);

  const setField = (key: keyof ChannelFoundation, value: unknown) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = (markComplete = false) => {
    save({ ...form, is_complete: markComplete || form.is_complete });
  };

  const handleGenerate = () => {
    save({ ...form, is_complete: true }, {
      onSuccess: () => {
        generate(channelId!, {
          onSuccess: () => setShowDirectives(true),
        });
      },
    });
  };

  const filledBlocks = [
    form.niche && form.insider_angle && form.narrative_enemy,
    form.publish_frequency && form.sub_niches.length > 0,
    form.required_apis.length > 0 && form.evidence_strategy,
    form.seed_channels.length >= 5 && form.narrative_structure,
    form.defensive_moat,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-3xl mx-auto px-4 pt-28 pb-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            Fundação do Canal — 25 Perguntas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Define o DNA do canal. Usado para gerar automaticamente todas as diretivas do pipeline.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Progress value={(filledBlocks / 5) * 100} className="flex-1 h-1.5 bg-white/10" />
            <span className="text-xs text-muted-foreground">{filledBlocks}/5 blocos</span>
          </div>
        </div>

        {/* Block navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {BLOCKS.map((b, i) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setBlock(i)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs border whitespace-nowrap transition-colors",
                block === i
                  ? "border-blue-600 bg-blue-950 text-blue-300"
                  : "border-white/10 text-muted-foreground hover:border-white/10 hover:text-white/60"
              )}
            >
              <span className="font-mono font-bold">{b.id}</span>
              <span>{b.label}</span>
            </button>
          ))}
        </div>

        <Card className="border-white/10 bg-card/30 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-base text-white/90">
              Bloco {BLOCKS[block].id} — {BLOCKS[block].label}
            </CardTitle>
            <CardDescription className="text-muted-foreground text-xs">
              Perguntas {BLOCKS[block].questions} — {BLOCKS[block].description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {block === 0 && <BlockA f={form} set={setField} />}
            {block === 1 && <BlockB f={form} set={setField} />}
            {block === 2 && <BlockC f={form} set={setField} />}
            {block === 3 && <BlockD f={form} set={setField} />}
            {block === 4 && <BlockE f={form} set={setField} />}
          </CardContent>
        </Card>

        {/* Navigation + actions */}
        <div className="mt-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" disabled={block === 0}
            onClick={() => setBlock(b => b - 1)} className="text-muted-foreground">
            <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleSave()}
              disabled={saving} className="border-white/10 text-white/60 text-xs">
              {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
              Salvar rascunho
            </Button>

            {block < 4 ? (
              <Button size="sm" onClick={() => { handleSave(); setBlock(b => b + 1); }}
                className="text-xs">
                Próximo <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button size="sm" onClick={handleGenerate} disabled={generating || saving}
                className="bg-amber-600 hover:bg-amber-500 text-white text-xs">
                {generating
                  ? <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Gerando diretivas...</>
                  : <><Wand2 className="w-3 h-3 mr-1" /> Gerar Diretivas</>}
              </Button>
            )}
          </div>

          {block < 4 && (
            <Button variant="ghost" size="sm" onClick={() => setBlock(b => b + 1)}
              className="text-muted-foreground">
              Próximo <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>

        {/* Directives output */}
        {showDirectives && existing?.generated_directives && Object.keys(existing.generated_directives).length > 0 && (
          <>
            <Separator className="my-8 bg-white/10" />
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-medium text-white/80 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-400" />
                Diretivas Geradas
              </h2>
              {existing.directives_generated_at && (
                <span className="text-xs text-muted-foreground">
                  {new Date(existing.directives_generated_at).toLocaleString("pt-BR")}
                </span>
              )}
            </div>
            <DirectivesViewer directives={existing.generated_directives as Record<string, string>} />
            <p className="mt-4 text-xs text-muted-foreground text-center">
              Copie cada diretiva para o arquivo correspondente em <code className="font-mono">directives/</code> do pipeline Python.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
