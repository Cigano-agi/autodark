import type { Channel } from "@/hooks/useChannels";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users, Video, Eye, Youtube, Wand2, BrainCircuit, RefreshCw,
} from "lucide-react";
import { formatNumber } from "@/lib/mock-data";

interface ChannelHeaderCardProps {
  channel: Channel;
  doneContents: number;
  totalContents: number;
  isConnecting: boolean;
  isSyncing: boolean;
  isAiLoading: boolean;
  onConnect: () => void;
  onSync: () => void;
  onNewVideo: () => void;
  onStudio: () => void;
  onHeadAgent: () => void;
}

export function ChannelHeaderCard({
  channel,
  doneContents,
  totalContents,
  isConnecting,
  isSyncing,
  isAiLoading,
  onConnect,
  onSync,
  onNewVideo,
  onStudio,
  onHeadAgent,
}: ChannelHeaderCardProps) {
  return (
    <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-card/80 mb-8">
      <div className="h-32 bg-gradient-to-r from-primary/20 via-purple-500/10 to-blue-500/20 relative">
        {channel.youtube_banner_url ? (
          <img src={channel.youtube_banner_url} alt="Banner" className="w-full h-full object-cover opacity-60" />
        ) : (
          <div className="absolute inset-0 bg-grid-white/5" />
        )}
      </div>

      <div className="px-8 pb-8">
        <div className="flex flex-col md:flex-row items-start md:items-end gap-6 -mt-12 relative z-10">
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
              {(channel as Record<string, unknown>).last_scraped_at && ` • Última sincronização ${new Date((channel as Record<string, unknown>).last_scraped_at as string).toLocaleDateString('pt-BR')} às ${new Date((channel as Record<string, unknown>).last_scraped_at as string).toLocaleTimeString('pt-BR')}`}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {!channel.youtube_channel_id ? (
              <Button
                onClick={onConnect}
                disabled={isConnecting}
                className="bg-red-500 hover:bg-red-600 text-white gap-2"
              >
                <Youtube className="w-4 h-4" />
                Conectar YouTube
              </Button>
            ) : (
              <Button
                onClick={onSync}
                variant="outline"
                disabled={isSyncing}
                className="bg-black/20 text-white hover:bg-black/40 border-white/10 gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                Sincronizar
              </Button>
            )}
            <Button
              onClick={onNewVideo}
              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 gap-2"
            >
              <Video className="w-4 h-4" />
              Novo Vídeo
            </Button>
            <Button
              onClick={onStudio}
              className="bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 gap-2"
            >
              <Wand2 className="w-4 h-4" />
              Studio Longo
            </Button>
            <Button
              onClick={onHeadAgent}
              disabled={isAiLoading}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/20 gap-2 border border-purple-400/20"
            >
              <BrainCircuit className={`w-4 h-4 ${isAiLoading ? 'animate-spin' : ''}`} />
              {isAiLoading ? 'Analisando...' : 'Head Agent'}
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-white font-medium">{formatNumber(channel.subscribers || 0)}</span>
            <span className="text-muted-foreground">inscritos</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Eye className="w-4 h-4 text-blue-400" />
            <span className="text-white font-medium">{formatNumber(channel.monthly_views || 0)}</span>
            <span className="text-muted-foreground">views/mês</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Video className="w-4 h-4 text-emerald-400" />
            <span className="text-white font-medium">{doneContents}/{totalContents}</span>
            <span className="text-muted-foreground">conteúdos prontos</span>
          </div>
        </div>
      </div>
    </div>
  );
}
