import { useNavigate } from "react-router-dom";
import { Clock, ArrowRight, Video, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { GlobalQueueItem } from "@/hooks/useGlobalQueue";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `há ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `há ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `há ${days}d`;
}

interface GlobalQueueSectionProps {
  items: GlobalQueueItem[];
}

export function GlobalQueueSection({ items }: GlobalQueueSectionProps) {
  const navigate = useNavigate();

  if (items.length === 0) return null;

  return (
    <div className="mb-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          <h2 className="text-lg font-semibold text-white">Aguardando Revisão</h2>
          <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 text-xs">
            {items.length} {items.length === 1 ? "vídeo" : "vídeos"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">em {new Set(items.map(i => i.channel_id)).size} canais</p>
      </div>

      {/* Alert */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20 mb-4">
        <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
        <p className="text-sm text-yellow-300/80">
          {items.length} {items.length === 1 ? "vídeo precisa" : "vídeos precisam"} da sua aprovação antes de ser publicado.
        </p>
      </div>

      {/* Items */}
      <div className="space-y-3">
        {items.slice(0, 5).map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-4 p-4 rounded-xl bg-card/30 backdrop-blur border border-white/10 hover:border-white/20 transition-colors group"
          >
            {/* Video icon */}
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center shrink-0">
              <Video className="w-5 h-5 text-yellow-400" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{item.title || item.topic || "Sem título"}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground">{item.channel_name}</span>
                <span className="text-xs text-white/20">·</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {timeAgo(item.created_at)}
                </span>
              </div>
            </div>

            {/* Action */}
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/10 hover:border-yellow-500/50 text-xs h-8 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => navigate(`/channel/${item.channel_id}?tab=conteudos`)}
            >
              Revisar
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        ))}

        {items.length > 5 && (
          <p className="text-center text-sm text-muted-foreground pt-2">
            + {items.length - 5} outros vídeos aguardando revisão
          </p>
        )}
      </div>
    </div>
  );
}
