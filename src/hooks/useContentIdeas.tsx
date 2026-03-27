import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface ContentIdea {
    id: string;
    channel_id: string | null;
    title: string;
    concept: string | null;
    reasoning: string | null;
    score: number | null;
    status: string | null;
    created_at: string | null;
}

export function useContentIdeas(channelId: string | undefined) {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const ideasQuery = useQuery({
        queryKey: ['content-ideas', channelId],
        queryFn: async () => {
            if (!channelId) return [];

            const { data, error } = await (supabase
                .from as any)('content_ideas')
                .select('*')
                .eq('channel_id', channelId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as ContentIdea[];
        },
        enabled: !!user && !!channelId,
    });

    const updateIdeaStatus = useMutation({
        mutationFn: async ({ ideaId, status }: { ideaId: string; status: string }) => {
            const { data, error } = await (supabase
                .from as any)('content_ideas')
                .update({ status })
                .eq('id', ideaId)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['content-ideas', channelId] });
            toast.success('Ideia atualizada!');
        },
        onError: (error) => {
            toast.error('Erro ao atualizar ideia: ' + error.message);
        },
    });

    const deleteIdea = useMutation({
        mutationFn: async (ideaId: string) => {
            const { error } = await (supabase
                .from as any)('content_ideas')
                .delete()
                .eq('id', ideaId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['content-ideas', channelId] });
            toast.success('Ideia removida.');
        },
        onError: (error) => {
            toast.error('Erro ao remover ideia: ' + error.message);
        },
    });

    return {
        ideas: ideasQuery.data || [],
        isLoading: ideasQuery.isLoading,
        error: ideasQuery.error,
        updateIdeaStatus,
        deleteIdea,
    };
}
