import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Check, AlertCircle, RefreshCw, Loader2, ChevronDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface WizardStep {
  id: string;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  behindTheScenes?: string;
  details?: string;
  status: "pending" | "active" | "done" | "error";
  progress?: number;
  error?: string;
}

export interface StepWizardProps {
  steps: WizardStep[];
  currentStep: number;
  variant?: "vertical" | "horizontal";
  onRetry?: (stepId: string) => void;
  className?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_ICON_SIZE = "w-5 h-5";

// ─── Sub-components ─────────────────────────────────────────────────────────

function StepIcon({
  step,
  isActive,
}: {
  step: WizardStep;
  isActive: boolean;
}) {
  const Icon = step.icon;

  if (step.status === "done") {
    return <Check className={cn(STATUS_ICON_SIZE, "text-emerald-400")} />;
  }

  if (step.status === "error") {
    return <AlertCircle className={cn(STATUS_ICON_SIZE, "text-red-400")} />;
  }

  if (isActive) {
    return <Loader2 className={cn(STATUS_ICON_SIZE, "text-foreground animate-spin")} />;
  }

  return (
    <Icon
      className={cn(
        STATUS_ICON_SIZE,
        step.status === "pending"
          ? "text-muted-foreground/50"
          : "text-foreground",
      )}
    />
  );
}

function StepConnector({
  isDone,
  isVertical,
}: {
  isDone: boolean;
  isVertical: boolean;
}) {
  return (
    <div
      className={cn(
        "transition-all duration-700 ease-out",
        isVertical
          ? "w-0.5 ml-[19px] min-h-[32px] flex-shrink-0"
          : "h-0.5 flex-1 min-w-[24px]",
        isDone ? "bg-emerald-500/60" : "bg-border/40",
      )}
    />
  );
}

// Shared markdown styles applied to ReactMarkdown children
const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="text-body-sm text-muted-foreground leading-relaxed italic">{children}</p>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-foreground not-italic">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className="italic text-muted-foreground">{children}</em>
  ),
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className="px-1 py-0.5 rounded bg-border/40 text-[11px] font-mono text-foreground not-italic">{children}</code>
  ),
};

function BehindTheScenes({ text }: { text: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={cn(
        "flex items-start gap-3 mt-4 p-4 rounded-lg",
        "bg-accent/5 border border-accent/10",
        "transition-all duration-500 ease-out",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
      )}
    >
      <div className="relative mt-0.5 flex-shrink-0">
        <span className="block w-2 h-2 rounded-full bg-accent animate-pulse" />
        <span className="absolute inset-0 w-2 h-2 rounded-full bg-accent/40 animate-ping" />
      </div>
      <ReactMarkdown components={markdownComponents}>{text}</ReactMarkdown>
    </div>
  );
}

const DETAILS_COLLAPSED_LINES = 3;

