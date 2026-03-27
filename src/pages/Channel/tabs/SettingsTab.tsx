import type { Channel } from "@/hooks/useChannels";
import { BlueprintSettings } from "@/components/Strategy/BlueprintSettings";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SettingsTabProps {
  channelId: string;
  channel: Channel;
}

export function SettingsTab({ channelId, channel }: SettingsTabProps) {
  return (
    <div className="space-y-8">
      <Card className="bg-card/80 border-white/10 p-8">
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
              <span className="text-muted-foreground">Status:</span>
              <Badge variant="outline" className="ml-2 text-emerald-400 border-emerald-400/30">{channel.health || 'green'}</Badge>
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
              <span className="text-muted-foreground">Criado:</span>
              <span className="text-white ml-2">{new Date(channel.created_at).toLocaleDateString('pt-BR')}</span>
            </div>
          </div>
        </div>
      </Card>

      <BlueprintSettings channelId={channelId} />
    </div>
  );
}
