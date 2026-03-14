import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface ChannelPrompt {
    id: string;
    channel_id: string;
    name: string;
    content_type: string;
    prompt_template: string;
    variables: Record<string, any> | null;
    is_active: boolean | null;
    created_at: string | null;
    updated_at: string | null;
}

export type CreateChannelPromptData = Omit<ChannelPrompt, 'id' | 'channel_id' | 'created_at' | 'updated_at'>;

export function useChannelPrompts(channelId: string | undefined) {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const promptsQuery = useQuery({
        queryKey: ['channel-prompts', channelId],
        queryFn: async () => {
            if (!channelId) return [];

            const { data, error } = await (supabase
                .from as any)('channel_prompts')
                .select('*')
                .eq('channel_id', channelId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as ChannelPrompt[];
        },
        enabled: !!user && !!channelId,
    });

    const createPrompt = useMutation({
        mutationFn: async (promptData: CreateChannelPromptData) => {
            if (!channelId) throw new Error('Channel ID required');

            const { data, error } = await (supabase
                .from as any)('channel_prompts')
                .insert({
                    ...promptData,
                    channel_id: channelId,
                })
                .select()
                .single();

            if (error) throw error;
            return data as ChannelPrompt;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['channel-prompts', channelId] });
            toast.success('Prompt criado com sucesso!');
        },
        onError: (error) => {
            toast.error('Erro ao criar prompt: ' + error.message);
        },
    });

    const updatePrompt = useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: Partial<CreateChannelPromptData> }) => {
            const { data, error } = await (supabase
                .from as any)('channel_prompts')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data as ChannelPrompt;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['channel-prompts', channelId] });
            toast.success('Prompt atualizado com sucesso!');
        },
        onError: (error) => {
            toast.error('Erro ao atualizar prompt: ' + error.message);
        },
    });

    const deletePrompt = useMutation({
        mutationFn: async (promptId: string) => {
            const { error } = await (supabase
                .from as any)('channel_prompts')
                .delete()
                .eq('id', promptId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['channel-prompts', channelId] });
            toast.success('Prompt removido com sucesso!');
        },
        onError: (error) => {
            toast.error('Erro ao remover prompt: ' + error.message);
        },
    });

    return {
        prompts: promptsQuery.data || [],
        isLoading: promptsQuery.isLoading,
        error: promptsQuery.error,
        createPrompt,
        updatePrompt,
        deletePrompt,
    };
}
