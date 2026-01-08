import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

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
  created_at: string;
  updated_at: string;
}

export interface CreateChannelData {
  name: string;
  niche: string;
  niche_color?: string;
}

export function useChannels() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const channelsQuery = useQuery({
    queryKey: ['channels', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('channels')
        .select('*')
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

      // Create empty blueprint for the channel
      await supabase.from('channel_blueprints').insert({
        channel_id: data.id,
      });

      return data as Channel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      toast({
        title: 'Canal criado!',
        description: 'Seu novo canal foi adicionado com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar canal',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteChannel = useMutation({
    mutationFn: async (channelId: string) => {
      const { error } = await supabase
        .from('channels')
        .delete()
        .eq('id', channelId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      toast({
        title: 'Canal removido',
        description: 'O canal foi excluído com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao excluir canal',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    channels: channelsQuery.data || [],
    isLoading: channelsQuery.isLoading,
    error: channelsQuery.error,
    createChannel,
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
