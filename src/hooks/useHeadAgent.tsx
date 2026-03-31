import { useState } from 'react';
import { HeadAgentData } from '@/types/headAgent';
import { getFriendlyErrorMessage } from "@/utils/errorHandler";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface StrategyResult {
    strategy: string;
    ideas?: Array<{
        title: string;
        concept?: string;
        reasoning?: string;
        score?: number;
    }>;
}

export function useHeadAgent() {
    const [isLoading, setIsLoading] = useState(false);
    const [strategy, setStrategy] = useState<StrategyResult | null>(null);

    const generateStrategy = async (channelId: string) => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('generate-strategy', {
                body: { channelId },
            });

            if (error) throw error;

            setStrategy(data);
            toast.success('Estratégia gerada com sucesso!');
            return data;
        } catch (error) {
            toast.error(getFriendlyErrorMessage(error, "ao atualizar Head Agent"));
            toast.error('Falha ao gerar estratégia. Tente novamente.');
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    return {
        generateStrategy,
        strategy,
        isLoading
    };
}
