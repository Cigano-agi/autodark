/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface CompetitorChannel {
  id: string;
  channel_id: string;
  name: string;
  handle: string;
  youtube_url: string | null;
  niche: string | null;
  subscribers: number;
  avgViews: number;
  uploadFrequency: string;
  lastVideo: string;
  lastVideoDate: string;
  growth: string;
  tracking: boolean;
  created_at: string;
}

export function useCompetitors(channelId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const competitorsQuery = useQuery({
    queryKey: ['competitors', channelId],
    queryFn: async () => {
      if (!channelId) return [];

      const { data, error } = await supabase
        .from('channel_competitors' as any)
        .select('*')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data as any[]).map(c => ({
        ...c,
        avgViews: c.avg_views,
        uploadFrequency: c.upload_frequency,
        lastVideo: c.last_video,
        lastVideoDate: new Date(c.created_at).toLocaleDateString(), // Mocked as date added for now
        growth: c.growth || '+0%',
      })) as CompetitorChannel[];
    },
    enabled: !!user && !!channelId,
  });

  const addCompetitor = useMutation({
    mutationFn: async (data: { name: string; handle: string; youtube_url?: string; niche?: string }) => {
      if (!channelId) throw new Error('Channel ID required');

      const { data: newComp, error } = await supabase
        .from('channel_competitors' as any)
        .insert({
          channel_id: channelId,
          name: data.name,
          handle: data.handle,
          youtube_url: data.youtube_url,
          niche: data.niche,
          subscribers: 0,
          avg_views: 0,
          upload_frequency: '?',
          last_video: 'Buscando...',
          growth: '+0%',
          tracking: true,
        })
        .select()
        .single();

      if (error) throw error;
      return newComp;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitors', channelId] });
      toast.success('Concorrente adicionado!');
    },
    onError: (error) => {
      toast.error(`Erro ao adicionar concorrente: ${error.message}`);
    },
  });

  const toggleTracking = useMutation({
    mutationFn: async ({ id, tracking }: { id: string; tracking: boolean }) => {
      const { data, error } = await supabase
        .from('channel_competitors' as any)
        .update({ tracking })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['competitors', channelId] });
      toast.success((data as any).tracking ? 'Alertas ativados' : 'Alertas desativados');
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar alertas: ${error.message}`);
    },
  });

  const removeCompetitor = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('channel_competitors' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitors', channelId] });
      toast.success('Concorrente removido');
    },
    onError: (error) => {
      toast.error(`Erro ao remover concorrente: ${error.message}`);
    },
  });

  return {
    competitors: competitorsQuery.data || [],
    isLoading: competitorsQuery.isLoading,
    error: competitorsQuery.error,
    addCompetitor,
    toggleTracking,
    removeCompetitor,
  };
}
