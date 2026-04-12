import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface SceneCardProps {
  sceneIndex: number;
  totalScenes: number;
  status: "pending" | "generating" | "done" | "error";
  imageUrl?: string;
  audioUrl?: string;
  durationSec?: number;
  prompt?: string;
  chapterTitle?: string;
}

const STATUS_CONFIG = {
  pending:    { dot: "bg-muted-foreground", label: "Pendente" },
  generating: { dot: "bg-primary animate-pulse", label: "Gerando" },
  done:       { dot: "bg-green-500", label: "Pronto" },
  error:      { dot: "bg-destructive", label: "Erro" },
} as const;

export function SceneCard({
  sceneIndex,
  totalScenes,
  status,
  imageUrl,
  audioUrl,
  durationSec,
  prompt,
  chapterTitle,
}: SceneCardProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const toggleAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const { dot, label } = STATUS_CONFIG[status];

  return (
    <div className="rounded-lg border border-border bg-card/60 backdrop-blur hover:border-primary/30 transition-all duration-200 overflow-hidden">
      {chapterTitle && (
        <div className="px-3 py-1.5 border-b border-border bg-card/40">
          <p className="text-xs font-medium text-muted-foreground truncate">{chapterTitle}</p>
        </div>
      )}

      {imageUrl && (
        <div className="relative aspect-video w-full overflow-hidden bg-muted">
          <img
            src={imageUrl}
            alt={`Cena ${sceneIndex + 1}`}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-foreground">
            Cena {sceneIndex + 1}/{totalScenes}
          </span>

          <div className="flex items-center gap-2">
            {durationSec !== undefined && (
              <span className="text-xs text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                ⏱ {Math.round(durationSec)}s
              </span>
            )}
            <span className={cn("flex items-center gap-1 text-xs text-muted-foreground")}>
              <span className={cn("w-2 h-2 rounded-full inline-block", dot)} />
              {label}
            </span>
          </div>
        </div>

        {prompt && (
          <p
            className="text-xs text-muted-foreground line-clamp-2 leading-relaxed"
            title={prompt}
          >
            {prompt}
          </p>
        )}

        {audioUrl && audioUrl !== "browser_tts" && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleAudio}
              className="flex items-center gap-1.5 text-xs text-foreground bg-muted hover:bg-muted/80 rounded px-2 py-1 transition-colors"
              aria-label={isPlaying ? "Pausar narração" : "Reproduzir narração"}
            >
              {isPlaying ? "⏸" : "▶"} Narração
            </button>
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
          </div>
        )}
      </div>
    </div>
  );
}
