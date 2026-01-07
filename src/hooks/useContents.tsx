import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface Content {
  id: string;
  channel_id: string;
  title: string;
  status: string;
  scheduled_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateContentData {
  title: string;
  status?: string;
  scheduled_date?: string;
}

export function useContents(channelId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const contentsQuery = useQuery({
    queryKey: ['contents', channelId],
    queryFn: async () => {
      if (!channelId) return [];

      const { data, error } = await supabase
        .from('channel_contents')
        .select('*')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Content[];
    },
    enabled: !!user && !!channelId,
  });

  const createContent = useMutation({
    mutationFn: async (contentData: CreateContentData) => {
      if (!channelId) throw new Error('Channel ID required');

      const { data, error } = await supabase
        .from('channel_contents')
        .insert({
          channel_id: channelId,
          title: contentData.title,
          status: contentData.status || 'draft',
          scheduled_date: contentData.scheduled_date,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Content;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contents', channelId] });
      toast({
        title: 'Conteúdo criado!',
        description: 'Novo vídeo adicionado à lista.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar conteúdo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateContent = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CreateContentData> }) => {
      const { data, error } = await supabase
        .from('channel_contents')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Content;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contents', channelId] });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar conteúdo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteContent = useMutation({
    mutationFn: async (contentId: string) => {
      const { error } = await supabase
        .from('channel_contents')
        .delete()
        .eq('id', contentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contents', channelId] });
      toast({
        title: 'Conteúdo removido',
        description: 'O vídeo foi excluído da lista.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao excluir conteúdo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    contents: contentsQuery.data || [],
    isLoading: contentsQuery.isLoading,
    error: contentsQuery.error,
    createContent,
    updateContent,
    deleteContent,
  };
}
