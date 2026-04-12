import { useState } from "react";
import { ContentStatusBadge } from "@/components/ContentStatusBadge";
import { useChannelMetrics } from "@/hooks/useChannelMetrics";
import { useContents } from "@/hooks/useContents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users, Eye, DollarSign, Zap, Calendar, Play, RefreshCw, BarChart3, Video, TrendingUp, Activity, ArrowUpRight
} from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Channel } from "@/hooks/useChannels";

interface DashboardTabProps {
  channelId: string;
  channel: Channel;
}

export function DashboardTab({ channelId, channel }: DashboardTabProps) {
  const [period, setPeriod] = useState<'7d' | '30d' | 'all'>('all');
  const { data: metrics, isLoading } = useChannelMetrics(channelId, period);
  const { contents } = useContents(channelId);

  const recentContents = contents?.slice(0, 5) || [];

  return (
    <div className="space-y-10">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Total Subscribers" 
          value={formatNumber(channel.subscribers || 0)} 
          icon={Users} 
          trend="+4.2%" 
        />
        <StatCard 
          label="Monthly Reach" 
          value={formatNumber(channel.monthly_views || 0)} 
          icon={Eye} 
          trend="+12.8%" 
        />
        <StatCard 
          label="Est. Revenue" 
          value={`R$ ${formatNumber(metrics?.totalRevenue || 0)}`} 
          icon={DollarSign} 
          trend="+8.1%" 
          color="text-emerald-500"
        />
        <StatCard 
          label="Efficiency Rating" 
          value="94.2%" 
          icon={Activity} 
          trend="OPTIMAL" 
          color="text-primary"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Main Analytics Chart Area (Placeholder for actual chart) */}
        <Card className="lg:col-span-2 bg-[#0a0a0c] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
          <CardHeader className="bg-black/40 border-b border-white/5 p-8 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl font-black uppercase italic tracking-tighter text-white">Performance Metrics</CardTitle>
              <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-1">Dados em Tempo Real</p>
            </div>
            <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
              {(['7d', '30d', 'all'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                    period === p ? "bg-primary text-white shadow-lg" : "text-white/30 hover:text-white"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="p-10 h-[350px] flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none" />
            <div className="text-center space-y-4 relative z-10">
              <BarChart3 className="w-12 h-12 text-primary/20 mx-auto animate-pulse" />
              <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">Carregando dados...</p>
            </div>
          </CardContent>
        </Card>

        {/* Side Panels */}
        <div className="space-y-6">
          <Card className="bg-[#0c0c0e] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-xl">
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-white/40 italic flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> Melhores Vídeos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 pt-0 space-y-4">
              {metrics?.topVideos?.length ? metrics.topVideos.map((v, i) => (
                <div key={i} className="flex items-center justify-between group">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white uppercase truncate group-hover:text-primary transition-colors">{v.video_title}</p>
                    <p className="text-[9px] text-white/20 font-black uppercase tracking-widest">{formatNumber(v.views || 0)} VIEWS</p>
                  </div>
                  <ArrowUpRight className="w-3 h-3 text-white/10 group-hover:text-primary transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              )) : (
                <p className="text-[10px] font-bold text-white/10 uppercase tracking-widest py-10 text-center italic">Nenhum vídeo disponível ainda.</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-[#0c0c0e] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-xl">
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-white/40 italic flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" /> Atividade Recente
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 pt-0 space-y-4">
              {recentContents.map((c, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full shrink-0",
                    c.status === 'published' ? "bg-emerald-500" : "bg-primary animate-pulse"
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-white uppercase truncate">{c.title || "Sem título"}</p>
                    <p className="text-[8px] text-white/20 font-black uppercase tracking-widest">{new Date(c.created_at || '').toLocaleDateString('pt-BR')}</p>
                  </div>
                  <ContentStatusBadge status={c.status} />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, trend, color = "text-white" }: any) {
  return (
    <Card className="bg-[#0c0c0e] border-white/5 rounded-[2rem] overflow-hidden shadow-xl group hover:border-primary/20 transition-all">
      <CardContent className="p-8 space-y-4">
        <div className="flex items-center justify-between">
          <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 group-hover:border-primary/20 transition-all">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg">
            {trend}
          </span>
        </div>
        <div className="space-y-1">
          <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.25em] ml-0.5">{label}</p>
          <p className={cn("text-3xl font-black italic tracking-tighter uppercase", color)}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
