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
import { 
  Loader2, Wand2, CheckCircle2, ChevronRight, ChevronLeft, 
  Sparkles, BookOpen, Copy, Check, Dna, Cpu, Activity, Zap, ShieldAlert, ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  useChannelFoundation, useSaveFoundation, useGenerateDirectives,
  FOUNDATION_DEFAULTS, type ChannelFoundation, type SeedChannel,
} from "@/hooks/useChannelFoundation";


// ─── Block labels ─────────────────────────────────────────────────────────────

const BLOCKS = [
  { id: "A", label: "Identidade e Narrativa", questions: "1–5",  boost: "+25%", description: "Precisão do roteiro e ressonância emocional" },
  { id: "B", label: "Estratégia de Crescimento",  questions: "6–10", boost: "+15%", description: "Alinhamento com algoritmo e retenção" },
  { id: "C", label: "Stack de Performance",   questions: "11–15", boost: "+30%", description: "Qualidade visual e velocidade de renderização" },
  { id: "D", label: "Radar Viral",    questions: "16–20", boost: "+20%", description: "Detecção de tendências e ganchos virais" },
  { id: "E", label: "Diferenciação Única",      questions: "21–25", boost: "+10%", description: "Consistência de marca e autoridade" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FormField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">{label}</Label>
      {hint && <p className="text-[9px] text-muted-foreground/60 uppercase font-bold tracking-widest ml-1 mb-2 italic">"{hint}"</p>}
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
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder ?? "DIGITE E APERTE ENTER..."}
          className="h-12 bg-background border-border text-foreground text-sm font-bold tracking-tight rounded-lg shadow-sm"
        />
        <Button type="button" variant="outline" size="sm" onClick={add} className="shrink-0 border-border h-12 px-6 rounded-lg font-black uppercase tracking-widest text-[10px] text-foreground hover:bg-secondary">
          ADD
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map(tag => (
            <Badge
              key={tag}
              variant="outline"
              className="text-[10px] font-black uppercase tracking-widest border-white/5 bg-white/5 text-white/60 py-1.5 px-3 cursor-pointer hover:border-red-500/50 hover:text-red-400 transition-all"
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

function SeedChannelsInput({ value, onChange }: { value: SeedChannel[], onChange: (v: SeedChannel[]) => void }) {
  const [input, setInput] = useState("");
  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !value.find(s => s.name === trimmed)) {
      onChange([...value, { channel_id: crypto.randomUUID().slice(0, 8), name: trimmed, pillar: "referência" }]);
      setInput("");
    }
  };
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="NOME DO CANAL... (ENTER)"
          className="h-12 bg-background border-border text-foreground text-sm font-bold tracking-tight rounded-lg shadow-sm"
        />
        <Button type="button" variant="outline" size="sm" onClick={add} className="shrink-0 border-border h-12 px-6 rounded-lg font-black uppercase tracking-widest text-[10px] text-foreground hover:bg-secondary">ADD</Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map(tag => (
            <Badge key={tag.name} variant="outline" onClick={() => onChange(value.filter(t => t.name !== tag.name))} className="text-[10px] font-black uppercase tracking-widest border-white/5 bg-white/5 text-white/60 py-1.5 px-3 cursor-pointer hover:border-red-500/50 hover:text-red-400 transition-all">
              {tag.name} ×
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// ... (Blocks A and B)
function BlockA({ f, set }: any) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <FormField label="1. Nicho Primário" hint="geopolítica, finanças, true crime, etc.">
        <Input value={f.niche} onChange={e => set("niche", e.target.value)}
          className="h-14 bg-background border-border text-foreground font-bold tracking-tight rounded-lg shadow-sm" />
      </FormField>
      <FormField label="2. Ângulo de Especialista" hint="Dentro do sistema ou expondo-o?">
        <Textarea value={f.insider_angle} onChange={e => set("insider_angle", e.target.value)}
          className="bg-background border-border text-foreground min-h-[100px] font-medium leading-relaxed italic rounded-lg shadow-sm" />
      </FormField>
      <FormField label="3. Inimigo Narrativo" hint="Toda história de sucesso precisa de um vilão">
        <Input value={f.narrative_enemy} onChange={e => set("narrative_enemy", e.target.value)}
          className="h-14 bg-background border-border text-foreground font-bold tracking-tight rounded-lg shadow-sm" />
      </FormField>
    </div>
  );
}

function BlockB({ f, set }: any) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="grid grid-cols-2 gap-6">
        <FormField label="6. Frequência de Publicação">
          <Input value={f.publish_frequency} onChange={e => set("publish_frequency", e.target.value)}
            className="h-14 bg-background border-border text-foreground font-bold rounded-lg shadow-sm" />
        </FormField>
        <FormField label="7. Duração Alvo (min)">
          <Input type="number" value={f.target_duration_min}
            onChange={e => set("target_duration_min", Number(e.target.value))}
            className="h-14 bg-background border-border text-foreground font-bold uppercase rounded-lg shadow-sm" />
        </FormField>
      </div>
      <FormField label="8. Sub-Nichos Relacionados">
        <TagInput value={f.sub_niches} onChange={v => set("sub_niches", v)} />
      </FormField>
    </div>
  );
}

