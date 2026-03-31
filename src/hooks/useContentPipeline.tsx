import { useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getFriendlyErrorMessage } from "@/utils/errorHandler";
import { toast } from 'sonner';

export type ContentStatus =
    | 'draft'
    | 'idea_generated'
    | 'script_generated'
    | 'pending_tts'
    | 'tts_processing'
    | 'tts_done'
    | 'tts_failed'
    | 'audio_storage_failed'
    | 'subtitle_generated'
    | 'published';

export interface PipelineContent {
    id: string;
    channel_id: string;
    title: string;
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
    status: ContentStatus | string | null;
    error_log: string | null;
    scheduled_date: string | null;
    created_at: string;
    updated_at: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string; icon: string }> = {
    draft: { label: 'Rascunho', color: 'bg-gray-500/20 text-gray-400', icon: '📝' },
    idea_generated: { label: 'Ideia Gerada', color: 'bg-blue-500/20 text-blue-400', icon: '💡' },
    script_generated: { label: 'Roteiro Pronto', color: 'bg-indigo-500/20 text-indigo-400', icon: '📜' },
    pending_tts: { label: 'Aguardando TTS', color: 'bg-yellow-500/20 text-yellow-400', icon: '⏳' },
    tts_processing: { label: 'Processando Áudio', color: 'bg-orange-500/20 text-orange-400', icon: '🔄' },
    tts_done: { label: 'Áudio Pronto', color: 'bg-emerald-500/20 text-emerald-400', icon: '🎵' },
    tts_failed: { label: 'Erro TTS', color: 'bg-red-500/20 text-red-400', icon: '❌' },
    audio_storage_failed: { label: 'Erro Storage', color: 'bg-red-500/20 text-red-400', icon: '❌' },
    subtitle_generated: { label: 'Legenda Pronta', color: 'bg-teal-500/20 text-teal-400', icon: '📋' },
    published: { label: 'Publicado', color: 'bg-green-500/20 text-green-400', icon: '✅' },
};

export function getStatusInfo(status: string | null | undefined) {
    return STATUS_LABELS[status || 'draft'] || STATUS_LABELS.draft;
}

export function useContentPipeline(channelId: string | undefined) {
    const queryClient = useQueryClient();

    const ideaLockRef = useRef(false);
    const [generatingIdeas, setGeneratingIdeas] = useState(false);
    const [generatingScript, setGeneratingScript] = useState<Record<string, boolean>>({});
    const [processingAudio, setProcessingAudio] = useState<Record<string, boolean>>({});

    const invalidateContents = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['contents', channelId] });
    }, [queryClient, channelId]);

    const generateIdeas = useCallback(async () => {
        if (!channelId) {
            toast.error('Selecione um canal primeiro.');
            return null;
        }

        if (ideaLockRef.current) return null;
        ideaLockRef.current = true;

        setGeneratingIdeas(true);
        try {
            const { data, error } = await supabase.functions.invoke('generate-ideas', {
                body: { channelId },
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            toast.success(`💡 Ideias Geradas! ${data.count} ideias criadas com sucesso.`);

            invalidateContents();
            return data;
        } catch (e: any) {
            toast.error(getFriendlyErrorMessage(e, "ao gerar ideias"));
            return null;
        } finally {
            setGeneratingIdeas(false);
            ideaLockRef.current = false;
        }
    }, [channelId, invalidateContents]);

    const generateScript = useCallback(async (contentId: string) => {
        setGeneratingScript(prev => ({ ...prev, [contentId]: true }));
        try {
            const { data, error } = await supabase.functions.invoke('generate-script', {
                body: { contentId },
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            toast.success(`📜 Roteiro Gerado! ${data.char_used || '?'} caracteres utilizados.`);

            invalidateContents();
            return data;
        } catch (e: any) {
            toast.error(getFriendlyErrorMessage(e, "ao gerar roteiro"));
            return null;
        } finally {
            setGeneratingScript(prev => ({ ...prev, [contentId]: false }));
        }
    }, [toast, invalidateContents]);

    const processAudioPipeline = useCallback(async (contentId: string) => {
        setProcessingAudio(prev => ({ ...prev, [contentId]: true }));
        try {
            const { data, error } = await supabase.functions.invoke('process-content-audio', {
                body: { contentId },
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            toast.success(`🎵 Áudio Processado! Duração: ~${data.estimatedDuration?.toFixed(1)}s${data.hasSubtitle ? ' | Legenda gerada' : ''}`);

            invalidateContents();
            return data;
        } catch (e: any) {
            toast.error(getFriendlyErrorMessage(e, "no processamento de áudio"));
            return null;
        } finally {
            setProcessingAudio(prev => ({ ...prev, [contentId]: false }));
        }
    }, [invalidateContents]);

    const retryFailed = useCallback(async (contentId: string) => {
        return processAudioPipeline(contentId);
    }, [processAudioPipeline]);

    const getAudioUrl = useCallback((audioPath: string | null) => {
        if (!audioPath) return null;
        const { data } = supabase.storage.from('content-media').getPublicUrl(audioPath);
        return data?.publicUrl || null;
    }, []);

    return {
        generateIdeas,
        generateScript,
        processAudioPipeline,
        retryFailed,
        getAudioUrl,
        generatingIdeas,
        generatingScript,
        processingAudio,
        getStatusInfo,
    };
}
