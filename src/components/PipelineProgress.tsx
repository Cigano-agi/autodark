/**
 * PipelineProgress — Floating badge (bottom-right) showing active pipeline runs.
 * Only visible when production_states has status = 'running' for this channel.
 * Dismiss hides it temporarily via localStorage; reappears when step changes.
 */
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProductionState } from "@/hooks/useProductionState";

export interface PipelineProgressProps {
  channelId: string;
}

const STEP_LABELS: Record<number, string> = {
  1: "Roteiro",
  2: "Áudio",
  3: "Imagens",
  4: "SEO",
  5: "Revisão",
};

function dismissKey(channelId: string, step: number) {
  return `pipeline-progress-dismissed-${channelId}-${step}`;
}

export function PipelineProgress({ channelId }: PipelineProgressProps) {
  const navigate = useNavigate();
  const { state, loading } = useProductionState(channelId);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const prevStepRef = useRef<number | null>(null);

  const isRunning = state?.status === "running";
  const step = state?.step ?? 1;
  const stepLabel = STEP_LABELS[step] ?? `Etapa ${step}`;

  // Re-show if step changes (user made progress)
  useEffect(() => {
    if (prevStepRef.current !== null && prevStepRef.current !== step) {
      const key = dismissKey(channelId, prevStepRef.current);
      localStorage.removeItem(key);
      setDismissed(false);
    }
    prevStepRef.current = step;
  }, [step, channelId]);

  // Sync dismissed state with localStorage for current step
  useEffect(() => {
    if (!isRunning) return;
    const key = dismissKey(channelId, step);
    setDismissed(localStorage.getItem(key) === "1");
  }, [channelId, step, isRunning]);

  // Animate slide-in when should show
  useEffect(() => {
    const shouldShow = isRunning && !dismissed && !loading;
    if (shouldShow) {
      // Small delay so CSS transition fires
      const t = setTimeout(() => setVisible(true), 50);
      return () => clearTimeout(t);
    }
    setVisible(false);
  }, [isRunning, dismissed, loading]);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    const key = dismissKey(channelId, step);
    localStorage.setItem(key, "1");
    setDismissed(true);
  };

  const handleClick = () => {
    navigate(`/channel/${channelId}/production`);
  };

  if (!isRunning || loading) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Pipeline ativo: ${stepLabel}`}
      className={cn(
        "fixed bottom-6 right-6 z-50",
        "transition-all duration-400 ease-out",
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-4 pointer-events-none",
      )}
    >
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "group relative flex items-center gap-3 pr-9",
          "rounded-2xl border border-border/30 bg-card/90 backdrop-blur-md",
          "px-4 py-3 shadow-xl shadow-black/30",
          "hover:border-border/50 hover:shadow-2xl hover:shadow-black/40",
          "transition-all duration-200 ease-out",
        )}
      >
        {/* Pulsing green dot */}
        <span className="relative flex-shrink-0">
          <span className="block w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <span className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-400/50 animate-ping" />
        </span>

        {/* Icon */}
        <Zap className="w-4 h-4 text-emerald-400 flex-shrink-0" />

        {/* Text */}
        <div className="text-left min-w-0">
          <p className="text-xs font-semibold text-foreground leading-tight">
            Produção em andamento
          </p>
          <p className="text-[11px] text-muted-foreground leading-tight truncate">
            {stepLabel}
          </p>
        </div>

        {/* Dismiss */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Ocultar"
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2",
            "p-1 rounded-full",
            "text-muted-foreground/50 hover:text-foreground hover:bg-border/30",
            "transition-colors duration-150",
          )}
        >
          <X className="w-3 h-3" />
        </button>
      </button>
    </div>
  );
}
