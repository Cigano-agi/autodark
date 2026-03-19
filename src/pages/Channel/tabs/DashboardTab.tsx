import { useState } from "react";
import { useChannelMetrics } from "@/hooks/useChannelMetrics";
import { useContents } from "@/hooks/useContents";
import type { Channel } from "@/hooks/useChannels";
import { GrowthGraph } from "@/components/ui/growth-graph";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users, Eye, DollarSign, Zap, Calendar, Play, RefreshCw, BarChart3, Video,
} from "lucide-react";
import { formatNumber } from "@/lib/mock-data";

interface DashboardTabProps {
  channelId: string;
  channel: Channel;
}

export function DashboardTab({ channelId, channel }: DashboardTabProps) {
  const [period, setPeriod] = useState<'7d' | '30d' | 'all'>('all');
  const { data: metricsData, isLoading: metricsLoading } = useChannelMetrics(channelId, period);
  const { contents } = useContents(channelId);

  const rawChannel = channel as any;
  const hasMetrics = metricsData && (metricsData.dailyViews.length > 0 || rawChannel.last_scraped_at);
  const totalContents = contents?.length || 0;
  const doneContents = contents?.filter(c => c.status === 'tts_done' || c.status === 'published').length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" /> Visão Geral
        </h2>
        <div className="flex bg-card/50 backdrop-blur-sm border border-white/10 p-1 rounded-xl">
          {(['7d', '30d', 'all'] as const).map((p) => (
            <Button
              key={p}
              size="sm"
              variant={period === p ? 'default' : 'ghost'}
              onClick={() => setPeriod(p)}
              className="h-8 px-3 text-xs"
            >
              {p === '7d' ? '7 dias' : p === '30d' ? '30 dias' : 'Tudo'}
            </Button>
          ))}
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
          <Card className="bg-card/80 border-white/10 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/70">Visualizações</CardTitle>
              <Eye className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white mb-4">
                {formatNumber(metricsData.channelMonthlyViews)}
              </div>
              <GrowthGraph data={metricsData.dailyViews} color="#10b981" />
            </CardContent>
          </Card>

          <Card className="bg-card/80 border-white/10 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/70">Inscritos Estimados</CardTitle>
              <Users className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white mb-4">
                {formatNumber(metricsData.channelTotalSubscribers)}
              </div>
              <GrowthGraph data={metricsData.dailySubs} color="#3b82f6" />
            </CardContent>
          </Card>

          <Card className="bg-card/80 border-white/10 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/70">Receita Estimada</CardTitle>
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

      {metricsData?.topVideos && metricsData.topVideos.length > 0 && (
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
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-white line-clamp-1 text-sm sm:text-base">
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
                      R$ {(video.estimated_revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Receita Est.</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

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
                    <span className={
                      content.status === 'published' ? 'text-green-500' :
                      content.status === 'draft' ? 'text-yellow-500' : 'text-blue-500'
                    }>
                      {content.status === 'published' ? 'Publicado' : content.status === 'draft' ? 'Rascunho' : content.status || 'Pendente'}
                    </span>
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
