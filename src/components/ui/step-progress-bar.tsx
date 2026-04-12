import React from "react";
import { Check, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  label: string;
  icon: LucideIcon;
  description?: string;
}

interface StepProgressBarProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export function StepProgressBar({ steps, currentStep, className }: StepProgressBarProps) {
  return (
    <div className={cn("w-full py-4", className)}>
      <div className="relative flex justify-between">
        {/* Connection Line */}
        <div className="absolute top-5 left-0 w-full h-0.5 bg-white/5 -z-0">
          <div 
            className="h-full bg-primary transition-all duration-500 ease-in-out"
            style={{ width: `${Math.max(0, Math.min(100, ((currentStep - 1) / (steps.length - 1)) * 100))}%` }}
          />
        </div>

        {/* Steps */}
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isActive = stepNumber === currentStep;
          const StepIcon = step.icon;

          return (
            <div key={index} className="relative z-10 flex flex-col items-center group">
              <div 
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2",
                  isCompleted 
                    ? "bg-primary border-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.5)]" 
                    : isActive 
                      ? "bg-background border-primary text-primary shadow-[0_0_10px_rgba(var(--primary),0.3)] scale-110" 
                      : "bg-background border-white/10 text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <StepIcon className="w-5 h-5" />
                )}
              </div>
              
              <div className="mt-2 text-center">
                <span 
                  className={cn(
                    "text-[10px] uppercase font-bold tracking-wider transition-colors duration-300",
                    isActive ? "text-primary" : isCompleted ? "text-white/80" : "text-muted-foreground/40"
                  )}
                >
                  {step.label}
                </span>
                {step.description && isActive && (
                  <div className="absolute top-12 left-1/2 -translate-x-1/2 w-48 p-2 bg-card border border-white/10 rounded-lg shadow-xl animate-in fade-in zoom-in duration-200 z-50">
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      {step.description}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
