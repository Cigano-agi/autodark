import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2, Circle, Loader2, XCircle, AlertCircle,
  ThumbsUp, ThumbsDown, TrendingUp, Radio, Clapperboard, FileText,
} from "lucide-react";
import {
  useTopics, useUpdateTopicStatus,
  usePipelineScripts, useUpdateScriptStatus,
  useVideoUploads, usePipelineRealtime,
  PIPELINE_STEPS, getStepStatus,
  type Topic, type PipelineScript, type VideoUpload,
} from "@/hooks/usePipeline";

import { cn } from "@/lib/utils";

// ─── Step status icon ─────────────────────────────────────────────────────────

function StepIcon({ status }: { status: "done" | "running" | "pending" | "error" }) {
  if (status === "done")    return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
  if (status === "running") return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
  if (status === "error")   return <XCircle className="w-4 h-4 text-red-500" />;
  return <Circle className="w-4 h-4 text-white/20" />;
}

// ─── Pipeline progress card ───────────────────────────────────────────────────

function PipelineCard({ upload }: { upload: VideoUpload }) {
  const script = upload.pipeline_scripts;
  const topic = script?.topics;

  const doneCount = PIPELINE_STEPS.filter(
    s => getStepStatus(upload, s.key) === "done"
  ).length;
  const progress = Math.round((doneCount / PIPELINE_STEPS.length) * 100);

  const statusColor: Record<string, string> = {
    queued:    "bg-white/10 text-white/60",
    running:   "bg-blue-500/20 text-blue-300",
    completed: "bg-emerald-500/20 text-emerald-300",
    failed:    "bg-red-500/20 text-red-300",
  };

  return (
    <Card className="border-white/10 bg-card/30 backdrop-blur">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-medium text-white leading-snug">
              {upload.title ?? topic?.title ?? "Vídeo sem título"}
            </CardTitle>
            <CardDescription className="mt-1 text-xs text-muted-foreground">
              {topic?.pillar && (
                <span className="capitalize mr-2">{topic.pillar}</span>
              )}
              {topic?.z_score && (
                <span>Z-Score: {topic.z_score.toFixed(2)}</span>
              )}
            </CardDescription>
          </div>
          <Badge className={cn("text-xs shrink-0", statusColor[upload.status ?? "queued"])}>
            {upload.status ?? "queued"}
          </Badge>
        </div>

        {/* Barra de progresso */}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>{doneCount}/{PIPELINE_STEPS.length} etapas</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-1.5">
          {PIPELINE_STEPS.map((step) => {
            const status = getStepStatus(upload, step.key);
            return (
              <div key={step.key} className="flex items-center gap-2.5">
                <StepIcon status={status} />
                <span className={cn(
                  "text-xs",
                  status === "done"    && "text-white/60",
                  status === "running" && "text-blue-300 font-medium",
                  status === "pending" && "text-white/20",
                  status === "error"   && "text-red-400",
                )}>
                  {step.label}
                </span>
                {status === "running" && (
                  <span className="text-xs text-white/20 ml-auto">{step.script}</span>
                )}
              </div>
            );
          })}
        </div>

        {upload.error_message && (
          <div className="mt-3 flex items-start gap-2 p-2 rounded bg-red-500/10 border border-red-500/20">
            <AlertCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
            <p className="text-xs text-red-300 break-all">{upload.error_message}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Topics tab ───────────────────────────────────────────────────────────────

function TopicsTab() {
  const { data: topics = [], isLoading } = useTopics();
  const { mutate: updateStatus, isPending } = useUpdateTopicStatus();

  const pending  = topics.filter(t => t.status === "pending");
  const approved = topics.filter(t => t.status === "approved");
  const rejected = topics.filter(t => t.status === "rejected");

  function TopicRow({ topic }: { topic: Topic }) {
    return (
      <div className="flex items-center gap-3 py-2.5 border-b border-white/10 last:border-0">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white truncate">{topic.title}</p>
          <div className="flex items-center gap-3 mt-0.5">
            {topic.z_score != null && (
              <span className="text-xs text-muted-foreground">
                Z: <span className="text-amber-400 font-mono">{topic.z_score.toFixed(2)}</span>
              </span>
            )}
            {topic.vph != null && (
              <span className="text-xs text-muted-foreground">
                VPH: <span className="text-white/80 font-mono">{Math.round(topic.vph)}</span>
              </span>
            )}
            {topic.pillar && (
              <Badge variant="outline" className="text-xs h-4 px-1 capitalize border-white/10 text-white/60">
                {topic.pillar}
              </Badge>
            )}
          </div>
        </div>

        {topic.status === "pending" && (
          <div className="flex gap-1.5 shrink-0">
            <Button
              size="icon" variant="ghost"
              className="h-7 w-7 text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-400"
              disabled={isPending}
              onClick={() => updateStatus({ id: topic.id, status: "approved" })}
            >
              <ThumbsUp className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="icon" variant="ghost"
              className="h-7 w-7 text-red-500 hover:bg-red-500/10 hover:text-red-400"
              disabled={isPending}
              onClick={() => updateStatus({ id: topic.id, status: "rejected" })}
            >
              <ThumbsDown className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}

        {topic.status !== "pending" && (
          <Badge className={cn(
            "text-xs shrink-0",
            topic.status === "approved" && "bg-emerald-500/20 text-emerald-300",
            topic.status === "rejected" && "bg-red-500/20 text-red-400",
            topic.status === "scripted" && "bg-blue-500/20 text-blue-300",
          )}>
            {topic.status}
          </Badge>
        )}
      </div>
    );
  }

  if (isLoading) return (
    <div className="flex justify-center py-12">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Aguardando revisão ({pending.length})
          </h3>
          <div>{pending.map(t => <TopicRow key={t.id} topic={t} />)}</div>
        </div>
      )}

      {approved.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Aprovados ({approved.length})
          </h3>
          <div>{approved.map(t => <TopicRow key={t.id} topic={t} />)}</div>
        </div>
      )}

      {rejected.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Rejeitados ({rejected.length})
          </h3>
          <div>{rejected.map(t => <TopicRow key={t.id} topic={t} />)}</div>
        </div>
      )}

      {topics.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <TrendingUp className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Nenhum tópico detectado ainda.</p>
          <p className="text-xs mt-1">Rode o <code className="font-mono">intelligence_radar.py</code> para detectar tópicos virais.</p>
        </div>
      )}
    </div>
  );
}

