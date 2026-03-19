import { useState } from "react";
import { ContentPipeline } from "@/components/ContentPipeline";
import { usePipelineOrchestrator } from "@/agents/pipelineOrchestrator";
import { useChannels } from "@/hooks/useChannels";
import { useBlueprint } from "@/hooks/useBlueprint";
import { useContentIdeas } from "@/hooks/useContentIdeas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Zap, Loader2, CheckCircle2, XCircle, RefreshCw,
  Lightbulb, TrendingUp, Play, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { GeneratedIdea, VideoLanguage } from "@/agents/types";

interface PipelineTabProps {
  channelId: string;
}

export function PipelineTab({ channelId }: PipelineTabProps) {
  const { channels } = useChannels();
  const channel = channels?.find(c => c.id === channelId);
  const { blueprint } = useBlueprint(channelId);
  const { ideas, updateIdeaStatus } = useContentIdeas(channelId);

  const channelData = channel ? { id: channel.id, name: channel.name, niche: (channel as Record<string, unknown>).niche as string } : undefined;
  const { state, reset, runIdeas, runSemiAuto } = usePipelineOrchestrator(channelId, channelData, blueprint);

  const [language, setLanguage] = useState<VideoLanguage>("en");
  const [duration, setDuration] = useState(15);

  const pendingIdeas = ideas.filter(i => i.status === "pending" || i.status === "approved");
  const isRunning = state.stage !== "idle" && state.stage !== "done" && state.stage !== "error" && state.stage !== "waiting_approval";

  const handleApproveAndProduce = async (idea: GeneratedIdea) => {
    toast.info(`Iniciando produção: "${idea.title}"`);
    await runSemiAuto(idea, language, duration);
  };

  const stageLabel: Record<string, string> = {
    idle: "Pronto",
    analyzing_trends: "Analisando concorrentes...",
    generating_ideas: "Gerando ideias...",
    waiting_approval: "Aguardando aprovação",
    generating_script: "Escrevendo roteiro...",
    generating_audio: "Gerando narração...",
    extracting_scenes: "Extraindo cenas...",
    generating_visuals: "Gerando imagens...",
    assembling: "Montando vídeo...",
    generating_seo: "Otimizando SEO...",
    saving: "Salvando...",
    done: "Concluído!",
    error: "Erro",
  };

  return (
    <div className="space-y-6">
      {/* Semi-Auto Pipeline Card */}
      <Card className="bg-card/30 backdrop-blur border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-white">
            <span className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" /> Pipeline Semi-Auto
            </span>
            <div className="flex items-center gap-2">
              <Select value={language} onValueChange={v => setLanguage(v as VideoLanguage)}>
                <SelectTrigger className="w-28 h-8 text-xs bg-black/20 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="pt-BR">Português</SelectItem>
                </SelectContent>
              </Select>
              <Select value={String(duration)} onValueChange={v => setDuration(Number(v))}>
                <SelectTrigger className="w-24 h-8 text-xs bg-black/20 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="8">8 min</SelectItem>
                  <SelectItem value="15">15 min</SelectItem>
                  <SelectItem value="20">20 min</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              onClick={() => runIdeas()}
              disabled={isRunning || !channel}
              variant="outline"
              className="gap-2 border-white/10"
            >
              {state.stage === "generating_ideas"
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Lightbulb className="w-4 h-4 text-yellow-500" />}
              Gerar Ideias
            </Button>
            {state.stage === "done" && (
              <Button onClick={reset} variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                <RefreshCw className="w-3.5 h-3.5" /> Novo
              </Button>
            )}
          </div>

          {/* Pipeline progress */}
          {isRunning && (
            <div className="space-y-2 p-4 bg-primary/5 border border-primary/20 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white font-medium flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  {stageLabel[state.stage] || state.stage}
                </span>
                <span className="text-xs text-muted-foreground">{state.progress}%</span>
              </div>
              <Progress value={state.progress} className="h-2" />
              {state.message && (
                <p className="text-xs text-muted-foreground">{state.message}</p>
              )}
            </div>
          )}

          {/* Error state */}
          {state.stage === "error" && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-red-400 font-medium">Erro no pipeline</p>
                <p className="text-xs text-muted-foreground mt-1">{state.message}</p>
                <Button onClick={reset} size="sm" variant="ghost" className="mt-2 text-muted-foreground">
                  <RefreshCw className="w-3 h-3 mr-1" /> Tentar novamente
                </Button>
              </div>
            </div>
          )}

          {/* Done state */}
          {state.stage === "done" && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-green-400 font-medium">{state.message}</p>
                {state.seo && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Título SEO: {state.seo.title}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Generated ideas list */}
          {((state.ideas && state.ideas.length > 0) || pendingIdeas.length > 0) && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-3 h-3" /> Ideias para Produção
              </h4>
              {(state.ideas && state.ideas.length > 0 ? state.ideas : pendingIdeas.map(i => ({
                title: i.title,
                concept: i.concept || "",
                reasoning: i.reasoning || "",
                score: i.score || 0,
                angle: "",
              }))).map((idea, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-black/30 border border-white/10 rounded-lg flex items-start justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{idea.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{idea.concept}</p>
                    {idea.score > 0 && (
                      <Badge
                        variant="outline"
                        className={`mt-1.5 text-[10px] ${idea.score >= 80 ? 'border-green-500/30 text-green-400' : idea.score >= 60 ? 'border-yellow-500/30 text-yellow-400' : 'border-white/10 text-muted-foreground'}`}
                      >
                        Score: {idea.score}
                      </Badge>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleApproveAndProduce(idea)}
                    disabled={isRunning}
                    className="gap-1.5 bg-primary shrink-0"
                  >
                    <Play className="w-3 h-3" /> Produzir
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Existing ContentPipeline below */}
      <ContentPipeline channelId={channelId} />
    </div>
  );
}
