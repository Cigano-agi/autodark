import { useNavigate } from "react-router-dom";
import { useContentIdeas } from "@/hooks/useContentIdeas";
import { useHeadAgent } from "@/hooks/useHeadAgent";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import {
  Lightbulb, BrainCircuit, Trash2, Check, X, Play,
} from "lucide-react";

interface IdeasTabProps {
  channelId: string;
}

export function IdeasTab({ channelId }: IdeasTabProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { ideas, updateIdeaStatus, deleteIdea } = useContentIdeas(channelId);
  const { generateStrategy, isLoading: isAiLoading } = useHeadAgent();

  const handleHeadAgent = async () => {
    await generateStrategy(channelId);
    // Refetch ideias após gerar estratégia
    queryClient.invalidateQueries({ queryKey: ['content-ideas', channelId] });
  };

  return (
    <div className="space-y-4">
      {ideas.length === 0 ? (
        <Card className="bg-card/60 border-dashed border-white/10 p-12 text-center">
          <Lightbulb className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">Nenhuma ideia gerada ainda.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              onClick={() => handleHeadAgent()}
              disabled={isAiLoading}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
            >
              <BrainCircuit className="w-4 h-4 mr-2" />
              {isAiLoading ? "Analisando..." : "Head Agent"}
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => handleHeadAgent()}
              disabled={isAiLoading}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white gap-2"
            >
              <BrainCircuit className="w-4 h-4" />
              {isAiLoading ? "Gerando..." : "Gerar Ideias"}
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ideas.map(idea => (
              <Card key={idea.id} className="bg-card/30 backdrop-blur border-white/10 hover:border-primary/30 transition-all">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-2">{idea.title}</h3>
                      {idea.concept && <p className="text-sm text-muted-foreground mb-2">{idea.concept}</p>}
                      {idea.reasoning && <p className="text-xs text-white/40 italic">{idea.reasoning}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {idea.score && (
                        <Badge variant="secondary" className="bg-primary/20 text-primary">
                          {idea.score}/100
                        </Badge>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-white/40 hover:text-red-400 hover:bg-red-500/10 h-8 w-8 p-0"
                        onClick={() => deleteIdea.mutate(idea.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <Badge variant="secondary" className={
                      idea.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                      idea.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }>
                      {idea.status === 'approved' ? 'Aprovada' : idea.status === 'rejected' ? 'Rejeitada' : 'Pendente'}
                    </Badge>
                    {idea.status === 'pending' && (
                      <div className="flex gap-1 ml-auto">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-green-400 hover:text-green-300 hover:bg-green-500/10"
                          onClick={() => updateIdeaStatus.mutate({ ideaId: idea.id, status: 'approved' })}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          onClick={() => updateIdeaStatus.mutate({ ideaId: idea.id, status: 'rejected' })}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                    {idea.status === 'approved' && (
                      <Button
                        size="sm"
                        className="ml-auto h-8 gap-1.5 bg-primary/20 text-primary hover:bg-primary/30 border border-primary/20"
                        onClick={() => navigate(`/channel/${channelId}/production`, {
                          state: {
                            idea: idea.title + (idea.concept ? '\n\n' + idea.concept : ''),
                            ideaId: idea.id,
                          }
                        })}
                      >
                        <Play className="w-3 h-3" /> Produzir
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