function DetailsExpander({ details }: { details: string }) {
  const [expanded, setExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [collapsedHeight, setCollapsedHeight] = useState<number | undefined>(undefined);
  const [fullHeight, setFullHeight] = useState<number | undefined>(undefined);

  // Measure heights once content renders
  useEffect(() => {
    if (!contentRef.current) return;
    const el = contentRef.current;
    // full height
    setFullHeight(el.scrollHeight);
    // Approximate collapsed height: line-height * lines
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 20;
    setCollapsedHeight(lineHeight * DETAILS_COLLAPSED_LINES);
  }, [details]);

  const needsTruncation =
    fullHeight !== undefined &&
    collapsedHeight !== undefined &&
    fullHeight > collapsedHeight + 4;

  const currentHeight =
    !needsTruncation
      ? undefined
      : expanded
        ? fullHeight
        : collapsedHeight;

  return (
    <div className="mt-3 rounded-lg border border-border/30 bg-card/40 overflow-hidden">
      <div
        ref={contentRef}
        style={{ height: currentHeight, overflow: "hidden" }}
        className="transition-[height] duration-300 ease-in-out px-3 pt-3 pb-1"
      >
        <ReactMarkdown
          components={{
            ...markdownComponents,
            p: ({ children }: { children?: React.ReactNode }) => (
              <p className="text-[11px] text-muted-foreground leading-relaxed mb-1">{children}</p>
            ),
          }}
        >
          {details}
        </ReactMarkdown>
      </div>

      {needsTruncation && (
        <button
          type="button"
          onClick={() => setExpanded(prev => !prev)}
          className={cn(
            "w-full flex items-center justify-center gap-1 py-1.5",
            "text-[10px] font-medium text-muted-foreground hover:text-foreground",
            "border-t border-border/20 transition-colors duration-150",
          )}
        >
          <ChevronDown
            className={cn(
              "w-3 h-3 transition-transform duration-300",
              expanded && "rotate-180",
            )}
          />
          {expanded ? "Ocultar detalhes" : "Ver detalhes"}
        </button>
      )}
    </div>
  );
}

function ErrorBlock({
  error,
  stepId,
  onRetry,
}: {
  error: string;
  stepId: string;
  onRetry?: (stepId: string) => void;
}) {
  return (
    <div className="mt-4 p-4 rounded-lg bg-destructive/8 border border-destructive/20">
      <p className="text-body-sm text-red-400 mb-3">{error}</p>
      {onRetry && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onRetry(stepId)}
          className="h-8 gap-1.5 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Tentar novamente
        </Button>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function StepWizard({
  steps,
  currentStep,
  variant = "vertical",
  onRetry,
  className,
}: StepWizardProps) {
  const isVertical = variant === "vertical";
  const activeRef = useRef<HTMLDivElement>(null);

  // Scroll active step into view on mobile
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [currentStep]);

  const completedCount = steps.filter((s) => s.status === "done").length;
  const totalProgress =
    steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;

  return (
    <div className={cn("w-full", className)}>
      {/* Overall progress header */}
      <div className="mb-6 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-caption text-muted-foreground uppercase tracking-widest font-medium">
            Progresso
          </span>
          <span className="text-caption text-muted-foreground tabular-nums">
            {completedCount}/{steps.length} etapas
          </span>
        </div>
        <Progress value={totalProgress} className="h-1 bg-border/30" />
      </div>

      {/* Steps container */}
      <div
        className={cn(
          isVertical
            ? "flex flex-col"
            : "flex items-start gap-0 overflow-x-auto pb-4 scrollbar-dark",
        )}
        role="list"
        aria-label="Etapas do processo"
      >
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isPast = step.status === "done";
          const isLast = index === steps.length - 1;

          return (
            <div key={step.id} className={cn(isVertical ? "" : "flex items-start")}>
              {/* Step item */}
              <div
                ref={isActive ? activeRef : undefined}
                role="listitem"
                aria-current={isActive ? "step" : undefined}
                className={cn(
                  "group relative",
                  isVertical ? "pb-2" : "flex flex-col items-center min-w-[140px]",
                )}
              >
                {/* Step header: icon ring + text */}
                <div
                  className={cn(
                    isVertical
                      ? "flex items-start gap-4"
                      : "flex flex-col items-center gap-2 text-center",
                  )}
                >
                  {/* Icon ring */}
                  <div
                    className={cn(
                      "relative flex items-center justify-center rounded-full",
                      "w-10 h-10 flex-shrink-0",
                      "border-2 transition-all duration-500",
                      step.status === "done" &&
                        "bg-emerald-500/15 border-emerald-500/40",
                      step.status === "error" &&
                        "bg-red-500/15 border-red-500/40",
                      isActive &&
                        step.status === "active" &&
                        "bg-accent/15 border-accent/50",
                      step.status === "pending" &&
                        "bg-card/50 border-border/40",
                    )}
                  >
                    <StepIcon step={step} isActive={isActive} />

                    {/* Active glow ring */}
                    {isActive && step.status === "active" && (
                      <span
                        className="absolute inset-0 rounded-full border-2 border-accent/30 animate-pulse-glow"
                        aria-hidden
                      />
                    )}
                  </div>

                  {/* Text content */}
                  <div className={cn(isVertical ? "pt-1" : "px-2")}>
                    <h4
                      className={cn(
                        "text-body font-semibold tracking-tight transition-colors duration-300",
                        step.status === "done" && "text-emerald-400",
                        step.status === "error" && "text-red-400",
                        isActive && step.status === "active" && "text-foreground",
                        step.status === "pending" && "text-muted-foreground/60",
                      )}
                    >
                      {step.title}
                    </h4>
                    <p
                      className={cn(
                        "text-body-sm mt-0.5 transition-colors duration-300",
                        isActive
                          ? "text-muted-foreground"
                          : "text-muted-foreground/50",
                      )}
                    >
                      {step.subtitle}
                    </p>

                    {/* Active step progress bar */}
                    {isActive &&
                      step.status === "active" &&
                      step.progress != null &&
                      step.progress > 0 && (
                        <div className="mt-3 space-y-1.5">
                          <Progress
                            value={step.progress}
                            className="h-1.5 bg-border/30"
                          />
                          <p className="text-caption text-muted-foreground/70 tabular-nums text-right">
                            {step.progress}%
                          </p>
                        </div>
                      )}

                    {/* Behind the scenes text */}
                    {isActive &&
                      step.status === "active" &&
                      step.behindTheScenes && (
                        <BehindTheScenes text={step.behindTheScenes} />
                      )}

                    {/* Expandable step output details */}
                    {step.details && (
                      <DetailsExpander details={step.details} />
                    )}

                    {/* Error block */}
                    {step.status === "error" && step.error && (
                      <ErrorBlock
                        error={step.error}
                        stepId={step.id}
                        onRetry={onRetry}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Connector line */}
              {!isLast && (
                <StepConnector isDone={isPast} isVertical={isVertical} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