function BlockC({ f, set }: any) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="grid grid-cols-2 gap-6">
        <FormField label="11. Orçamento API Mensal ($)">
          <Input type="number" value={f.monthly_api_budget} onChange={e => set("monthly_api_budget", Number(e.target.value))} className="h-14 bg-background border-border text-foreground font-bold uppercase rounded-lg shadow-sm" />
        </FormField>
        <FormField label="12. APIs Necessárias">
          <TagInput value={f.required_apis} onChange={v => set("required_apis", v)} placeholder="EX: OPENAI, ELEVENLABS" />
        </FormField>
      </div>
      <FormField label="13. Estratégia de Evidência" hint="Qual estilo de material visual predomina?">
        <Input value={f.evidence_strategy} onChange={e => set("evidence_strategy", e.target.value)} className="h-14 bg-background border-border text-foreground font-bold uppercase rounded-lg shadow-sm" />
      </FormField>
      <div className="grid grid-cols-2 gap-6">
        <FormField label="14. GPU VRAM (GB)">
          <Input type="number" value={f.hardware_profile.gpu_vram_gb} onChange={e => set("hardware_profile", { ...f.hardware_profile, gpu_vram_gb: Number(e.target.value) })} className="h-14 bg-background border-border text-foreground font-bold uppercase rounded-lg shadow-sm" />
        </FormField>
        <FormField label="14. RAM (GB)">
          <Input type="number" value={f.hardware_profile.ram_gb} onChange={e => set("hardware_profile", { ...f.hardware_profile, ram_gb: Number(e.target.value) })} className="h-14 bg-background border-border text-foreground font-bold uppercase rounded-lg shadow-sm" />
        </FormField>
      </div>
      <div className="flex items-center space-x-4 p-4 border border-white/10 rounded-xl bg-black/20">
        <Switch checked={f.hardware_profile.has_nvenc} onCheckedChange={v => set("hardware_profile", { ...f.hardware_profile, has_nvenc: v })} id="nvenc" />
        <Label htmlFor="nvenc" className="text-xs font-bold uppercase tracking-widest text-white/70">Possui encoder NVENC (NVIDIA)</Label>
      </div>
      <div className="flex items-center space-x-4 p-4 border border-white/10 rounded-xl bg-black/20">
        <Switch checked={f.voice_cloning} onCheckedChange={v => set("voice_cloning", v)} id="voice_cloning" />
        <Label htmlFor="voice_cloning" className="text-xs font-bold uppercase tracking-widest text-white/70">Usar clonagem de voz premium</Label>
      </div>
    </div>
  );
}

function BlockD({ f, set }: any) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <FormField label="16. Canais Semente (Inspiração)">
         <SeedChannelsInput value={f.seed_channels || []} onChange={v => set("seed_channels", v)} />
      </FormField>
      <FormField label="17. Feeds RSS">
        <TagInput value={f.rss_feeds} onChange={v => set("rss_feeds", v)} placeholder="URLs de feeds..." />
      </FormField>
      <div className="grid grid-cols-2 gap-6">
        <FormField label="18. Limiar de Viralidade (Z-Score)" hint="Geralmente entre 1.5 e 3.0">
          <Input type="number" step="0.1" value={f.z_score_threshold} onChange={e => set("z_score_threshold", Number(e.target.value))} className="h-14 bg-background border-border text-foreground font-bold uppercase rounded-lg shadow-sm" />
        </FormField>
        <FormField label="19. Score Mínimo de Qualidade">
          <Input type="number" value={f.quality_system?.pass_score || 8} onChange={e => set("quality_system", { ...f.quality_system, pass_score: Number(e.target.value) })} className="h-14 bg-background border-border text-foreground font-bold uppercase rounded-lg shadow-sm" />
        </FormField>
      </div>
      <FormField label="20. Estrutura Narrativa Padrão">
        <Textarea value={f.narrative_structure} onChange={e => set("narrative_structure", e.target.value)} className="bg-background border-border text-foreground min-h-[100px] font-medium leading-relaxed italic rounded-lg shadow-sm" />
      </FormField>
      <FormField label="21. Checklist de Qualidade">
        <TagInput value={f.quality_system?.checks || []} onChange={v => set("quality_system", { ...f.quality_system, checks: v })} placeholder="Ex: BOA RETENÇÃO NOS PRIMEIROS 5S" />
      </FormField>
    </div>
  );
}

