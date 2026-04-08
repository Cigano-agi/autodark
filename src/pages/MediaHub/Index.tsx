import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BeamsBackground } from "@/components/ui/beams-background";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Zap, 
  Mic, 
  ImageIcon, 
  Video, 
  ChevronLeft, 
  ShieldCheck, 
  Sparkles, 
  Database,
  Cpu,
  Brain,
  HardDrive
} from "lucide-react";
import { useChannels } from "@/hooks/useChannels";
import { cn } from "@/lib/utils";

export default function MediaHub() {
  const navigate = useNavigate();
  const { channels } = useChannels();
  const [selectedChannelId, setSelectedChannelId] = useState<string>("global");

  const hubData = localStorage.getItem("autodark_hub_defaults_v2");
  const defaults = hubData ? JSON.parse(hubData) : {};
  const current = defaults[selectedChannelId] || defaults["global"] || {
    voice: "ai33", voiceId: "onyx", slidesImage: "kie_flux", thumbImage: "kie_flux", videoModel: "none"
  };

  const update = (key: string, value: string) => {
    const next = { ...defaults, [selectedChannelId]: { ...current, [key]: value } };
    localStorage.setItem("autodark_hub_defaults_v2", JSON.stringify(next));
    window.location.reload(); // Quick refresh to update estimates
  };

  return (
    <div className="pt-32 pb-20 px-6 md:px-12 w-full min-h-screen">
      <div className="max-w-7xl mx-auto space-y-12 animate-fade-in">
        
        {/* Tactical Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-primary font-black uppercase tracking-[0.4em] text-[10px] ml-1">
              <Database className="w-3 h-3" /> Recursos de IA · Configuração
            </div>
            <h1 className="text-6xl md:text-7xl font-black tracking-tighter text-white uppercase italic leading-[0.9]">
              Media <span className="text-primary">Hub</span>
            </h1>
            <p className="text-xl text-white/30 font-bold max-w-2xl leading-relaxed italic">
              Configure as vozes e recursos de IA disponíveis para todos os seus canais.
            </p>
          </div>

          <div className="flex flex-col gap-3 w-full lg:w-80">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Canal</Label>
            <Select value={selectedChannelId} onValueChange={setSelectedChannelId}>
              <SelectTrigger className="h-14 bg-black/40 border-white/10 rounded-2xl text-xs font-bold uppercase tracking-widest text-white focus:ring-primary/50">
                <SelectValue placeholder="Select Scope" />
              </SelectTrigger>
              <SelectContent className="bg-[#0c0c0e] border-white/10 rounded-2xl">
                <SelectItem value="global" className="text-xs font-bold uppercase py-3">Global (All Units)</SelectItem>
                {channels?.map(c => (
                  <SelectItem key={c.id} value={c.id} className="text-xs font-bold uppercase py-3">{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Voice Module */}
          <ModuleCard 
            icon={Mic} 
            title="Vocal Synthesis" 
            desc="Configure narration engines and voice signatures."
            active={current.voice}
            options={[
              { id: "ai33", name: "AI33 Premium (Recommended)", price: "R$ 0.15/min" },
              { id: "openai", name: "OpenAI TTS", price: "R$ 0.45/min" },
              { id: "browser", name: "Browser Fallback", price: "FREE" }
            ]}
            onSelect={(id) => update("voice", id)}
          />

          {/* Image Module */}
          <ModuleCard 
            icon={ImageIcon} 
            title="Visual Cortex" 
            desc="AI painting algorithms for slides and cinematography."
            active={current.slidesImage}
            options={[
              { id: "kie_flux", name: "FLUX Kontext (God Mode)", price: "R$ 0.30/img" },
              { id: "dalle3", name: "DALL-E 3", price: "R$ 0.24/img" },
              { id: "pexels", name: "Stock Footage", price: "FREE" }
            ]}
            onSelect={(id) => update("slidesImage", id)}
          />

          {/* Video Module */}
          <ModuleCard 
            icon={Video} 
            title="Temporal Matrix" 
            desc="Video generation and temporal consistency models."
            active={current.videoModel}
            options={[
              { id: "none", name: "Static (Ken Burns)", price: "FREE" },
              { id: "vo3", name: "Google Veo 3", price: "R$ 1.80/clip" },
              { id: "sora", name: "OpenAI Sora 2", price: "R$ 3.60/clip" }
            ]}
            onSelect={(id) => update("videoModel", id)}
          />
        </div>

        {/* Cost Matrix */}
        <div className="p-10 bg-[#0a0a0c] border border-white/5 rounded-[3rem] shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none" />
          <h3 className="text-2xl font-black text-white uppercase italic tracking-tight mb-8 flex items-center gap-4 relative z-10">
            <Cpu className="w-6 h-6 text-primary" /> Expense Projection
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative z-10">
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Standard Video (8 min)</p>
              <p className="text-4xl font-black text-white italic tracking-tighter">R$ {(8 * 0.15 + 60 * 0.30 + 0.30).toFixed(2)}</p>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Monthly Operational (16 units)</p>
              <p className="text-4xl font-black text-primary italic tracking-tighter">R$ {(16 * 19.50).toFixed(2)}</p>
            </div>
            <div className="flex items-end">
              <Button className="w-full h-14 rounded-2xl bg-white text-primary-foreground font-black uppercase tracking-[0.2em] italic hover:bg-primary hover:text-white transition-all">
                Audit API Keys
              </Button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function ModuleCard({ icon: Icon, title, desc, active, options, onSelect }: any) {
  return (
    <Card className="bg-[#0c0c0e] border-white/5 rounded-[2.5rem] overflow-hidden shadow-xl hover:border-primary/20 transition-all group">
      <CardHeader className="p-8 pb-4">
        <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-inner">
          <Icon className="w-7 h-7 text-primary" />
        </div>
        <CardTitle className="text-2xl font-black text-white uppercase italic tracking-tighter">{title}</CardTitle>
        <p className="text-sm text-white/30 font-medium leading-relaxed mt-2">{desc}</p>
      </CardHeader>
      <CardContent className="p-8 pt-4 space-y-3">
        {options.map((opt: any) => (
          <button
            key={opt.id}
            onClick={() => onSelect(opt.id)}
            className={cn(
              "w-full flex items-center justify-between p-4 rounded-2xl border transition-all duration-300",
              active === opt.id 
                ? "bg-primary border-0 text-white shadow-lg shadow-primary/20 scale-[1.02]" 
                : "bg-black/40 border-white/5 text-white/40 hover:bg-white/5 hover:text-white"
            )}
          >
            <span className="text-[11px] font-black uppercase tracking-wider">{opt.name}</span>
            <span className={cn(
              "text-[9px] font-bold px-2 py-1 rounded-lg",
              active === opt.id ? "bg-white/20 text-white" : "bg-white/5 text-white/20"
            )}>{opt.price}</span>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
