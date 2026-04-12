import React from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Circle, ArrowRight, ShieldCheck, Wand2, Zap, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChannelSetupBannerProps {
  channelId: string;
  setupStatus: {
    foundation: boolean;
    blueprint: boolean;
    hub: boolean;
  };
  className?: string;
}

export function ChannelSetupBanner({ channelId, setupStatus, className }: ChannelSetupBannerProps) {
  const navigate = useNavigate();
  
  const steps = [
    {
      id: "foundation",
      label: "DNA do Canal",
      description: "Upgrade +100% Retenção",
      icon: ShieldCheck,
      completed: setupStatus.foundation,
      path: `/channel/${channelId}/foundation`
    },
    {
      id: "blueprint",
      label: "Cérebro IA",
      description: "Persona premium ativa",
      icon: Wand2,
      completed: setupStatus.blueprint,
      path: `/channel/${channelId}?tab=config`
    },
    {
      id: "hub",
      label: "Turbina Media",
      description: "Ativos cinematográficos",
      icon: Zap,
      completed: setupStatus.hub,
      path: `/hub`
    }
  ];

  const completedCount = steps.filter(s => s.completed).length;
  const isComplete = completedCount === steps.length;

  if (isComplete) return null;

  return (
    <div className={cn("relative overflow-hidden bg-primary/5 border border-primary/20 rounded-3xl p-6 mb-8", className)}>
      <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
        <Zap className="w-32 h-32 text-primary" />
      </div>
      
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-widest">Otimizador de Performance</span>
          </div>
          <h2 className="text-2xl font-bold text-white">Potencialize seus resultados</h2>
          <p className="text-muted-foreground text-sm max-w-lg">
            Desbloqueie upgrades de DNA para que a IA gere vídeos com maior retenção, roteiros profundos e estética cinematográfica.
          </p>
          
          <div className="flex items-center gap-4 mt-6">
            <div className="h-2 flex-1 bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)] transition-all duration-1000 ease-out"
                style={{ width: `${(completedCount / steps.length) * 100}%` }}
              />
            </div>
            <span className="text-xs font-mono text-primary font-bold">{completedCount}/{steps.length} Boosts</span>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-4">
          {steps.map((step) => (
            <button
              key={step.id}
              onClick={() => navigate(step.path)}
              className={cn(
                "group flex flex-col items-center text-center p-4 rounded-2xl border transition-all duration-300 w-32",
                step.completed 
                  ? "bg-green-500/10 border-green-500/20 text-green-400" 
                  : "bg-white/5 border-white/10 text-white/60 hover:border-primary/40 hover:bg-primary/5 shadow-xl hover:shadow-primary/10"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center mb-3 transition-transform group-hover:scale-110",
                step.completed ? "bg-green-500/20" : "bg-white/10"
              )}>
                {step.completed ? <CheckCircle2 className="w-5 h-5" /> : <step.icon className="w-5 h-5" />}
              </div>
              <span className="text-xs font-bold">{step.label}</span>
              <span className="text-[9px] opacity-60 leading-tight mt-1">{step.description}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
