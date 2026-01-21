
import { useParams, useNavigate } from "react-router-dom";
import { BeamsBackground } from "@/components/ui/beams-background";
import { DashboardHeader } from "@/components/ui/dashboard-header";
import { useChannels } from "@/hooks/useChannels";
import { useDemoData } from "@/hooks/useDemoData";
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
  Eye
} from "lucide-react";
import { formatNumber } from "@/lib/mock-data";

export default function ChannelView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { channels } = useChannels();
  const channel = channels?.find(c => c.id === id);
  const { metrics, videos, simulateLiveUpdate } = useDemoData(id);

  if (!channel) return null;

  return (
    <BeamsBackground intensity="medium" className="bg-background">
      <DashboardHeader />

      <main className="pt-28 pb-12 px-6 max-w-7xl mx-auto min-h-screen relative z-10 text-foreground">

        {/* Channel Header */}
        <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-card/30 backdrop-blur-xl mb-8">
          {/* Cover Banner Mockup */}
          <div className="h-48 bg-gradient-to-r from-primary/20 via-purple-500/10 to-blue-500/20 relative">
            <div className="absolute inset-0 bg-grid-white/5" />
          </div>

          <div className="px-8 pb-8">
            <div className="flex flex-col md:flex-row items-start md:items-end gap-6 -mt-12 relative z-10">
              {/* Avatar */}
              <div className={`w-32 h-32 rounded-3xl ${channel.niche_color || 'bg-muted'} border-4 border-background shadow-2xl flex items-center justify-center text-4xl font-bold text-white`}>
                {channel.name.substring(0, 2).toUpperCase()}
              </div>

              <div className="flex-1 space-y-1">
                <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                  {channel.name}
                  <Badge variant="secondary" className="bg-white/10 text-white/70 hover:bg-white/20 border-white/5">
                    {channel.niche}
                  </Badge>
                </h1>
                <p className="text-muted-foreground">
                  Gerenciado por AutoDark • Última atividade há 2 horas
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={simulateLiveUpdate}
                  className="border-white/10 bg-white/5 hover:bg-white/10 text-white gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Simular Live
                </Button>
                <Button
                  onClick={() => navigate('/production', { state: { channelId: id } })}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 gap-2"
                >
                  <Video className="w-4 h-4" />
                  Novo Vídeo
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="dashboard" className="space-y-8">
          <TabsList className="bg-card/30 backdrop-blur border border-white/10 p-1">
            <TabsTrigger value="dashboard" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BarChart3 className="w-4 h-4" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="videos" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Video className="w-4 h-4" /> Vídeos
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Settings className="w-4 h-4" /> Configurações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6 focus-visible:outline-none">
            {/* Big Stats Row */}
            {!metrics ? (
              <div className="h-40 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 animate-spin text-white/20" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-card/30 backdrop-blur border-white/10 overflow-hidden group">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-white/70">
                      Visualizações (30d)
                    </CardTitle>
                    <Eye className="h-4 w-4 text-emerald-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white mb-4">
                      {formatNumber(metrics.dailyViews.reduce((a, b) => a + b.value, 0))}
                    </div>
                    <GrowthGraph data={metrics.dailyViews} color="#10b981" />
                  </CardContent>
                </Card>

                <Card className="bg-card/30 backdrop-blur border-white/10 overflow-hidden group">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-white/70">
                      Novos Inscritos
                    </CardTitle>
                    <Users className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white mb-4">
                      +{formatNumber(metrics.dailySubs.reduce((a, b) => a + b.value, 0))}
                    </div>
                    <GrowthGraph data={metrics.dailySubs} color="#3b82f6" />
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
                      R$ {metrics.dailyRevenue.reduce((a, b) => a + b.value, 0).toLocaleString('pt-BR')}
                    </div>
                    <GrowthGraph data={metrics.dailyRevenue} color="#a855f7" />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Recent Videos Snapshot */}
            <div className="mt-8">
              <h2 className="text-xl font-bold text-white mb-4">Performance Recente</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {videos.slice(0, 3).map(video => (
                  <Card key={video.id} className="bg-card/30 backdrop-blur border-white/10 hover:border-primary/50 transition-all overflow-hidden group cursor-pointer">
                    <div className="aspect-video bg-black/50 relative">
                      <div className="absolute inset-0 flex items-center justify-center text-white/20 group-hover:text-white transition-colors">
                        <Play className="w-12 h-12 fill-current opacity-50" />
                      </div>
                      <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-xs font-mono text-white">
                        12:40
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-white line-clamp-1 mb-1">{video.title}</h3>
                      <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                        <span>{new Date(video.uploadDate).toLocaleDateString()}</span>
                        <span className={video.status === 'published' ? 'text-green-500' : 'text-yellow-500'}>
                          {video.status === 'published' ? 'Publicado' : 'Processando'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-white/5 rounded p-2 text-center">
                          <div className="text-white font-bold">{video.ctr}%</div>
                          <div className="text-muted-foreground">CTR</div>
                        </div>
                        <div className="bg-white/5 rounded p-2 text-center">
                          <div className="text-white font-bold">{video.retention}%</div>
                          <div className="text-muted-foreground">Retenção</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="videos" className="focus-visible:outline-none">
            <Card className="bg-card/20 backdrop-blur border-dashed border-white/10 p-12 text-center">
              <p className="text-muted-foreground">A lista completa de vídeos aparecerá aqui.</p>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="focus-visible:outline-none">
            <Card className="bg-card/20 backdrop-blur border-dashed border-white/10 p-12 text-center">
              <p className="text-muted-foreground">Configurações do canal aparecerão aqui.</p>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </BeamsBackground>
  );
}
