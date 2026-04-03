import { useState } from "react";
import { useChannels } from "@/hooks/useChannels";
import { useBlueprint } from "@/hooks/useBlueprint";
import { useContentIdeas } from "@/hooks/useContentIdeas";
import { usePipelineOrchestrator } from "@/agents/pipelineOrchestrator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Zap, Loader2, CheckCircle2, AlertCircle, Trash2,
  Clock, Play, Pause,
} from "lucide-react";
import { toast } from "sonner";
import type { GeneratedIdea, VideoLanguage } from "@/agents/types";

interface BatchJob {
  id: string;
  idea: GeneratedIdea;
  status: "pending" | "processing" | "done" | "error";
  progress: number;
  message: string;
}

interface PipelineTabProps {
  channelId: string;
}

export function PipelineTab({ channelId }: PipelineTabProps) {
  const { channels } = useChannels();
  const channel = channels?.find(c => c.id === channelId);
  const { blueprint } = useBlueprint(channelId);
  const { ideas } = useContentIdeas(channelId);
  const channelData = channel ? { id: channel.id, name: channel.name, niche: (channel as Record<string, unknown>).niche as string } : undefined;
  const { state, runSemiAuto } = usePipelineOrchestrator(channelId, channelData, blueprint);

  const [selectedIdeas, setSelectedIdeas] = useState<Set<string>>(new Set());
  const [batchJobs, setBatchJobs] = useState<BatchJob[]>([]);
  const [language, setLanguage] = useState<VideoLanguage>("pt-BR");
  const [duration, setDuration] = useState(15);
  const [isProcessing, setIsProcessing] = useState(false);

  const approvedIdeas = ideas.filter(i => i.status === "approved");

  const toggleIdea = (ideaId: string) => {
    const newSelected = new Set(selectedIdeas);
    if (newSelected.has(ideaId)) newSelected.delete(ideaId);
    else newSelected.add(ideaId);
    setSelectedIdeas(newSelected);
  };

  const handleStartBatch = async () => {
    if (selectedIdeas.size === 0) {
      toast.error("Selecione pelo menos uma ideia");
      return;
    }

    const selectedIdeasList = approvedIdeas.filter(i => selectedIdeas.has(i.id));
    const jobs: BatchJob[] = selectedIdeasList.map(idea => ({
      id: idea.id,
      idea,
      status: "pending",
      progress: 0,
      message: "Aguardando processamento",
    }));

    setBatchJobs(jobs);
    setIsProcessing(true);
    toast.info(`Iniciando produção de ${jobs.length} vídeo(s)...`);

    // Processa vídeos sequencialmente
    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      try {
        setBatchJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: "processing", message: "Processando..." } : j));
        await runSemiAuto(job.idea, language, duration);
        setBatchJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: "done", progress: 100, message: "Concluído!" } : j));
      } catch (error) {
        setBatchJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: "error", message: `Erro: ${(error as Error).message}` } : j));
      }
    }

    setIsProcessing(false);
  };

  const clearBatch = () => {
    setBatchJobs([]);
    setSelectedIdeas(new Set());
  };

  const completedCount = batchJobs.filter(j => j.status === "done").length;
  const errorCount = batchJobs.filter(j => j.status === "error").length;

  return (
    <div className="space-y-6">
      {/* Batch Processor Card */}
      <Card className="bg-card/30 backdrop-blur border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Zap className="w-5 h-5 text-primary" /> Produtor em Lote
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Settings */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Idioma</label>
              <Select value={language} onValueChange={v => setLanguage(v as VideoLanguage)}>
                <SelectTrigger className="h-8 text-xs bg-black/20 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt-BR">Português</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Duração</label>
              <Select value={String(duration)} onValueChange={v => setDuration(Number(v))}>
                <SelectTrigger className="h-8 text-xs bg-black/20 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 min</SelectItem>
                  <SelectItem value="5">5 min</SelectItem>
                  <SelectItem value="8">8 min</SelectItem>
                  <SelectItem value="15">15 min</SelectItem>
                  <SelectItem value="20">20 min</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button
                onClick={handleStartBatch}
                disabled={isProcessing || selectedIdeas.size === 0}
                className="w-full bg-primary gap-2"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Iniciar Lote
              </Button>
            </div>
          </div>

          {/* Ideias Disponíveis */}
          {approvedIdeas.length > 0 && (
            <div className="space-y-2 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase">Ideias Aprovadas ({selectedIdeas.size} selecionadas)</h4>
                {selectedIdeas.size > 0 && (
                  <Button size="sm" variant="ghost" onClick={() => setSelectedIdeas(new Set())} className="h-6 text-xs text-muted-foreground">
                    Desselecionar
                  </Button>
                )}
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {approvedIdeas.map(idea => (
                  <div
                    key={idea.id}
                    className="flex items-center gap-2.5 p-2 bg-black/30 border border-white/10 rounded-lg hover:border-white/20 transition-all cursor-pointer"
                    onClick={() => toggleIdea(idea.id)}
                  >
                    <Checkbox checked={selectedIdeas.has(idea.id)} className="w-4 h-4" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white font-medium truncate">{idea.title}</p>
                      {idea.score && <Badge variant="outline" className="text-[10px] mt-0.5">{idea.score}/100</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fila de Processamento */}
      {batchJobs.length > 0 && (
        <Card className="bg-card/30 backdrop-blur border-white/10">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-white text-base">
                <Clock className="w-4 h-4 text-primary" /> Fila de Produção ({completedCount}/{batchJobs.length})
              </CardTitle>
              {!isProcessing && (
                <Button size="sm" variant="ghost" onClick={clearBatch} className="h-6 gap-1 text-muted-foreground">
                  <Trash2 className="w-3 h-3" /> Limpar
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {batchJobs.map((job) => (
              <div key={job.id} className="p-3 bg-black/30 border border-white/10 rounded-lg space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-white truncate flex-1">{job.idea.title}</p>
                  <Badge variant="outline" className={`text-[10px] ${
                    job.status === "done" ? "border-green-500/30 text-green-400" :
                    job.status === "error" ? "border-red-500/30 text-red-400" :
                    job.status === "processing" ? "border-blue-500/30 text-blue-400" :
                    "border-white/10 text-muted-foreground"
                  }`}>
                    {job.status === "done" ? "✓ Pronto" : job.status === "error" ? "✗ Erro" : job.status === "processing" ? "⟳ Processando" : "⏳ Aguardando"}
                  </Badge>
                </div>
                {job.status === "processing" && (
                  <>
                    <Progress value={job.progress} className="h-1.5" />
                    <p className="text-xs text-muted-foreground">{job.message}</p>
                  </>
                )}
                {job.status === "error" && (
                  <p className="text-xs text-red-400">{job.message}</p>
                )}
                {job.status === "done" && (
                  <p className="text-xs text-green-400">{job.message}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {approvedIdeas.length === 0 && (
        <Card className="bg-card/60 border-dashed border-white/10 p-8 text-center">
          <p className="text-muted-foreground">Nenhuma ideia aprovada. Vá para a aba Ideias para gerar e aprovar.</p>
        </Card>
      )}
    </div>
  );
}