function BlockE({ f, set }: any) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <FormField label="22. Fosso Defensivo (Moat)" hint="O que impede os outros de copiarem este canal facilmente?">
        <Textarea value={f.defensive_moat} onChange={e => set("defensive_moat", e.target.value)} className="bg-background border-border text-foreground min-h-[100px] font-medium leading-relaxed italic rounded-lg shadow-sm" />
      </FormField>
      <div className="grid grid-cols-2 gap-6">
        <FormField label="23. Dias de Publicação">
          <TagInput value={f.publish_schedule?.days || []} onChange={v => set("publish_schedule", { ...f.publish_schedule, days: v })} placeholder="EX: SEGUNDA, QUINTA" />
        </FormField>
        <FormField label="24. Horário (UTC)">
          <Input value={f.publish_schedule?.time_utc || "18:00"} onChange={e => set("publish_schedule", { ...f.publish_schedule, time_utc: e.target.value })} className="h-14 bg-background border-border text-foreground font-bold uppercase rounded-lg shadow-sm" />
        </FormField>
      </div>
      <FormField label="25. Plano de Escala">
        <Input value={f.scaling_plan} onChange={e => set("scaling_plan", e.target.value)} className="h-14 bg-background border-border text-foreground font-bold uppercase rounded-lg shadow-sm" />
      </FormField>
      <FormField label="26. Riscos Operacionais">
        <Input value={f.operational_risks} onChange={e => set("operational_risks", e.target.value)} className="h-14 bg-background border-border text-foreground font-bold uppercase rounded-lg shadow-sm" />
      </FormField>
      <FormField label="27. Loop de Feedback">
        <Input value={f.feedback_loop} onChange={e => set("feedback_loop", e.target.value)} className="h-14 bg-background border-border text-foreground font-bold uppercase rounded-lg shadow-sm" />
      </FormField>
    </div>
  );
}

// ─── Directives viewer ────────────────────────────────────────────────────────

