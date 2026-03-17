import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Blueprint {
  id: string;
  channel_id: string;
  topic: string | null;
  voice_id: string | null;
  voice_name: string | null;
  script_rules: string | null;
  visual_style: string | null;
  upload_frequency: string;
  persona_prompt: string | null;
  target_audience: string | null;
  character_description: string | null;
  style_reference_url: string | null;
  character_consistency: boolean;
  scenes_image_ratio: number;
  scenes_video_ratio: number;
  custom_music_url: string | null;
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
  persona_prompt?: string;
  target_audience?: string;
  character_description?: string;
  style_reference_url?: string;
  character_consistency?: boolean;
  scenes_image_ratio?: number;
  scenes_video_ratio?: number;
  custom_music_url?: string;
}

export const VISUAL_STYLE_OPTIONS = [
  { value: 'realistic', label: 'Realista' },
  { value: 'cartoon', label: 'Cartoon / Bonequinho' },
  { value: 'oil-painting', label: 'Pintura a Óleo' },
  { value: 'clay', label: 'Clay / Massinha' },
  { value: 'stick-figure', label: 'Palito com Carinha' },
  { value: 'mannequin', label: 'Manequim' },
  { value: 'flash-cartoon', label: 'Flash Cartoon' },
  { value: 'vector', label: 'Vector / Flat' },
];

export function useBlueprint(channelId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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
      toast.success('Blueprint salvo! As configurações do canal foram atualizadas.');
    },
    onError: (error) => {
      toast.error(`Erro ao salvar blueprint: ${error.message}`);
    },
  });

  return {
    blueprint: blueprintQuery.data,
    isLoading: blueprintQuery.isLoading,
    error: blueprintQuery.error,
    updateBlueprint,
  };
}