// ─── Scripts tab ──────────────────────────────────────────────────────────────

function ScriptsTab() {
  const { data: scripts = [], isLoading } = usePipelineScripts();
  const { mutate: updateStatus, isPending } = useUpdateScriptStatus();
  const [expanded, setExpanded] = useState<string | null>(null);

  if (isLoading) return (
    <div className="flex justify-center py-12">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    </div>
  );

  if (scripts.length === 0) return (
    <div className="text-center py-16 text-muted-foreground">
      <FileText className="w-8 h-8 mx-auto mb-3 opacity-40" />
      <p className="text-sm">Nenhum roteiro gerado ainda.</p>
      <p className="text-xs mt-1">Aprove um tópico e rode o <code className="font-mono">script_agent.py</code>.</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {scripts.map(script => (
        <Card key={script.id} className="border-white/10 bg-card/30 backdrop-blur">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">
                  {script.topics?.title ?? "Roteiro sem título"}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  {script.score != null && (
                    <span className="text-xs text-muted-foreground">
                      Score: <span className={cn(
                        "font-mono",
                        script.score >= 8 ? "text-emerald-400" : "text-amber-400"
                      )}>{script.score}/10</span>
                    </span>
                  )}
                  {script.model_used && (
                    <span className="text-xs text-white/20 font-mono">{script.model_used}</span>
                  )}
                </div>
              </div>
              <Badge className={cn(
                "text-xs shrink-0",
                script.status === "approved" && "bg-emerald-500/20 text-emerald-300",
                script.status === "rejected" && "bg-red-500/20 text-red-400",
                script.status === "pending"  && "bg-white/10 text-white/80",
              )}>
                {script.status ?? "pending"}
              </Badge>
            </div>

            {script.failed_checks && script.failed_checks.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {script.failed_checks.map(check => (
                  <Badge key={check} variant="outline" className="text-xs border-red-500/30 text-red-400">
                    {check}
                  </Badge>
                ))}
              </div>
            )}
          </CardHeader>

          <CardContent className="pt-0">
            <div className="flex items-center gap-2">
              {script.status === "pending" && (
                <>
                  <Button
                    size="sm" variant="outline"
                    className="h-7 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                    disabled={isPending}
                    onClick={() => updateStatus({ id: script.id, status: "approved" })}
                  >
                    <ThumbsUp className="w-3 h-3 mr-1" /> Aprovar & Iniciar Pipeline
                  </Button>
                  <Button
                    size="sm" variant="ghost"
                    className="h-7 text-xs text-red-500 hover:bg-red-500/10"
                    disabled={isPending}
                    onClick={() => updateStatus({ id: script.id, status: "rejected" })}
                  >
                    Rejeitar
                  </Button>
                </>
              )}
              {script.script_text && (
                <Button
                  size="sm" variant="ghost"
                  className="h-7 text-xs text-muted-foreground ml-auto"
                  onClick={() => setExpanded(expanded === script.id ? null : script.id)}
                >
                  {expanded === script.id ? "Ocultar" : "Ver roteiro"}
                </Button>
              )}
            </div>

            {expanded === script.id && script.script_text && (
              <>
                <Separator className="my-3 bg-white/10" />
                <ScrollArea className="h-64">
                  <pre className="text-xs text-white/60 whitespace-pre-wrap font-mono leading-relaxed">
                    {script.script_text}
                  </pre>
                </ScrollArea>
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Monitor tab ──────────────────────────────────────────────────────────────

function MonitorTab() {
  const { data: uploads = [], isLoading } = useVideoUploads();

  if (isLoading) return (
    <div className="flex justify-center py-12">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    </div>
  );

  if (uploads.length === 0) return (
    <div className="text-center py-16 text-muted-foreground">
      <Clapperboard className="w-8 h-8 mx-auto mb-3 opacity-40" />
      <p className="text-sm">Nenhum vídeo em produção.</p>
      <p className="text-xs mt-1">Aprove um roteiro para iniciar o pipeline.</p>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {uploads.map(upload => (
        <PipelineCard key={upload.id} upload={upload} />
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  usePipelineRealtime();

  return (
    <div className="min-h-screen bg-background">
      <main className="pt-28 pb-12 px-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-blue-400" />
            Pipeline de Produção
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor em tempo real das 11 etapas de produção automática.
          </p>
        </div>

        <Tabs defaultValue="monitor">
          <TabsList className="bg-card/30 backdrop-blur border border-white/10 mb-6">
            <TabsTrigger value="monitor" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Monitor</TabsTrigger>
            <TabsTrigger value="scripts" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Roteiros</TabsTrigger>
            <TabsTrigger value="topics" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Tópicos Virais</TabsTrigger>
          </TabsList>

          <TabsContent value="monitor">
            <MonitorTab />
          </TabsContent>
          <TabsContent value="scripts">
            <ScriptsTab />
          </TabsContent>
          <TabsContent value="topics">
            <TopicsTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