function DirectivesViewer({ directives }: { directives: Record<string, string> }) {
  const [copied, setCopied] = useState<string | null>(null);
  const LABELS: Record<string, string> = {
    identity: "D-001: IDENTITY",
    script_agent: "D-002: SCRIPT",
    intelligence_radar: "D-004: RADAR",
    assembly: "D-006: ASSEMBLY",
    publisher: "D-007: SEO",
    flux_style: "PROMPT_STYLE",
  };

  const copyTo = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Object.entries(directives).map(([key, value]) => (
        <Card key={key} className="border-white/5 bg-[#0c0c0e] rounded-[2rem] overflow-hidden shadow-xl">
          <CardHeader className="pb-4 flex-row items-center justify-between space-y-0 bg-card border-b border-border px-6">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">{LABELS[key] ?? key}</CardTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white/20 hover:text-white"
              onClick={() => copyTo(key, value)}>
              {copied === key ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </Button>
          </CardHeader>
          <CardContent className="p-6">
            <ScrollArea className="h-40">
              <pre className="text-[10px] text-white/40 whitespace-pre-wrap font-mono leading-relaxed italic">{value}</pre>
            </ScrollArea>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

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

  const totalBoost = BLOCKS.slice(0, filledBlocks).reduce((acc, b) => acc + parseInt(b.boost), 0);

  return (
    <div className="pt-32 pb-20 px-6 md:px-12 w-full min-h-screen">
      <main className="max-w-5xl mx-auto space-y-12 animate-fade-in">
        
        {/* Tactical Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-primary font-black uppercase tracking-[0.4em] text-[10px] ml-1">
              <Cpu className="w-3 h-3" /> Configuração do Canal · Online
            </div>
            <h1 className="text-6xl md:text-7xl font-black tracking-tighter text-white uppercase italic leading-[0.9]">
              DNA <span className="text-primary">Optimizer</span>
            </h1>
            <p className="text-xl text-white/30 font-bold max-w-3xl leading-relaxed italic">
              Configure o DNA do seu canal. Cada bloco preenchido aumenta a precisão da IA em até 100%.
            </p>
          </div>

          <div className="p-8 bg-primary/5 border border-primary/20 rounded-[2.5rem] flex items-center gap-8 min-w-[350px] relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-50" />
            <div className="relative z-10 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">Melhoria Total</p>
              <p className="text-5xl font-black text-white italic tracking-tighter">+{totalBoost}%</p>
              <div className="flex items-center gap-3 pt-2">
                <div className="h-1.5 w-32 bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <div className="h-full bg-primary shadow-[0_0_15px_rgba(var(--primary),0.5)] transition-all duration-1000" style={{ width: `${(filledBlocks/5)*100}%` }} />
                </div>
                <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">{filledBlocks}/5 MODULES</span>
              </div>
            </div>
            <Dna className="w-16 h-16 text-primary opacity-10 absolute -right-2 -bottom-2 group-hover:rotate-180 transition-transform duration-1000" />
          </div>
        </div>

        {/* Module Selector */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {BLOCKS.map((b, i) => {
            const isFilled = i < filledBlocks;
            const isActive = block === i;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setBlock(i)}
                className={cn(
                  "flex flex-col items-start gap-1 p-5 rounded-2xl border transition-all duration-500 relative overflow-hidden group",
                  isActive 
                    ? "bg-[#0c0c0e] border-primary text-white shadow-2xl scale-[1.02] z-10" 
                    : isFilled
                      ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400 opacity-60 hover:opacity-100"
                      : "bg-white/[0.02] border-white/5 text-white/20 hover:border-white/10"
                )}
              >
                <span className="text-xl font-black italic tracking-tighter mb-1">{b.boost}</span>
                <span className="text-[9px] font-black uppercase tracking-[0.2em]">{b.label.split(' ')[0]}</span>
                {isActive && (
                  <div className="absolute top-0 right-0 p-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-8">
            <Card className="bg-[#0a0a0c] border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
              <CardHeader className="bg-card border-b border-border p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl font-black uppercase italic tracking-tighter text-white">
                      {BLOCKS[block].label}
                    </CardTitle>
                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-1 italic">{BLOCKS[block].description}</p>
                  </div>
                  <Badge variant="outline" className="h-8 rounded-xl border-primary/20 bg-primary/10 text-primary font-black uppercase tracking-widest text-[9px] px-4">
                    Módulo {BLOCKS[block].id}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-10">
                {block === 0 && <BlockA f={form} set={setField} />}
                {block === 1 && <BlockB f={form} set={setField} />}
                {block === 2 && <BlockC f={form} set={setField} />}
                {block === 3 && <BlockD f={form} set={setField} />}
                {block === 4 && <BlockE f={form} set={setField} />}
              </CardContent>
            </Card>

            <div className="flex justify-between items-center px-4">
              <Button variant="ghost" onClick={() => setBlock(b => b - 1)} disabled={block === 0} className="h-14 rounded-2xl text-white/20 hover:text-white font-black uppercase tracking-widest text-[10px] group">
                <ChevronLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" /> Módulo Anterior
              </Button>
              <div className="flex gap-4">
                <Button variant="outline" onClick={() => handleSave()} disabled={saving} className="h-14 rounded-2xl border-white/5 bg-white/5 text-white/40 hover:bg-white/10 hover:text-white font-black uppercase tracking-widest text-[10px] px-8">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Salvar Rascunho
                </Button>
                {block < 4 ? (
                  <Button onClick={() => { handleSave(); setBlock(b => b + 1); }} className="h-14 rounded-2xl bg-primary hover:bg-orange-600 text-white shadow-xl px-10 font-black uppercase italic tracking-tighter text-lg border-0 group">
                    Próximo Módulo <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                ) : (
                  <Button onClick={handleGenerate} disabled={generating || saving} className="h-14 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white shadow-xl px-10 font-black uppercase italic tracking-tighter text-lg border-0">
                    {generating ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Wand2 className="w-5 h-5 mr-2" />} Gerar Diretrizes
                  </Button>
                )}
              </div>
            </div>
          </div>

          <aside className="space-y-8">
            <div className="p-8 bg-card border border-border rounded-[3rem] space-y-6 relative overflow-hidden shadow-lg">
              <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                <Sparkles className="w-20 h-20 text-primary" />
              </div>
              <h4 className="text-sm font-black uppercase tracking-[0.3em] text-white/40 italic">Optimization Tips</h4>
              <ul className="space-y-6">
                {[
                  { icon: ShieldAlert, t: "Retention Leaks", d: "Filling Block A reduces early drop-offs by 25%." },
                  { icon: Zap, t: "AI Precision", d: "Block C calibrates image generation accuracy." },
                  { icon: Activity, t: "Sinais Virais", d: "O Bloco D alinha o canal com as tendências atuais." }
                ].map((item, idx) => (
                  <li key={idx} className="flex gap-4 group">
                    <div className="p-2.5 h-fit rounded-xl bg-white/5 border border-white/5 group-hover:border-primary/20 transition-all">
                      <item.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-black uppercase tracking-widest text-white">{item.t}</p>
                      <p className="text-[10px] font-medium text-white/30 leading-relaxed italic">"{item.d}"</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>

        {showDirectives && existing?.generated_directives && Object.keys(existing.generated_directives).length > 0 && (
          <div className="space-y-8 animate-in zoom-in-95 duration-700">
            <div className="flex items-center gap-4 border-b border-white/5 pb-6">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">Diretrizes Geradas com Sucesso</h2>
            </div>
            <DirectivesViewer directives={existing.generated_directives as Record<string, string>} />
          </div>
        )}
      </main>
    </div>
  );
}
