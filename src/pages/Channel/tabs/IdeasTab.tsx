import { useNavigate } from "react-router-dom";
import { useContentIdeas } from "@/hooks/useContentIdeas";
import { useContentPipeline } from "@/hooks/useContentPipeline";
import { useHeadAgent } from "@/hooks/useHeadAgent";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SkeletonList } from "@/components/ui/skeleton-card";
import {
  Lightbulb, BrainCircuit, Sparkles, Loader2, Trash2, Check, X, Play,
  ChevronDown, ChevronUp, Clock, CheckCircle2, XCircle,
} from "lucide-react";
import { useState } from "react";

interface IdeasTabProps {
  channelId: string;
}

export function IdeasTab({ channelId }: IdeasTabProps) {
  const navigate = useNavigate();
  const { ideas, isLoading, updateIdeaStatus, deleteIdea } = useContentIdeas(channelId);
  const pipeline = useContentPipeline(channelId);
  const { generateStrategy, isLoading: isAiLoading } = useHeadAgent();
  const [showRejected, setShowRejected] = useState(false);

  if (isLoading) {
    return <SkeletonList count={4} />;
  }

  const pendingIdeas = ideas.filter(i => i.status === 'pending');
  const approvedIdeas = ideas.filter(i => i.status === 'approved');
  const rejectedIdeas = ideas.filter(i => i.status === 'rejected');

  const renderIdeaCard = (idea: any) => (
    <Card key={idea.id} className="bg-card/30 backdrop-blur border-white/10 hover:border-primary/30 transition-all group">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-white mb-2 line-clamp-2">{idea.title}</h3>
            {idea.concept && <p className="text-sm text-muted-foreground mb-3 line-clamp-3">{idea.concept}</p>}
            {idea.reasoning && (
              <div className="flex items-start gap-2 p-2 bg-white/5 rounded-lg border border-white/5">
                <BrainCircuit className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                <p className="text-[10px] text-white/40 italic leading-tight">{idea.reasoning}</p>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            {idea.score && (
              <Badge variant="secondary" className="bg-primary/20 text-primary font-bold">
                {idea.score}/100
              </Badge>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="text-white/20 hover:text-red-400 hover:bg-red-500/10 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => deleteIdea.mutate(idea.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-2 mt-6">
          {idea.status === 'pending' && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-9 border-green-500/20 text-green-400 hover:bg-green-500/10 hover:text-green-300"
                onClick={() => updateIdeaStatus.mutate({ ideaId: idea.id, status: 'approved' })}
              >
                <Check className="w-4 h-4 mr-2" /> Aprovar
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-9 border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                onClick={() => updateIdeaStatus.mutate({ ideaId: idea.id, status: 'rejected' })}
              >
                <X className="w-4 h-4 mr-2" /> Rejeitar
              </Button>
            </>
          )}
          
          {idea.status === 'approved' && (
            <Button
              size="sm"
              className="w-full h-9 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
              onClick={() => navigate(`/channel/${channelId}/production`, { state: { idea: idea.title } })}
            >
              <Play className="w-4 h-4 fill-current" /> Começar Produção
            </Button>
          )}

          {idea.status === 'rejected' && (
            <Button
              size="sm"
              variant="ghost"
              className="w-full h-9 text-muted-foreground hover:text-white"
              onClick={() => updateIdeaStatus.mutate({ ideaId: idea.id, status: 'pending' })}
            >
              Restaurar para Pendente
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-10">
      {/* Actions Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-col">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" /> Banco de Ideias
          </h2>
          <p className="text-sm text-muted-foreground">Valide as sugestões da IA ou gere novas tendências.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            onClick={() => generateStrategy(channelId)}
            disabled={isAiLoading}
            variant="outline"
            className="flex-1 sm:flex-none border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
          >
            <BrainCircuit className="w-4 h-4 mr-2" /> Análise Estratégica
          </Button>
          <Button
            onClick={() => pipeline.generateIdeas()}
            disabled={pipeline.generatingIdeas || !channelId}
            className="flex-1 sm:flex-none bg-primary text-primary-foreground gap-2 shadow-xl shadow-primary/20"
          >
            {pipeline.generatingIdeas ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {pipeline.generatingIdeas ? "Pesquisando..." : "Gerar Novas Ideias"}
          </Button>
        </div>
      </div>

      {ideas.length === 0 ? (
        <Card className="bg-card/30 border-dashed border-white/10 p-20 text-center rounded-3xl">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lightbulb className="w-10 h-10 text-white/20" />
          </div>
          <h3 className="text-xl font-medium text-white mb-2">O banco está vazio</h3>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Use a Análise Estratégica para analisar seu nicho ou peça para a IA gerar um lote de ideias baseadas em tendências.
          </p>
        </Card>
      ) : (
        <div className="space-y-12">
          {/* Section: Pending */}
          {pendingIdeas.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-yellow-500">
                <Clock className="w-4 h-4" />
                <h3 className="text-sm font-bold uppercase tracking-widest">Aguardando Avaliação ({pendingIdeas.length})</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pendingIdeas.map(renderIdeaCard)}
              </div>
            </div>
          )}

          {/* Section: Approved */}
          {approvedIdeas.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle2 className="w-4 h-4" />
                <h3 className="text-sm font-bold uppercase tracking-widest">Prontas para Produção ({approvedIdeas.length})</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {approvedIdeas.map(renderIdeaCard)}
              </div>
            </div>
          )}

          {/* Section: Rejected */}
          {rejectedIdeas.length > 0 && (
            <div className="space-y-4 border-t border-white/5 pt-8">
              <button 
                onClick={() => setShowRejected(!showRejected)}
                className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors"
              >
                {showRejected ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  Ideias Descartadas ({rejectedIdeas.length})
                </h3>
              </button>
              {showRejected && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
                  {rejectedIdeas.map(renderIdeaCard)}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

