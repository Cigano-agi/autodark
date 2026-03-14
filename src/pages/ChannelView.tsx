import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BeamsBackground } from "@/components/ui/beams-background";
import { DashboardHeader } from "@/components/ui/dashboard-header";
import { useChannels } from "@/hooks/useChannels";
import { useChannelMetrics } from "@/hooks/useChannelMetrics";
import { useContents } from "@/hooks/useContents";
import { useContentIdeas } from "@/hooks/useContentIdeas";
import { useContentPipeline } from "@/hooks/useContentPipeline";
import { useYouTubeMetrics } from "@/hooks/useYouTubeMetrics";
import { ConnectYouTubeModal } from "@/components/YouTube/ConnectYouTubeModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CompetitorMonitor } from "@/components/Strategy/CompetitorMonitor";
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
  Wand2,
  Zap,
  Youtube,
  Calendar,
  Trash2,
  Loader2,
  Sparkles
} from "lucide-react";
import { formatNumber } from "@/lib/mock-data";
import { useHeadAgent } from "@/hooks/useHeadAgent";
import { AiStrategyCard } from "@/components/ui/ai-strategy-card";

export default function ChannelView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { channels } = useChannels();
  const channel = channels?.find(c => c.id === id);
  const [period, setPeriod] = useState<'7d' | '30d' | 'all'>('all');
  const { data: metricsData, isLoading: metricsLoading } = useChannelMetrics(id, period);
  const { contents, isLoading: contentsLoading } = useContents(id);
  const { ideas, updateIdeaStatus, deleteIdea } = useContentIdeas(id);
  const pipeline = useContentPipeline(id);
  const { generateStrategy, strategy, isLoading: isAiLoading } = useHeadAgent();
  const { connectWithApify, syncMetrics } = useYouTubeMetrics();

  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);

  // Auto-sync logic
  useEffect(() => {
    if (channel?.youtube_channel_id) {
      const now = new Date();
      const lastScraped = (channel as any).last_scraped_at ? new Date((channel as any).last_scraped_at) : new Date(0);
      const hoursSinceLastScrape = (now.getTime() - lastScraped.getTime()) / (1000 * 60 * 60);

      // Auto-sync if more than 24 hours have passed
      if (hoursSinceLastScrape > 24 && !syncMetrics.isPending) {
        syncMetrics.mutate({
          channelId: channel.id,
          youtubeUrl: channel.youtube_username ? `https://youtube.com/@${channel.youtube_username}` : ''
        });
      }
    }
  }, [channel?.id, channel?.last_scraped_at]);

  if (!channel) return null;

  const hasMetrics = metricsData && (metricsData.dailyViews.length > 0 || channel.last_scraped_at);

  return (
    <BeamsBackground intensity="medium" className="bg-background">
      <DashboardHeader />

      <ConnectYouTubeModal
        open={isConnectModalOpen}
        onOpenChange={setIsConnectModalOpen}
        onConnect={async (url) => { await connectWithApify.mutateAsync({ channelId: channel.id, youtubeUrl: url }); }}
        isConnecting={connectWithApify.isPending}
      />

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
                  {channel.last_scraped_at && ` • Última sincronização ${new Date(channel.last_scraped_at).toLocaleDateString('pt-BR')} às ${new Date(channel.last_scraped_at).toLocaleTimeString('pt-BR')}`}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {!channel.youtube_channel_id ? (
                  <Button
                    onClick={() => setIsConnectModalOpen(true)}
                    className="bg-red-500 hover:bg-red-600 text-white gap-2"
                  >
                    <Youtube className="w-4 h-4" />
                    Conectar YouTube
                  </Button>
                ) : (
                  <Button
                    onClick={() => syncMetrics.mutate({ channelId: channel.id, youtubeUrl: channel.youtube_username ? `https://youtube.com/@${channel.youtube_username}` : '' })}
                    variant="outline"
                    disabled={syncMetrics.isPending}
                    className="bg-black/20 text-white hover:bg-black/40 border-white/10 gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${syncMetrics.isPending ? 'animate-spin' : ''}`} />
                    Sincronizar
                  </Button>
                )}

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
            <TabsTrigger value="competitors" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="w-4 h-4" /> Concorrentes
            </TabsTrigger>
            <button
              onClick={() => navigate(`/channel/${id}/prompts`)}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 gap-2 text-muted-foreground hover:text-white"
            >
              <Terminal className="w-4 h-4" /> Prompts
            </button>
            <TabsTrigger value="settings" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Settings className="w-4 h-4" /> Configurações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6 focus-visible:outline-none">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" /> Visão Geral
              </h2>
              <div className="flex bg-card/50 backdrop-blur-sm border border-white/10 p-1 rounded-xl">
                <Button
                  size="sm"
                  variant={period === '7d' ? 'default' : 'ghost'}
                  onClick={() => setPeriod('7d')}
                  className="h-8 px-3 text-xs"
                >
                  7 dias
                </Button>
                <Button
                  size="sm"
                  variant={period === '30d' ? 'default' : 'ghost'}
                  onClick={() => setPeriod('30d')}
                  className="h-8 px-3 text-xs"
                >
                  30 dias
                </Button>
                <Button
                  size="sm"
                  variant={period === 'all' ? 'default' : 'ghost'}
                  onClick={() => setPeriod('all')}
                  className="h-8 px-3 text-xs"
                >
                  Tudo
                </Button>
              </div>
            </div>
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
                      {formatNumber(metricsData.channelMonthlyViews)}
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
                      {formatNumber(metricsData.channelTotalSubscribers)}
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
                      R$ {metricsData.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <GrowthGraph data={metricsData.dailyRevenue} color="#a855f7" />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Top Performing Videos */}
            {metricsData && metricsData.topVideos && metricsData.topVideos.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-500" /> Melhores Performances
                  </h3>
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider text-muted-foreground border-white/5">
                    Top 5 Vídeos
                  </Badge>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {metricsData.topVideos.map((video, index) => (
                    <Card
                      key={video.id + index}
                      className="bg-card/20 backdrop-blur-sm border-white/5 hover:border-primary/30 transition-all group cursor-pointer"
                      onClick={() => video.video_url && window.open(video.video_url, '_blank')}
                    >
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0 text-sm">
                          {index + 1}
                        </div>
                        <div className="w-20 aspect-video rounded-lg overflow-hidden shrink-0 bg-black/40 relative">
                          {video.video_thumbnail ? (
                            <img src={video.video_thumbnail} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Play className="w-4 h-4 text-white/20" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors flex items-center justify-center">
                            <Play className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-white line-clamp-1 group-hover:text-primary transition-colors text-sm sm:text-base">
                            {video.video_title || 'Vídeo Importado'}
                          </h4>
                          <div className="flex items-center gap-3 mt-1">
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {video.last_video_date && <span>{new Date(video.last_video_date).toLocaleDateString('pt-BR')}</span>}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Eye className="w-3 h-3 text-emerald-500" />
                              {formatNumber(video.views || 0)} views
                            </p>
                          </div>
                        </div>
                        <div className="text-right hidden sm:block">
                          <p className="text-sm font-bold text-emerald-400">
                            + R$ {((video.estimated_revenue || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Receita Estimada</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
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
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Button
                    onClick={() => id && generateStrategy(id)}
                    disabled={isAiLoading}
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
                  >
                    <BrainCircuit className="w-4 h-4 mr-2" />
                    Gerar Ideias com Head Agent
                  </Button>
                  <Button
                    onClick={() => pipeline.generateIdeas()}
                    disabled={pipeline.generatingIdeas || !id}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 gap-2"
                  >
                    {pipeline.generatingIdeas ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    {pipeline.generatingIdeas ? "Gerando Batch..." : "Gerar Batch de Ideias"}
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button
                    onClick={() => pipeline.generateIdeas()}
                    disabled={pipeline.generatingIdeas || !id}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 gap-2"
                  >
                    {pipeline.generatingIdeas ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    {pipeline.generatingIdeas ? "Gerando Batch..." : "Gerar Batch de Ideias"}
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
                              onClick={() => {
                                if (window.confirm("Certeza que deseja excluir esta ideia?")) {
                                  deleteIdea.mutate(idea.id);
                                }
                              }}
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
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="videos" className="focus-visible:outline-none space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Video className="w-5 h-5 text-primary" /> Conteúdos Produzidos
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate('/production', { state: { channelId: id } })}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors border border-primary/20"
                >
                  <Video className="w-3.5 h-3.5" /> Novo Vídeo Curto
                </button>
                <button
                  onClick={() => navigate(`/channel/${id}/studio`)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors border border-emerald-500/20"
                >
                  <Wand2 className="w-3.5 h-3.5" /> Studio Longo
                </button>
              </div>
            </div>

            {contentsLoading ? (
              <div className="h-40 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 animate-spin text-white/20" />
              </div>
            ) : contents && contents.length > 0 ? (
              <div className="space-y-3">
                {contents.map(content => {
                  // Determine type based on fields set by each production flow
                  const isShortVideo = !!content.audio_path || !!content.hook;
                  const isStudio = !!content.script && !content.audio_path;
                  const typeLabel = isShortVideo ? '🎙️ Vídeo Curto' : isStudio ? '📝 Estúdio' : '📁 Conteúdo';
                  const typeBg = isShortVideo
                    ? 'bg-primary/20 text-primary border-primary/20'
                    : isStudio
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                    : 'bg-white/10 text-white/50 border-white/10';

                  return (
                    <Card key={content.id} className="bg-card/30 backdrop-blur border-white/10 hover:border-white/20 transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Badge className={`text-[10px] border ${typeBg}`}>{typeLabel}</Badge>
                              <Badge variant="secondary" className={
                                content.status === 'published' ? 'bg-green-500/20 text-green-400' :
                                content.status === 'draft' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-blue-500/20 text-blue-400'
                              }>
                                {content.status === 'published' ? 'Publicado' : content.status === 'draft' ? 'Rascunho' : content.status || 'Pendente'}
                              </Badge>
                            </div>
                            <h3 className="font-medium text-white text-sm leading-tight">{content.title}</h3>
                            {content.topic && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">📌 {content.topic}</p>
                            )}
                            <div className="flex items-center gap-3 mt-2 text-[11px] text-white/30">
                              {content.audio_path && <span className="flex items-center gap-1 text-purple-400/70">🎵 Áudio gerado</span>}
                              {content.script && <span className="flex items-center gap-1">📄 {Math.round(content.script.length / 5)} palavras</span>}
                              {content.audio_duration && <span>⏱ {Math.round(content.audio_duration)}s</span>}
                              <span className="ml-auto">{new Date(content.created_at).toLocaleDateString('pt-BR')}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="bg-card/20 backdrop-blur border-dashed border-white/10 p-12 text-center">
                <Video className="w-10 h-10 text-white/10 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm mb-4">Nenhum conteúdo ainda.</p>
                <p className="text-xs text-white/30">Use <strong className="text-primary">Novo Vídeo (Curto)</strong> ou <strong className="text-emerald-400">Studio (Vídeo Longo)</strong> para criar conteúdo.</p>
              </Card>
            )}
          </TabsContent>


          <TabsContent value="competitors" className="space-y-6 focus-visible:outline-none">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" /> Concorrentes
              </h2>
            </div>
            {id && <CompetitorMonitor channelId={id} />}
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
