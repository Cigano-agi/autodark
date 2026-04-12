import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Factory } from "@/components/Factory";
import { useFactory } from "@/components/Factory/FactoryContext";
import { BeamsBackground } from "@/components/ui/beams-background";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Terminal, Zap, Loader2, ChevronLeft, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function ProductionWizardContent() {
  const navigate = useNavigate();
  const { channelId, state, runSemiAuto, channel, resetProductionState } = useFactory();
  const [idea, setIdea] = useState("");
  const [language, setLanguage] = useState<"pt-BR" | "en" | "es">("pt-BR");
  const [duration, setDuration] = useState(2);

  // Gatilho de Piloto Automático (Protocolo THE PURGE)
  const handleLaunch = async () => {
    if (!idea.trim()) return;
    try {
      await runSemiAuto({ title: idea, concept: idea, reasoning: "Manual input", score: 100, angle: "Direct" }, language, duration);
    } catch (e: any) {
      toast.error(`Erro: ${e.message}`);
    }
  };

  const isIdle = state.stage === "idle" || state.stage === "error";

  return (
    <main className="pt-28 pb-12 px-8 min-h-screen relative z-10 text-white w-full overflow-x-hidden">
      <div className="max-w-6xl mx-auto space-y-10 relative">
        
        {/* Production Center Header */}
        <div className="bg-black/40 backdrop-blur-3xl border border-white/10 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
          <div className="flex justify-between items-center relative z-10">
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 italic">Produção em Andamento</span>
              </div>
              <h1 className="text-5xl font-black tracking-tighter uppercase italic leading-none">
                Esteira de <span className="text-primary">Produção</span>
              </h1>
              <p className="text-white/30 font-bold text-[10px] uppercase tracking-widest">{channel?.name}</p>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => navigate(`/channel/${channelId}`)} variant="outline" className="rounded-2xl border-white/10 text-[10px] font-black uppercase tracking-widest bg-white/5 hover:bg-white/10">Voltar</Button>
              <Button onClick={resetProductionState} variant="ghost" className="rounded-2xl text-[10px] font-black uppercase tracking-widest text-red-500/50 hover:text-red-500 hover:bg-red-500/10">Reiniciar</Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Painel de Controle — Configuração do Vídeo */}
          <div className={cn("lg:col-span-5 space-y-10 transition-all", !isIdle && "opacity-40 grayscale pointer-events-none")}>
            <Card className="bg-black/60 border-white/10 rounded-[3rem] shadow-2xl overflow-hidden border-t-primary/20">
              <CardHeader className="bg-white/[0.02] border-b border-white/5 p-8">
                <CardTitle className="text-xl font-black uppercase italic flex items-center gap-3 text-white">
                  <Terminal className="text-primary" /> Parâmetros de Pauta
                </CardTitle>
              </CardHeader>
              <CardContent className="p-10 space-y-10">
                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-white/30">Tema do Vídeo</Label>
                  <Textarea
                    value={idea}
                    onChange={e => setIdea(e.target.value)}
                    placeholder="Qual é o tema de hoje?"
                    className="bg-black/40 border-white/10 rounded-[2rem] p-8 text-xl font-bold text-white min-h-[160px] focus:border-primary/50 transition-all" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-white/30">Idioma</Label>
                    <div className="flex gap-2">
                      {["pt-BR", "en", "es"].map(l => (
                        <Button key={l} variant={language === l ? "default" : "outline"} onClick={() => setLanguage(l as any)} className={cn("flex-1 h-12 rounded-xl font-black", language === l ? "bg-primary text-white" : "border-white/5 text-white/20")}>{l}</Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-white/30">Duração</Label>
                    <div className="flex gap-2">
                      {[2, 8, 15].map(d => (
                        <Button key={d} variant={duration === d ? "default" : "outline"} onClick={() => setDuration(d as any)} className={cn("flex-1 h-12 rounded-xl font-black", duration === d ? "bg-primary text-white" : "border-white/5 text-white/20")}>{d}m</Button>
                      ))}
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handleLaunch} 
                  disabled={!idea || (state.stage !== "idle" && state.stage !== "error")} 
                  className={cn(
                    "w-full h-24 rounded-[2.5rem] text-2xl font-black uppercase italic shadow-2xl transition-all",
                    state.stage === "error" 
                      ? "bg-red-600 hover:bg-red-700" 
                      : "bg-gradient-to-r from-primary to-orange-600 hover:scale-[1.02]"
                  )}
                >
                   {state.stage === "idle" && <><Zap className="mr-3 w-8 h-8 animate-pulse" /> Iniciar Produção</>}
                   {state.stage === "error" && <><RotateCcw className="mr-3 w-8 h-8" /> Tentar Novamente</>}
                   {state.stage !== "idle" && state.stage !== "error" && <Loader2 className="animate-spin w-8 h-8" />}
                </Button>

                {state.stage === "error" && (
                  <p className="text-red-500 text-[10px] font-black uppercase tracking-widest text-center animate-pulse">
                    ⚠️ {state.message}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Fábrica de Conteúdo — Saída de Artefatos */}
          <div className="lg:col-span-7 space-y-12">
             <Factory.Narrator />
             <Factory.Director />
             <Factory.Editor />
             <Factory.Publisher />
          </div>
        </div>
      </div>
    </main>
  );
}

export default function ProductionWizard() {
  const { id } = useParams();
  return (
    <BeamsBackground intensity="high" className="bg-[#050508]">
      <Factory channelId={id || ""}>
        <ProductionWizardContent />
      </Factory>
    </BeamsBackground>
  );
}
