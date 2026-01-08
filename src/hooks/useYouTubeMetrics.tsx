import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useYouTubeMetrics() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Connect YouTube account to a channel
  const connectYouTube = useMutation({
    mutationFn: async (channelId: string) => {
      // Start OAuth flow with YouTube scopes
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/channel/${channelId}?youtube_connect=true`,
          scopes: 'https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;
      return data;
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao conectar YouTube',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Save YouTube connection after OAuth callback
  const saveYouTubeConnection = useMutation({
    mutationFn: async ({ 
      channelId, 
      youtubeChannelId, 
      accessToken, 
      refreshToken 
    }: { 
      channelId: string; 
      youtubeChannelId: string; 
      accessToken: string; 
      refreshToken?: string;
    }) => {
      const { error } = await supabase
        .from('channels')
        .update({
          youtube_channel_id: youtubeChannelId,
          youtube_access_token: accessToken,
          youtube_refresh_token: refreshToken || null,
          youtube_connected_at: new Date().toISOString(),
        })
        .eq('id', channelId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      toast({
        title: 'YouTube conectado!',
        description: 'Seu canal foi vinculado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao salvar conexão',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Sync metrics from YouTube API
  const syncMetrics = useMutation({
    mutationFn: async (channelId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const response = await supabase.functions.invoke('sync-youtube-metrics', {
        body: { channel_id: channelId },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      queryClient.invalidateQueries({ queryKey: ['channel'] });
      toast({
        title: 'Métricas atualizadas!',
        description: `${data.data.subscribers.toLocaleString()} inscritos, ${data.data.monthly_views.toLocaleString()} views/mês`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao sincronizar',
        description: error.message,
        variant: 'destructive',
      });
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
        })
        .eq('id', channelId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      queryClient.invalidateQueries({ queryKey: ['channel'] });
      toast({
        title: 'YouTube desconectado',
        description: 'A vinculação foi removida.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao desconectar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Fetch YouTube channel ID from current session
  const fetchYouTubeChannelId = async (accessToken: string): Promise<string | null> => {
    try {
      const response = await fetch(
        'https://www.googleapis.com/youtube/v3/channels?part=id&mine=true',
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      
      if (!response.ok) return null;
      
      const data = await response.json();
      return data.items?.[0]?.id || null;
    } catch {
      return null;
    }
  };

  return {
    connectYouTube,
    saveYouTubeConnection,
    syncMetrics,
    disconnectYouTube,
    fetchYouTubeChannelId,
  };
}
