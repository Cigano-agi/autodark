import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ContentStatusBadge } from "@/components/ContentStatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Video, Wand2, RefreshCw, List, Clock, CheckCircle2, XCircle, Play, RotateCcw, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { SkeletonList } from "@/components/ui/skeleton-card";
import { useProductionState } from "@/hooks/useProductionState";
import { ReviewQueue } from "@/components/Channel/ReviewQueue";

interface QueueTabProps {
  channelId: string;
}

interface ContentRow {
  id: string;
  title: string | null;
  status: string | null;
  topic: string | null;
  created_at: string;
  updated_at: string;
  audio_url: string | null;
  thumbnail_url: string | null;
  audio_duration: number | null;
}

const STEP_LABELS: Record<number, string> = {
  1: "Configuração",
  2: "Roteiro",
  3: "Áudio",
  4: "Imagens",
  5: "SEO & Revisão",
};

const IN_PROGRESS_STATUSES = ["queued", "config_set", "script_generated", "pending_tts", "tts_done", "visuals_done", "assembled", "generating"];
const REVIEW_STATUSES = ["awaiting_review", "seo_done"];
const DONE_STATUSES = ["published"];

function statusToProgress(status: string | null): number {
  const map: Record<string, number> = {
    queued: 5, config_set: 10, script_generated: 30, pending_tts: 40,
    tts_done: 55, visuals_done: 75, assembled: 85, seo_done: 90,
    awaiting_review: 95, published: 100,
  };
  return map[status ?? ""] ?? 0;
}

