import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { History, RotateCcw, Trash2, Clock, Film, ChevronDown, ChevronUp } from "lucide-react";

interface VideoGeneration {
  id: string;
  title: string;
  youtube_title: string | null;
  scene_count: number;
  duration_sec: number;
  status: "draft" | "complete" | "exported";
  created_at: string;
  script_data: Record<string, unknown>;
}

interface VideoGenerationHistoryProps {
  channelId: string;
  onRestore: (scriptData: Record<string, unknown>) => void;
}

const STATUS_LABELS: Record<VideoGeneration["status"], string> = {
  draft: "Rascunho",
  complete: "Completo",
  exported: "Exportado",
};

const STATUS_VARIANTS: Record<VideoGeneration["status"], "secondary" | "default" | "outline"> = {
  draft: "secondary",
  complete: "default",
  exported: "outline",
};

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function VideoGenerationHistory({ channelId, onRestore }: VideoGenerationHistoryProps) {
  const [generations, setGenerations] = useState<VideoGeneration[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchGenerations = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("video_generations")
      .select("id, title, youtube_title, scene_count, duration_sec, status, created_at, script_data")
      .eq("channel_id", channelId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("[VideoGenerationHistory] fetch error:", error.message);
    } else {
      setGenerations((data ?? []) as VideoGeneration[]);
    }
    setLoading(false);
  }, [channelId]);

  useEffect(() => {
    fetchGenerations();
  }, [fetchGenerations]);

  const handleRestore = (gen: VideoGeneration) => {
    onRestore(gen.script_data);
    toast.success(`"${gen.title}" restaurado no Studio.`);
  };

  const handleDelete = async (id: string, title: string) => {
    setDeletingId(id);
    const { error } = await supabase.from("video_generations").delete().eq("id", id);
    if (error) {
      toast.error(`Erro ao excluir: ${error.message}`);
    } else {
      setGenerations((prev) => prev.filter((g) => g.id !== id));
      toast.success(`"${title}" excluído.`);
    }
    setDeletingId(null);
  };

  if (loading) {
    return (
      <div className="space-y-3 mt-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (generations.length === 0) return null;

  return (
    <div className="mt-8">
      <button
        className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors mb-3 w-full text-left"
        onClick={() => setCollapsed((v) => !v)}
        type="button"
      >
        <History className="w-4 h-4 text-primary" />
        Gerações Anteriores
        <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
          {generations.length}
        </Badge>
        <span className="ml-auto">
          {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </span>
      </button>

      {!collapsed && (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          {generations.map((gen) => (
            <Card
              key={gen.id}
              className="border-white/10 bg-card/40 hover:bg-card/60 transition-colors"
            >
              <CardHeader className="py-3 px-4 pb-0">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm font-medium leading-tight line-clamp-1">
                    {gen.title}
                  </CardTitle>
                  <Badge variant={STATUS_VARIANTS[gen.status]} className="text-[10px] shrink-0">
                    {STATUS_LABELS[gen.status]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-4 py-3">
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                  <span className="flex items-center gap-1">
                    <Film className="w-3 h-3" />
                    {gen.scene_count} cenas
                  </span>
                  {gen.duration_sec > 0 && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDuration(gen.duration_sec)}
                    </span>
                  )}
                  <span className="ml-auto">{formatDate(gen.created_at)}</span>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    className="flex-1 h-8 text-xs bg-indigo-600 hover:bg-indigo-700"
                    onClick={() => handleRestore(gen)}
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Restaurar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(gen.id, gen.title)}
                    disabled={deletingId === gen.id}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
