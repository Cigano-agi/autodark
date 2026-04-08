import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2, Circle, Loader2, XCircle, AlertCircle,
  ThumbsUp, ThumbsDown, TrendingUp, Radio, Clapperboard, FileText, Zap, Activity, Cpu, Sparkles, ChevronLeft
} from "lucide-react";
import {
  useTopics, useUpdateTopicStatus,
  usePipelineScripts, useUpdateScriptStatus,
  useVideoUploads, usePipelineRealtime,
  PIPELINE_STEPS, getStepStatus,
  type Topic, type PipelineScript, type VideoUpload,
} from "@/hooks/usePipeline";

import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

// ─── Step status icon ─────────────────────────────────────────────────────────

function StepIcon({ status }: { status: "done" | "running" | "pending" | "error" }) {
  if (status === "done")    return <CheckCircle2 className="w-4 h-4 text-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]" />;
  if (status === "running") return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
  if (status === "error")   return <XCircle className="w-4 h-4 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]" />;
  return <Circle className="w-4 h-4 text-white/10" />;
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
    running:   "bg-primary/20 text-primary animate-pulse",
    completed: "bg-emerald-500/20 text-emerald-300",
    failed:    "bg-red-500/20 text-red-300",
  };

  return (
    <Card className="border-white/5 bg-[#0c0c0e] rounded-[2.5rem] overflow-hidden shadow-2xl transition-all hover:border-primary/20 group">
      <CardHeader className="p-8 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-xl font-black uppercase italic tracking-tighter text-white leading-tight">
              {upload.title ?? topic?.title ?? "Sem título"}
            </CardTitle>
            <div className="flex items-center gap-3">
              {topic?.pillar && (
                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-white/10 text-white/40">
                  Categoria: {topic.pillar}
                </Badge>
              )}
              {topic?.z_score && (
                <span className="text-[9px] font-black text-primary uppercase tracking-widest">Viral Z: {topic.z_score.toFixed(2)}</span>
              )}
            </div>
          </div>
          <Badge className={cn("text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg shrink-0", statusColor[upload.status ?? "queued"])}>
            {upload.status ?? "queued"}
          </Badge>
        </div>

        {/* Tactical Progress */}
        <div className="mt-8 space-y-3">
          <div className="flex justify-between items-end">
            <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">{doneCount}/{PIPELINE_STEPS.length} ETAPAS CONCLUÍDAS</span>
            <span className="text-xl font-black text-white italic tracking-tighter">{progress}%</span>
          </div>
          <div className="h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5 p-0.5">
            <div
              className="h-full bg-primary rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(var(--primary),0.5)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-8 pt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 p-6 bg-black/40 border border-white/5 rounded-[2rem]">
          {PIPELINE_STEPS.map((step) => {
            const status = getStepStatus(upload, step.key);
            return (
              <div key={step.key} className="flex items-center gap-3">
                <StepIcon status={status} />
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-widest",
                  status === "done"    && "text-white/40",
                  status === "running" && "text-primary",
                  status === "pending" && "text-white/10",
                  status === "error"   && "text-red-400",
                )}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {upload.error_message && (
          <div className="mt-6 flex items-start gap-4 p-5 rounded-2xl bg-red-500/5 border border-red-500/10 animate-in shake-1 duration-500">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
            <p className="text-xs font-bold text-red-300/80 leading-relaxed uppercase tracking-tight">{upload.error_message}</p>
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
      <div className="flex items-center gap-6 py-4 border-b border-white/5 last:border-0 group transition-all hover:bg-white/[0.02] px-4 rounded-xl">
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-sm font-bold text-white uppercase tracking-tight group-hover:text-primary transition-colors">{topic.title}</p>
          <div className="flex items-center gap-4">
            {topic.z_score != null && (
              <span className="text-[10px] font-black text-primary/60 uppercase tracking-widest">
                Z-SCORE: <span className="text-white font-mono">{topic.z_score.toFixed(2)}</span>
              </span>
            )}
            {topic.pillar && (
              <Badge variant="outline" className="text-[8px] font-black px-2 py-0 h-4 uppercase tracking-[0.2em] border-white/10 text-white/30">
                {topic.pillar}
              </Badge>
            )}
          </div>
        </div>

        {topic.status === "pending" && (
          <div className="flex gap-2 shrink-0">
            <Button
              size="icon" variant="outline"
              className="h-10 w-10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10 rounded-xl"
              disabled={isPending}
              onClick={() => updateStatus({ id: topic.id, status: "approved" })}
            >
              <ThumbsUp className="w-4 h-4" />
            </Button>
            <Button
              size="icon" variant="outline"
              className="h-10 w-10 border-red-500/20 text-red-500 hover:bg-red-500/10 rounded-xl"
              disabled={isPending}
              onClick={() => updateStatus({ id: topic.id, status: "rejected" })}
            >
              <ThumbsDown className="w-4 h-4" />
            </Button>
          </div>
        )}

        {topic.status !== "pending" && (
          <Badge className={cn(
            "text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg shrink-0",
            topic.status === "approved" && "bg-emerald-500/20 text-emerald-300",
            topic.status === "rejected" && "bg-red-500/20 text-red-400",
            topic.status === "scripted" && "bg-primary/20 text-primary",
          )}>
            {topic.status}
          </Badge>
        )}
      </div>
    );
  }

  if (isLoading) return (
    <div className="grid grid-cols-1 gap-4">
      {[1,2,3].map(i => <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" />)}
    </div>
  );

  return (
    <div className="space-y-12">
      {pending.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> Aguardando revisão ({pending.length})
          </h3>
          <div className="bg-white/[0.03] border border-white/5 rounded-[2rem] overflow-hidden">{pending.map(t => <TopicRow key={t.id} topic={t} />)}</div>
        </div>
      )}

      {approved.length > 0 && (
        <div className="space-y-4 opacity-60 grayscale hover:opacity-100 hover:grayscale-0 transition-all">
          <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] ml-4">Aprovados ({approved.length})</h3>
          <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] overflow-hidden">{approved.map(t => <TopicRow key={t.id} topic={t} />)}</div>
        </div>
      )}

      {topics.length === 0 && (
        <div className="flex flex-col items-center justify-center py-32 bg-white/5 rounded-[3rem] border border-white/5 text-center px-10">
          <TrendingUp className="w-12 h-12 text-white/10 mb-6" />
          <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Nenhum tópico ainda</h3>
          <p className="text-sm text-white/30 font-medium max-w-xs mt-2">Nenhum tópico detectado. Use o buscador de tendências para encontrar temas virais.</p>
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
    <div className="grid grid-cols-1 gap-4">
      {[1,2,3].map(i => <div key={i} className="h-40 bg-white/5 rounded-[2.5rem] animate-pulse" />)}
    </div>
  );

  if (scripts.length === 0) return (
    <div className="flex flex-col items-center justify-center py-32 bg-white/5 rounded-[3rem] border border-white/5 text-center px-10">
      <FileText className="w-12 h-12 text-white/10 mb-6" />
      <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Nenhum roteiro ainda</h3>
      <p className="text-sm text-white/30 font-medium max-w-xs mt-2">Nenhum roteiro gerado. Aprove um tópico para iniciar a produção.</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {scripts.map(script => (
        <Card key={script.id} className="border-white/5 bg-[#0c0c0e] rounded-[2.5rem] overflow-hidden shadow-2xl transition-all hover:border-primary/20">
          <CardHeader className="p-8 pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <p className="text-xl font-black text-white uppercase italic tracking-tighter truncate">
                  {script.topics?.title ?? "Untitled Script"}
                </p>
                <div className="flex items-center gap-4">
                  {script.score != null && (
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                      Retention Score: <span className={cn(
                        "font-mono italic",
                        script.score >= 8 ? "text-emerald-400" : "text-amber-400"
                      )}>{script.score}/10</span>
                    </span>
                  )}
                  {script.model_used && (
                    <span className="text-[9px] text-white/20 font-black uppercase tracking-widest">Model: {script.model_used}</span>
                  )}
                </div>
              </div>
              <Badge className={cn(
                "text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg shrink-0",
                script.status === "approved" && "bg-emerald-500/20 text-emerald-300",
                script.status === "rejected" && "bg-red-500/20 text-red-400",
                script.status === "pending"  && "bg-primary/20 text-primary animate-pulse",
              )}>
                {script.status ?? "pending"}
              </Badge>
            </div>

            {script.failed_checks && script.failed_checks.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {script.failed_checks.map(check => (
                  <Badge key={check} variant="outline" className="text-[8px] font-black uppercase tracking-widest border-red-500/30 text-red-400 bg-red-500/5">
                    Problema: {check}
                  </Badge>
                ))}
              </div>
            )}
          </CardHeader>

          <CardContent className="p-8 pt-0">
            <div className="flex items-center gap-4">
              {script.status === "pending" && (
                <>
                  <Button
                    size="sm"
                    className="h-12 rounded-xl bg-primary hover:bg-orange-600 text-white font-black uppercase italic tracking-tighter px-6 border-0 shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
                    disabled={isPending}
                    onClick={() => updateStatus({ id: script.id, status: "approved" })}
                  >
                    <ThumbsUp className="w-4 h-4 mr-2" /> Aprovar
                  </Button>
                  <Button
                    size="sm" variant="outline"
                    className="h-12 rounded-xl border-white/5 text-white/40 hover:bg-white/5 hover:text-white font-black uppercase tracking-widest text-[10px] px-6"
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
                  className="h-10 rounded-xl text-white/20 hover:text-primary hover:bg-primary/5 font-black uppercase tracking-widest text-[9px] ml-auto"
                  onClick={() => setExpanded(expanded === script.id ? null : script.id)}
                >
                  {expanded === script.id ? "Fechar" : "Ver roteiro"}
                </Button>
              )}
            </div>

            {expanded === script.id && script.script_text && (
              <div className="mt-6 animate-in zoom-in-95 duration-300">
                <Separator className="mb-6 bg-white/5" />
                <ScrollArea className="h-80 bg-black/40 rounded-[2rem] border border-white/5 p-8">
                  <pre className="text-xs text-white/60 whitespace-pre-wrap font-mono leading-relaxed italic">
                    {script.script_text}
                  </pre>
                </ScrollArea>
              </div>
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {[1,2,3,4].map(i => <div key={i} className="h-64 bg-white/5 rounded-[3rem] animate-pulse" />)}
    </div>
  );

  if (uploads.length === 0) return (
    <div className="flex flex-col items-center justify-center py-40 bg-white/[0.02] rounded-[4rem] border border-white/5 backdrop-blur-md text-center px-10">
      <Clapperboard className="w-12 h-12 text-white/10 mb-6" />
      <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter">Nenhuma produção ativa</h3>
      <p className="text-sm text-white/20 font-black uppercase tracking-[0.3em] mt-2 max-w-xs leading-relaxed">Nenhum vídeo em produção. Aprove um tópico para começar.</p>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      {uploads.map(upload => (
        <PipelineCard key={upload.id} upload={upload} />
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const navigate = useNavigate();
  usePipelineRealtime();

  return (
    <div className="pt-32 pb-20 px-6 md:px-12 w-full min-h-screen">
      <div className="max-w-7xl mx-auto space-y-12 animate-fade-in">
        
        {/* Tactical Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-primary font-black uppercase tracking-[0.4em] text-[10px] ml-1">
              <Activity className="w-3 h-3" /> Ao Vivo · Processando
            </div>
            <h1 className="text-6xl md:text-7xl font-black tracking-tighter text-white uppercase italic leading-[0.9]">
              Production <span className="text-primary">Pipeline</span>
            </h1>
            <p className="text-xl text-white/30 font-bold max-w-3xl leading-relaxed italic">
              Acompanhe a produção dos seus canais em tempo real.
            </p>
          </div>
        </div>

        <Tabs defaultValue="monitor" className="space-y-10">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <TabsList className="bg-transparent h-auto p-0 gap-10">
              {[
                { value: "monitor", label: "Monitor ao Vivo", icon: Radio },
                { value: "scripts", label: "Roteiros", icon: FileText },
                { value: "topics", label: "Tópicos", icon: TrendingUp },
              ].map((t) => (
                <TabsTrigger 
                  key={t.value}
                  value={t.value} 
                  className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 pb-4 h-auto gap-2.5 text-[11px] font-black uppercase tracking-[0.25em] text-white/20 hover:text-white transition-all relative group"
                >
                  <t.icon className="w-4 h-4 group-data-[state=active]:scale-110 transition-transform" />
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="monitor" className="focus-visible:outline-none">
            <MonitorTab />
          </TabsContent>
          <TabsContent value="scripts" className="focus-visible:outline-none">
            <ScriptsTab />
          </TabsContent>
          <TabsContent value="topics" className="focus-visible:outline-none">
            <TopicsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