export function QueueTab({ channelId }: QueueTabProps) {
  const navigate = useNavigate();
  const [contents, setContents] = useState<ContentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { state: productionState, reset: resetProduction } = useProductionState(channelId);

  // Initial load
  useEffect(() => {
    (async () => {
      const { data } = await (supabase.from as any)("channel_contents")
        .select("id, title, status, topic, created_at, updated_at, audio_url, thumbnail_url, audio_duration")
        .eq("channel_id", channelId)
        .order("created_at", { ascending: false });
      setContents(data || []);
      setLoading(false);
    })();
  }, [channelId]);

  // Realtime subscription (B3)
  useEffect(() => {
    const channel = supabase
      .channel(`contents-${channelId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "channel_contents",
        filter: `channel_id=eq.${channelId}`,
      }, (payload: any) => {
        setContents(prev => {
          const updated = payload.new as ContentRow;
          if (payload.eventType === "INSERT") return [updated, ...prev];
          if (payload.eventType === "UPDATE") return prev.map(c => c.id === updated.id ? updated : c);
          if (payload.eventType === "DELETE") return prev.filter(c => c.id !== (payload.old as any).id);
          return prev;
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [channelId]);

  const inProgress = contents.filter(c => IN_PROGRESS_STATUSES.includes(c.status ?? ""));
  const review = contents.filter(c => REVIEW_STATUSES.includes(c.status ?? ""));
  const done = contents.filter(c => DONE_STATUSES.includes(c.status ?? ""));
  const failed = contents.filter(c => c.status === "failed" || c.status === "tts_failed" || c.status === "audio_storage_failed");
  const other = contents.filter(c =>
    !IN_PROGRESS_STATUSES.includes(c.status ?? "") &&
    !REVIEW_STATUSES.includes(c.status ?? "") &&
    !DONE_STATUSES.includes(c.status ?? "") &&
    c.status !== "failed" && c.status !== "tts_failed" && c.status !== "audio_storage_failed"
  );

  if (loading) {
    return <SkeletonList count={3} />;
  }

  const showResumeBanner =
    productionState?.status === "running" || productionState?.status === "paused";

  return (
    <div className="space-y-12">
      {/* Auto-Resume Banner */}
      {showResumeBanner && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-300">
                Produção em andamento — Clique para retomar
              </p>
              <p className="text-xs text-amber-400/60 mt-0.5">
                Etapa interrompida: {STEP_LABELS[productionState.step] ?? `Passo ${productionState.step}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              size="sm"
              className="flex-1 sm:flex-none gap-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold"
              onClick={() =>
                navigate(`/channel/${channelId}/production`, {
                  state: { resumeFromStep: productionState.step },
                })
              }
            >
              Retomar Agora
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="flex-1 sm:flex-none text-amber-400/60 hover:text-amber-300 hover:bg-amber-500/10"
              onClick={() => resetProduction()}
            >
              Descartar
            </Button>
          </div>
        </div>
      )}

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
        <div className="flex flex-col">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <List className="w-5 h-5 text-primary" /> Fila de Produção
          </h2>
          <p className="text-sm text-muted-foreground">Acompanhe o progresso dos seus vídeos em tempo real.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            onClick={() => navigate(`/channel/${channelId}/production`)}
            className="flex-1 sm:flex-none gap-2 bg-primary text-primary-foreground shadow-lg shadow-primary/20"
          >
            <Video className="w-4 h-4" /> Novo Vídeo Curto
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(`/channel/${channelId}/studio`)}
            className="flex-1 sm:flex-none gap-2 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10"
          >
            <Wand2 className="w-4 h-4" /> Studio Longo
          </Button>
        </div>
      </div>

      <div className="space-y-10">
        {/* In Progress */}
        {inProgress.length > 0 && (
          <Section icon={RefreshCw} color="text-blue-400" title={`Em Produção (${inProgress.length})`}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {inProgress.map(c => (
                <ContentCard key={c.id} content={c} showProgress channelId={channelId} />
              ))}
            </div>
          </Section>
        )}

        {/* Awaiting Review — ReviewQueue com modal funcional */}
        <ReviewQueue channelId={channelId} />

        {/* Done */}
        {done.length > 0 && (
          <Section icon={CheckCircle2} color="text-green-400" title={`Concluídos (${done.length})`}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {done.map(c => (
                <ContentCard key={c.id} content={c} channelId={channelId} />
              ))}
            </div>
          </Section>
        )}

        {/* Failed */}
        {failed.length > 0 && (
          <Section icon={XCircle} color="text-red-400" title={`Falharam (${failed.length})`}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {failed.map(c => (
                <ContentCard key={c.id} content={c} channelId={channelId} />
              ))}
            </div>
          </Section>
        )}
      </div>

      {contents.length === 0 && (
        <Card className="bg-card/30 border-dashed border-white/10 p-20 text-center rounded-3xl">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
            <Video className="w-10 h-10 text-white/20" />
          </div>
          <h3 className="text-xl font-medium text-white mb-2">Fila vazia</h3>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Comece a produzir um novo vídeo ou aprove uma ideia para vê-la aqui.
          </p>
        </Card>
      )}
    </div>
  );
}

