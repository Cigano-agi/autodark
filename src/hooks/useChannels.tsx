import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Channel {
  id: string;
  user_id: string;
  name: string;
  niche: string;
  niche_color: string;
  subscribers: number;
  monthly_views: number;
  health: string;
  avatar_url: string | null;
  youtube_channel_id: string | null;
  youtube_access_token: string | null;
  youtube_refresh_token: string | null;
  youtube_connected_at: string | null;
  youtube_username: string | null;
  youtube_total_videos: number | null;
  youtube_total_views: number | null;
  youtube_description: string | null;
  youtube_joined_date: string | null;
  youtube_banner_url: string | null;
  is_active: boolean | null;

  created_at: string;
  updated_at: string;
}

export interface CreateChannelData {
  name: string;
  niche: string;
  niche_color?: string;
  tone_of_voice?: string;
  target_audience?: string;
  requires_review?: boolean;
}

export interface UpdateChannelData {
  name?: string;
  niche?: string;
  niche_color?: string;
}

export function useChannels() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const channelsQuery = useQuery({
    queryKey: ['channels', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Channel[];
    },
    enabled: !!user,
  });

  const createChannel = useMutation({
    mutationFn: async (channelData: CreateChannelData) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('channels')
        .insert({
          user_id: user.id,
          name: channelData.name,
          niche: channelData.niche,
          niche_color: channelData.niche_color || 'bg-muted text-muted-foreground',
        })
        .select()
        .single();

      if (error) throw error;

      // Create empty blueprint for the channel with optional initial values
      await supabase.from('channel_blueprints').insert({
        channel_id: data.id,
        tone_of_voice: channelData.tone_of_voice || null,
        target_audience: channelData.target_audience || null,
      });

      return data as Channel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      toast.success('Canal criado! Seu novo canal foi adicionado com sucesso.');
    },
    onError: (error) => {
      toast.error(`Erro ao criar canal: ${error.message}`);
    },
  });

  const updateChannel = useMutation({
    mutationFn: async ({ channelId, data }: { channelId: string; data: UpdateChannelData }) => {
      const { data: updated, error } = await supabase
        .from('channels')
        .update({
          name: data.name,
          niche: data.niche,
          niche_color: data.niche_color,
          updated_at: new Date().toISOString(),
        })
        .eq('id', channelId)
        .select()
        .single();

      if (error) throw error;
      return updated as Channel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      toast.success('Canal atualizado! As informações do canal foram atualizadas.');
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar canal: ${error.message}`);
    },
  });

  const deleteChannel = useMutation({
    mutationFn: async (channelId: string) => {
      // Delete related data first (cascade with error checking)
      const dependentTables = ['channel_metrics', 'channel_contents', 'channel_blueprints'] as const;
      for (const table of dependentTables) {
        const { error } = await supabase.from(table).delete().eq('channel_id', channelId);
        if (error) {
          console.error(`Erro ao limpar ${table}:`, error);
          throw new Error(`Falha ao excluir dados de ${table}: ${error.message}`);
        }
      }

      const { error } = await supabase
        .from('channels')
        .delete()
        .eq('id', channelId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      toast.success('Canal removido. O canal foi excluído com sucesso.');
    },
    onError: (error) => {
      toast.error(`Erro ao excluir canal: ${error.message}`);
    },
  });

  return {
    channels: channelsQuery.data || [],
    isLoading: channelsQuery.isLoading,
    error: channelsQuery.error,
    createChannel,
    updateChannel,
    deleteChannel,
  };
}

export function useChannel(channelId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['channel', channelId],
    queryFn: async () => {
      if (!channelId) return null;

      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .eq('id', channelId)
        .maybeSingle();

      if (error) throw error;
      return data as Channel | null;
    },
    enabled: !!user && !!channelId,
  });
}
