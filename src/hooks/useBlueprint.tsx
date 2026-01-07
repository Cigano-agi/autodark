import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface Blueprint {
  id: string;
  channel_id: string;
  topic: string | null;
  voice_id: string | null;
  voice_name: string | null;
  script_rules: string | null;
  visual_style: string | null;
  upload_frequency: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateBlueprintData {
  topic?: string;
  voice_id?: string;
  voice_name?: string;
  script_rules?: string;
  visual_style?: string;
  upload_frequency?: string;
}

export function useBlueprint(channelId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const blueprintQuery = useQuery({
    queryKey: ['blueprint', channelId],
    queryFn: async () => {
      if (!channelId) return null;

      const { data, error } = await supabase
        .from('channel_blueprints')
        .select('*')
        .eq('channel_id', channelId)
        .maybeSingle();

      if (error) throw error;
      return data as Blueprint | null;
    },
    enabled: !!user && !!channelId,
  });

  const updateBlueprint = useMutation({
    mutationFn: async (updates: UpdateBlueprintData) => {
      if (!channelId) throw new Error('Channel ID required');

      const { data, error } = await supabase
        .from('channel_blueprints')
        .update(updates)
        .eq('channel_id', channelId)
        .select()
        .single();

      if (error) throw error;
      return data as Blueprint;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blueprint', channelId] });
      toast({
        title: 'Blueprint salvo!',
        description: 'As configurações do canal foram atualizadas.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao salvar blueprint',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    blueprint: blueprintQuery.data,
    isLoading: blueprintQuery.isLoading,
    error: blueprintQuery.error,
    updateBlueprint,
  };
}
