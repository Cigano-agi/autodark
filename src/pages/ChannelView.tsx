
import { useParams, useNavigate } from "react-router-dom";
import { BeamsBackground } from "@/components/ui/beams-background";
import { DashboardHeader } from "@/components/ui/dashboard-header";
import { useChannels } from "@/hooks/useChannels";
import { useChannelMetrics } from "@/hooks/useChannelMetrics";
import { useContents } from "@/hooks/useContents";
import { useContentIdeas } from "@/hooks/useContentIdeas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { GrowthGraph } from "@/components/ui/growth-graph";
import {
  Users,
  Play,
  DollarSign,
  RefreshCw,
  Video,
  BarChart3,
  Settings,
  Eye,
  BrainCircuit,
  Lightbulb,
  Check,
  X,
  Terminal,
  Wand2
} from "lucide-react";
import { formatNumber } from "@/lib/mock-data";
import { useHeadAgent } from "@/hooks/useHeadAgent";
import { AiStrategyCard } from "@/components/ui/ai-strategy-card";

export default function ChannelView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { channels } = useChannels();
  const channel = channels?.find(c => c.id === id);
  const { data: metricsData, isLoading: metricsLoading } = useChannelMetrics(id);
  const { contents, isLoading: contentsLoading } = useContents(id);
  const { ideas, updateIdeaStatus } = useContentIdeas(id);
  const { generateStrategy, strategy, isLoading: isAiLoading } = useHeadAgent();

  if (!channel) return null;

  const hasMetrics = metricsData && metricsData.dailyViews.length > 0;

  return (
    <BeamsBackground intensity="medium" className="bg-background">
      <DashboardHeader />

      <main className="pt-28 pb-12 px-6 max-w-7xl mx-auto min-h-screen relative z-10 text-foreground">

        {/* Channel Header */}
        <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-card/30 backdrop-blur-xl mb-8">
          {/* Cover Banner */}
          <div className="h-48 bg-gradient-to-r from-primary/20 via-purple-500/10 to-blue-500/20 relative">
            {channel.youtube_banner_url ? (
              <img src={channel.youtube_banner_url} alt="Banner" className="w-full h-full object-cover opacity-60" />
            ) : (
              <div className="absolute inset-0 bg-grid-white/5" />
            )}
          </div>

          <div className="px-8 pb-8">
            <div className="flex flex-col md:flex-row items-start md:items-end gap-6 -mt-12 relative z-10">
              {/* Avatar */}
              {channel.avatar_url ? (
                <img
                  src={channel.avatar_url}
                  alt={channel.name}
                  className="w-32 h-32 rounded-3xl border-4 border-background shadow-2xl object-cover"
                />
              ) : (
                <div className={`w-32 h-32 rounded-3xl ${channel.niche_color || 'bg-muted'} border-4 border-background shadow-2xl flex items-center justify-center text-4xl font-bold text-white`}>
                  {channel.name.substring(0, 2).toUpperCase()}
                </div>
              )}

              <div className="flex-1 space-y-1">
                <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                  {channel.name}
                  <Badge variant="secondary" className="bg-white/10 text-white/70 hover:bg-white/20 border-white/5">
                    {channel.niche}
                  </Badge>

                </h1>
                <p className="text-muted-foreground">
                  {channel.youtube_username ? `@${channel.youtube_username}` : 'Gerenciado por AutoDark'}
                  {channel.last_scraped_at && ` • Última sincronização ${new Date(channel.last_scraped_at).toLocaleDateString('pt-BR')}`}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  onClick={() => navigate(`/channel/${id}/prompts`)}
                  variant="outline"
                  className="bg-black/20 text-white hover:bg-black/40 border-white/10 gap-2"
                >
                  <Terminal className="w-4 h-4" />
                  Prompts
                </Button>
                <Button
                  onClick={() => navigate('/production', { state: { channelId: id } })}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 gap-2"
                >
                  <Video className="w-4 h-4" />
                  Novo Vídeo (Curto)
                </Button>
                <Button
                  onClick={() => navigate(`/channel/${id}/studio`)}
                  className="bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 gap-2"
                >
                  <Wand2 className="w-4 h-4" />
                  Studio (Vídeo Longo)
                </Button>
                <Button
                  onClick={() => id && generateStrategy(id)}
                  disabled={isAiLoading}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/20 gap-2 border border-purple-400/20"
                >
                  <BrainCircuit className={`w-4 h-4 ${isAiLoading ? 'animate-spin' : ''}`} />
                  {isAiLoading ? 'Analisando...' : 'Head Agent'}
                </Button>
              </div>
            </div>

            {/* AI Strategy Result */}
            <div className="mt-8">
              <AiStrategyCard strategy={strategy?.strategy} isLoading={isAiLoading} />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="dashboard" className="space-y-8">
          <TabsList className="bg-card/30 backdrop-blur border border-white/10 p-1">
            <TabsTrigger value="dashboard" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BarChart3 className="w-4 h-4" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="ideas" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Lightbulb className="w-4 h-4" /> Ideias AI ({ideas.length})
            </TabsTrigger>
            <TabsTrigger value="videos" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Video className="w-4 h-4" /> Conteúdos
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Settings className="w-4 h-4" /> Configurações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6 focus-visible:outline-none">
            {metricsLoading ? (
              <div className="h-40 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 animate-spin text-white/20" />
              </div>
            ) : !hasMetrics ? (
              <div className="flex flex-col items-center justify-center py-16 bg-white/5 rounded-3xl border border-white/5 backdrop-blur-sm">
                <BarChart3 className="w-12 h-12 text-white/20 mb-4" />
                <h3 className="text-xl font-medium text-white mb-2">Sem métricas ainda</h3>
                <p className="text-muted-foreground mb-6 text-center max-w-md">
                  Conecte um canal YouTube ou use o scraper para importar dados reais.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-card/30 backdrop-blur border-white/10 overflow-hidden group">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-white/70">
                      Visualizações
                    </CardTitle>
                    <Eye className="h-4 w-4 text-emerald-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white mb-4">
                      {formatNumber(metricsData.totalViews)}
                    </div>
                    <GrowthGraph data={metricsData.dailyViews} color="#10b981" />
                  </CardContent>
                </Card>

                <Card className="bg-card/30 backdrop-blur border-white/10 overflow-hidden group">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-white/70">
                      Inscritos Estimados
                    </CardTitle>
                    <Users className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white mb-4">
                      {formatNumber(channel.subscribers || 0)}
                    </div>
                    <GrowthGraph data={metricsData.dailySubs} color="#3b82f6" />
                  </CardContent>
                </Card>

                <Card className="bg-card/30 backdrop-blur border-white/10 overflow-hidden group">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-white/70">
                      Receita Estimada
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-purple-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white mb-4">
                      R$ {metricsData.totalRevenue.toLocaleString('pt-BR')}
                    </div>
                    <GrowthGraph data={metricsData.dailyRevenue} color="#a855f7" />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Recent Contents */}
            {contents && contents.length > 0 && (
              <div className="mt-8">
                <h2 className="text-xl font-bold text-white mb-4">Conteúdos Recentes</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {contents.slice(0, 6).map(content => (
                    <Card key={content.id} className="bg-card/30 backdrop-blur border-white/10 hover:border-primary/50 transition-all overflow-hidden group cursor-pointer">
                      <div className="aspect-video bg-black/50 relative">
                        <div className="absolute inset-0 flex items-center justify-center text-white/20 group-hover:text-white transition-colors">
                          <Play className="w-12 h-12 fill-current opacity-50" />
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-white line-clamp-1 mb-1">{content.title}</h3>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>{content.scheduled_date ? new Date(content.scheduled_date).toLocaleDateString('pt-BR') : '-'}</span>
                          <span className={content.status === 'published' ? 'text-green-500' : content.status === 'draft' ? 'text-yellow-500' : 'text-blue-500'}>
                            {content.status === 'published' ? 'Publicado' : content.status === 'draft' ? 'Rascunho' : content.status || 'Pendente'}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* AI Ideas Tab */}
          <TabsContent value="ideas" className="focus-visible:outline-none space-y-4">
            {ideas.length === 0 ? (
              <Card className="bg-card/20 backdrop-blur border-dashed border-white/10 p-12 text-center">
                <Lightbulb className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">Nenhuma ideia gerada ainda.</p>
                <Button
                  onClick={() => id && generateStrategy(id)}
                  disabled={isAiLoading}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
                >
                  <BrainCircuit className="w-4 h-4 mr-2" />
                  Gerar Ideias com Head Agent
                </Button>
              </Card>
            ) : (
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
                        {idea.score && (
                          <Badge variant="secondary" className="bg-primary/20 text-primary shrink-0">
                            {idea.score}/100
                          </Badge>
                        )}
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
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="videos" className="focus-visible:outline-none">
            {contentsLoading ? (
              <div className="h-40 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 animate-spin text-white/20" />
              </div>
            ) : contents && contents.length > 0 ? (
              <div className="space-y-3">
                {contents.map(content => (
                  <Card key={content.id} className="bg-card/30 backdrop-blur border-white/10">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-white">{content.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {content.scheduled_date ? new Date(content.scheduled_date).toLocaleDateString('pt-BR') : 'Sem data'}
                        </p>
                      </div>
                      <Badge variant="secondary" className={
                        content.status === 'published' ? 'bg-green-500/20 text-green-400' :
                          content.status === 'draft' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-blue-500/20 text-blue-400'
                      }>
                        {content.status === 'published' ? 'Publicado' : content.status === 'draft' ? 'Rascunho' : content.status || 'Pendente'}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-card/20 backdrop-blur border-dashed border-white/10 p-12 text-center">
                <p className="text-muted-foreground">Nenhum conteúdo ainda. Use o scraper para importar ou crie um novo vídeo.</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="settings" className="focus-visible:outline-none">
            <Card className="bg-card/30 backdrop-blur border-white/10 p-8">
              <h2 className="text-xl font-bold text-white mb-6">Informações do Canal</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-3">
                  <div>
                    <span className="text-muted-foreground">Nome:</span>
                    <span className="text-white ml-2">{channel.name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Nicho:</span>
                    <span className="text-white ml-2">{channel.niche}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Inscritos:</span>
                    <span className="text-white ml-2">{formatNumber(channel.subscribers || 0)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Views Mensais:</span>
                    <span className="text-white ml-2">{formatNumber(channel.monthly_views || 0)}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <span className="text-muted-foreground">YouTube ID:</span>
                    <span className="text-white ml-2">{channel.youtube_channel_id || 'Não conectado'}</span>
                  </div>

                  <div>
                    <span className="text-muted-foreground">Total Vídeos:</span>
                    <span className="text-white ml-2">{channel.youtube_total_videos || 0}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Views:</span>
                    <span className="text-white ml-2">{formatNumber(channel.youtube_total_views || 0)}</span>
                  </div>
                </div>
              </div>
              {channel.youtube_description && (
                <div className="mt-6">
                  <span className="text-muted-foreground text-sm">Descrição:</span>
                  <p className="text-white/80 text-sm mt-1">{channel.youtube_description}</p>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </BeamsBackground >
  );
}
