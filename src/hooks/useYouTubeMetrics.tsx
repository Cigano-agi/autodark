import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ScrapeResult {
  success: boolean;
  data?: {
    channel_name: string;
    youtube_channel_id: string;
    subscribers: number;
    monthly_views: number;
    total_videos: number;
    videos_imported: number;
    avatar_url: string | null;
  };
  error?: string;
}

export function useYouTubeMetrics() {
  const queryClient = useQueryClient();

  // Connect YouTube channel via Apify scraper
  const connectWithApify = useMutation({
    mutationFn: async ({ channelId, youtubeUrl }: { channelId: string; youtubeUrl: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const response = await supabase.functions.invoke<ScrapeResult>('scrape-youtube-channel', {
        body: { channel_id: channelId, youtube_url: youtubeUrl },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao conectar canal');
      }

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Erro ao buscar dados do canal');
      }

      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      queryClient.invalidateQueries({ queryKey: ['channel'] });
      queryClient.invalidateQueries({ queryKey: ['contents'] });
      queryClient.invalidateQueries({ queryKey: ['channel-metrics'] });
      toast.success(`YouTube conectado! ${data.data?.channel_name}: ${data.data?.subscribers.toLocaleString()} inscritos, ${data.data?.videos_imported} vídeos importados`);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao conectar YouTube: ${error.message}`);
    },
  });

  // Sync metrics (re-scrape to update data)
  const syncMetrics = useMutation({
    mutationFn: async ({ channelId, youtubeUrl }: { channelId: string; youtubeUrl: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      // Get current channel data to construct URL
      const { data: channel } = await supabase
        .from('channels')
        .select('youtube_channel_id')
        .eq('id', channelId)
        .single();

      if (!channel?.youtube_channel_id) {
        throw new Error('Canal não está conectado ao YouTube');
      }

      const urlToScrape = youtubeUrl || `https://www.youtube.com/channel/${channel.youtube_channel_id}`;

      const response = await supabase.functions.invoke<ScrapeResult>('scrape-youtube-channel', {
        body: { channel_id: channelId, youtube_url: urlToScrape },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao sincronizar');
      }

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Erro ao buscar dados do canal');
      }

      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      queryClient.invalidateQueries({ queryKey: ['channel'] });
      queryClient.invalidateQueries({ queryKey: ['contents'] });
      queryClient.invalidateQueries({ queryKey: ['channel-metrics'] });
      toast.success(`Métricas atualizadas! ${data.data?.subscribers.toLocaleString()} inscritos, ${data.data?.monthly_views.toLocaleString()} views/mês`);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao sincronizar: ${error.message}`);
    },
  });

  // Disconnect YouTube from channel
  const disconnectYouTube = useMutation({
    mutationFn: async (channelId: string) => {
      const { error } = await supabase
        .from('channels')
        .update({
          youtube_channel_id: null,
          youtube_access_token: null,
          youtube_refresh_token: null,
          youtube_connected_at: null,
          avatar_url: null,
        })
        .eq('id', channelId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      queryClient.invalidateQueries({ queryKey: ['channel'] });
      toast.success('YouTube desconectado. A vinculação foi removida.');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao desconectar: ${error.message}`);
    },
  });

  return {
    connectWithApify,
    syncMetrics,
    disconnectYouTube,
  };
}
