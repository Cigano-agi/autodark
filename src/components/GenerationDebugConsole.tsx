import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Terminal, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Loader2, Clock } from "lucide-react";

interface LogRow {
  id: string;
  step_name: string;
  status: string;
  message: string | null;
  error_details: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

const STEP_LABELS: Record<string, string> = {
  script_generation: "📝 Roteiro",
  image_generation: "🖼️ Imagens",
  audio_generation: "🔊 Áudio",
  video_render: "🎬 Renderização",
  video_upload: "☁️ Upload",
  export_capcut: "📁 Export CapCut",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  started: <Clock className="w-3 h-3 text-blue-400" />,
  running: <Loader2 className="w-3 h-3 text-yellow-400 animate-spin" />,
  success: <CheckCircle2 className="w-3 h-3 text-emerald-400" />,
  error: <AlertCircle className="w-3 h-3 text-red-400" />,
  skipped: <Clock className="w-3 h-3 text-gray-500" />,
};

const STATUS_COLORS: Record<string, string> = {
  started: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  running: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  success: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  error: "bg-red-500/20 text-red-400 border-red-500/30",
  skipped: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

interface GenerationDebugConsoleProps {
  channelId: string;
  generationId?: string | null;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function GenerationDebugConsole({ channelId, generationId }: GenerationDebugConsoleProps) {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [collapsed, setCollapsed] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch initial logs
  useEffect(() => {
    const fetchLogs = async () => {
      let query = supabase
        .from("generation_logs")
        .select("*")
        .eq("channel_id", channelId)
        .order("created_at", { ascending: true })
        .limit(100);

      if (generationId) {
        query = query.eq("generation_id", generationId);
      }

      const { data } = await query;
      if (data) setLogs(data as LogRow[]);
    };

    fetchLogs();

    // Realtime subscription
    const channel = supabase
      .channel(`generation-logs-${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "generation_logs",
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          setLogs((prev) => [...prev, payload.new as LogRow]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, generationId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const errorCount = logs.filter((l) => l.status === "error").length;
  const successCount = logs.filter((l) => l.status === "success").length;

  if (logs.length === 0) return null;

  return (
    <Card className="border-white/10 bg-black/60 overflow-hidden">
      <CardHeader className="py-3 px-4 pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Terminal className="w-4 h-4 text-emerald-400" />
            Debug Console
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">
              {logs.length} logs
            </Badge>
            {errorCount > 0 && (
              <Badge className="text-[10px] px-1.5 py-0 bg-red-500/20 text-red-400 border-red-500/30">
                {errorCount} erro{errorCount > 1 ? "s" : ""}
              </Badge>
            )}
            {successCount > 0 && (
              <Badge className="text-[10px] px-1.5 py-0 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                {successCount} ok
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setCollapsed((v) => !v)}
          >
            {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </CardHeader>

      {!collapsed && (
        <CardContent className="p-0 pt-2">
          <div ref={scrollRef} className="max-h-60 overflow-y-auto px-4 pb-3 space-y-1.5 font-mono text-[11px]">
            {logs.map((log) => (
              <div
                key={log.id}
                className={`flex items-start gap-2 px-2 py-1.5 rounded-md border ${
                  log.status === "error" ? "bg-red-500/5 border-red-500/20" : "bg-white/[0.02] border-white/5"
                }`}
              >
                <span className="mt-0.5 shrink-0">{STATUS_ICONS[log.status]}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white/80">
                      {STEP_LABELS[log.step_name] ?? log.step_name}
                    </span>
                    <Badge className={`text-[9px] px-1 py-0 border ${STATUS_COLORS[log.status]}`}>
                      {log.status}
                    </Badge>
                    <span className="text-white/30 ml-auto text-[10px] shrink-0">
                      {formatTime(log.created_at)}
                    </span>
                  </div>
                  {log.message && <p className="text-white/50 mt-0.5 leading-tight">{log.message}</p>}
                  {log.error_details && (
                    <p className="text-red-400/80 mt-0.5 leading-tight break-all">{log.error_details}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
