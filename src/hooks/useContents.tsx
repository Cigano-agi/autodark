import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getFriendlyErrorMessage } from "@/utils/errorHandler";
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Content {
  id: string;
  channel_id: string;
  title: string;
  status: string | null;
  scheduled_date: string | null;
  created_at: string;
  updated_at: string;
  // Pipeline fields
  hook: string | null;
  topic: string | null;
  angle: string | null;
  character: string | null;
  reference: string | null;
  nicho_slug: string | null;
  script: string | null;
  ssml_cache: string | null;
  audio_path: string | null;
  subtitle_path: string | null;
  audio_duration: number | null;
  error_log: string | null;
}

export interface CreateContentData {
  title: string;
  status?: string;
  scheduled_date?: string;
  hook?: string;
  topic?: string;
  angle?: string;
  character?: string;
  reference?: string;
  nicho_slug?: string;
  script?: string;
  // Pipeline fields
  video_path?: string;
  thumbnail_path?: string;
  thumbnail_prompt?: string;
  thumbnail_url?: string;
  scenes?: unknown;
  audio_url?: string;
  voice_name?: string;
  narration_script?: string;
  slide_script?: unknown;
  slide_images?: unknown;
}

export function useContents(channelId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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

      // Build insert payload — only include defined fields
      const payload: Record<string, unknown> = {
        channel_id: channelId,
        title: contentData.title,
        status: contentData.status || 'draft',
      };

      // Add optional fields only if provided
      const optionalFields: (keyof CreateContentData)[] = [
        'scheduled_date', 'hook', 'topic', 'angle', 'character', 'reference',
        'nicho_slug', 'script', 'video_path', 'thumbnail_path', 'thumbnail_prompt',
        'thumbnail_url', 'scenes', 'audio_url', 'voice_name', 'narration_script',
        'slide_script', 'slide_images',
      ];
      for (const key of optionalFields) {
        if (contentData[key] !== undefined) payload[key] = contentData[key];
      }

      const { data, error } = await supabase
        .from('channel_contents')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data as Content;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contents', channelId] });
      toast.success('Conteúdo criado! Novo vídeo adicionado à lista.');
    },
    onError: (error) => {
      toast.error(getFriendlyErrorMessage(error, "ao criar conteúdo"));
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
      toast.error(getFriendlyErrorMessage(error, "ao atualizar conteúdo"));
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
      toast.success('Conteúdo removido. O vídeo foi excluído da lista.');
    },
    onError: (error) => {
      toast.error(getFriendlyErrorMessage(error, "ao excluir conteúdo"));
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