function Section({ title, icon: Icon, color, children }: { title: string; icon: any; color: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className={cn("flex items-center gap-2", color)}>
        <Icon className="w-4 h-4" />
        <h3 className="text-sm font-bold uppercase tracking-widest">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// Pipeline stage dots — Script, Áudio, Imagens, SEO, Revisão
const STAGE_STATUSES: Array<{ label: string; statuses: string[] }> = [
  { label: "Script",  statuses: ["script_generated"] },
  { label: "Áudio",   statuses: ["pending_tts", "tts_done"] },
  { label: "Imagens", statuses: ["visuals_done", "assembled"] },
  { label: "SEO",     statuses: ["seo_done"] },
  { label: "Revisão", statuses: ["awaiting_review", "published"] },
];

const STAGE_ORDER = [
  "queued", "config_set", "script_generated",
  "pending_tts", "tts_done", "visuals_done",
  "assembled", "seo_done", "awaiting_review", "published",
];

function stageDotColor(stageIndex: number, currentStatus: string | null): string {
  const currentIndex = STAGE_ORDER.indexOf(currentStatus ?? "");
  const stageThreshold = STAGE_ORDER.indexOf(STAGE_STATUSES[stageIndex].statuses.at(-1)!);
  if (currentIndex < 0) return "bg-border/40";
  if (currentIndex >= stageThreshold) return "bg-emerald-500";
  // partial: the current stage being processed
  const stageStart = STAGE_ORDER.indexOf(STAGE_STATUSES[stageIndex].statuses[0]);
  if (currentIndex >= stageStart) return "bg-blue-400 animate-pulse";
  return "bg-border/40";
}

function PipelineDots({ status }: { status: string | null }) {
  return (
    <div className="flex items-center gap-1.5 mt-2">
      {STAGE_STATUSES.map((stage, i) => (
        <div key={stage.label} className="flex flex-col items-center gap-0.5">
          <div className={cn("w-2 h-2 rounded-full transition-colors duration-500", stageDotColor(i, status))} />
          <span className="text-[8px] text-muted-foreground/50 leading-none">{stage.label}</span>
        </div>
      ))}
    </div>
  );
}

const RESUMABLE_STATUSES = new Set([
  "failed", "tts_failed", "audio_storage_failed",
  ...IN_PROGRESS_STATUSES,
]);

function ContentCard({
  content,
  showProgress,
  channelId,
}: {
  content: ContentRow;
  showProgress?: boolean;
  channelId: string;
}) {
  const navigate = useNavigate();
  const progress = statusToProgress(content.status);
  const isFailed = content.status === "failed" || content.status === "tts_failed" || content.status === "audio_storage_failed";
  const canResume = RESUMABLE_STATUSES.has(content.status ?? "");

  return (
    <Card
      className={cn(
        "bg-card/30 backdrop-blur border-border/20",
        "transition-all duration-200 ease-out",
        "hover:scale-[1.01] hover:shadow-lg hover:shadow-black/20 hover:border-border/40",
      )}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-foreground truncate">
              {content.title || content.topic || "Sem título"}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              {new Date(content.updated_at || content.created_at).toLocaleString("pt-BR")}
            </p>
          </div>

          {/* Thumbnail */}
          {content.thumbnail_url && (
            <img
              src={content.thumbnail_url}
              alt="Miniatura"
              width={60}
              height={40}
              className="rounded object-cover flex-shrink-0 border border-border/20"
              style={{ width: 60, height: 40 }}
            />
          )}
        </div>

        {/* Status badge + duration + pipeline dots */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ContentStatusBadge status={content.status} />
            {content.audio_duration != null && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-medium text-muted-foreground">
                ⏱ {content.audio_duration}s
              </span>
            )}
          </div>
          <PipelineDots status={content.status} />
        </div>

        {/* Progress bar */}
        {showProgress && progress > 0 && progress < 100 && (
          <div className="space-y-1">
            <Progress value={progress} className="h-1.5" />
            <p className="text-[10px] text-muted-foreground text-right tabular-nums">{progress}%</p>
          </div>
        )}

        {/* Audio preview badge */}
        {content.audio_url && (
          <a
            href={content.audio_url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full",
              "bg-emerald-500/10 border border-emerald-500/20",
              "text-[11px] font-medium text-emerald-400",
              "hover:bg-emerald-500/20 transition-colors duration-150",
            )}
            onClick={e => e.stopPropagation()}
          >
            <Play className="w-3 h-3" />
            Ouvir prévia
          </a>
        )}

        {/* Retomar button */}
        {canResume && (
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              navigate(`/channel/${channelId}/production`, {
                state: { resumeContentId: content.id },
              })
            }
            className={cn(
              "w-full h-7 gap-1.5 text-xs mt-1",
              isFailed
                ? "border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                : "border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300",
            )}
          >
            <RotateCcw className="w-3 h-3" />
            Retomar
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
