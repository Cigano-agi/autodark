import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "premium";
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  tips?: string[];
  variant?: "default" | "onboarding" | "success" | "error";
  className?: string;
}

// ─── Variant config ─────────────────────────────────────────────────────────

const VARIANT_STYLES = {
  default: {
    iconRing: "bg-card border-border/40 text-muted-foreground",
    tipsBorder: "border-border/30",
  },
  onboarding: {
    iconRing: "bg-accent/10 border-accent/30 text-accent",
    tipsBorder: "border-accent/15",
  },
  success: {
    iconRing: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
    tipsBorder: "border-emerald-500/15",
  },
  error: {
    iconRing: "bg-red-500/10 border-red-500/30 text-red-400",
    tipsBorder: "border-red-500/15",
  },
} as const;

// ─── Component ──────────────────────────────────────────────────────────────

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  tips,
  variant = "default",
  className,
}: EmptyStateProps) {
  const [mounted, setMounted] = useState(false);
  const styles = VARIANT_STYLES[variant];

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center py-16 px-6 md:py-20 md:px-8",
        "rounded-2xl border border-border/30",
        "bg-card/30 backdrop-blur-sm overflow-hidden",
        "transition-all duration-700 ease-out",
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        className,
      )}
      role="status"
      aria-label={title}
    >
      {/* Subtle radial gradient accent */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            variant === "success"
              ? "radial-gradient(ellipse at center, rgba(16,185,129,0.04) 0%, transparent 70%)"
              : variant === "error"
                ? "radial-gradient(ellipse at center, rgba(239,68,68,0.04) 0%, transparent 70%)"
                : variant === "onboarding"
                  ? "radial-gradient(ellipse at center, hsl(220 87% 55% / 0.04) 0%, transparent 70%)"
                  : "radial-gradient(ellipse at center, hsl(220 87% 55% / 0.02) 0%, transparent 70%)",
        }}
        aria-hidden
      />

      {/* Corner grain texture */}
      <div
        className="absolute inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
        aria-hidden
      />

      {/* Icon */}
      <div
        className={cn(
          "relative flex items-center justify-center",
          "w-20 h-20 rounded-2xl border-2",
          "transition-all duration-500 delay-100",
          mounted ? "opacity-100 scale-100" : "opacity-0 scale-90",
          styles.iconRing,
        )}
      >
        <Icon className="w-9 h-9" strokeWidth={1.5} />

        {/* Decorative corner dots */}
        <span
          className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-border/30"
          aria-hidden
        />
        <span
          className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-border/30"
          aria-hidden
        />
      </div>

      {/* Title */}
      <h3
        className={cn(
          "mt-6 text-h4 font-bold tracking-tight text-foreground text-center",
          "transition-all duration-500 delay-200",
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
        )}
      >
        {title}
      </h3>

      {/* Description */}
      <p
        className={cn(
          "mt-2 text-body text-muted-foreground text-center max-w-md leading-relaxed",
          "transition-all duration-500 delay-300",
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
        )}
      >
        {description}
      </p>

      {/* Actions */}
      {(action || secondaryAction) && (
        <div
          className={cn(
            "mt-8 flex items-center gap-3 flex-wrap justify-center",
            "transition-all duration-500 delay-[400ms]",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
          )}
        >
          {action && (
            <Button
              onClick={action.onClick}
              size="lg"
              className={cn(
                "h-11 px-8 font-medium",
                action.variant === "premium"
                  ? "bg-foreground text-background hover:bg-foreground/90 shadow-lg shadow-foreground/10"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20",
              )}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant="ghost"
              size="lg"
              className="h-11 text-muted-foreground hover:text-foreground"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}

      {/* Tips section */}
      {tips && tips.length > 0 && (
        <div
          className={cn(
            "mt-10 w-full max-w-lg",
            "transition-all duration-500 delay-500",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
          )}
        >
          <div
            className={cn(
              "rounded-xl border p-5",
              "bg-card/40",
              styles.tipsBorder,
            )}
          >
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-warning" />
              <span className="text-label text-muted-foreground uppercase tracking-wider">
                Dicas
              </span>
            </div>
            <ul className="space-y-2.5">
              {tips.map((tip, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 text-body-sm text-muted-foreground leading-relaxed"
                >
                  <span
                    className="mt-1.5 block w-1.5 h-1.5 rounded-full bg-muted-foreground/30 flex-shrink-0"
                    aria-hidden
                  />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
