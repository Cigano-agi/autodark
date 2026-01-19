import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ChannelMetric {
  id: string;
  channel_id: string;
  rpm: number | null;
  views: number | null;
  watch_time_minutes: number | null;
  estimated_revenue: number | null;
  last_video_views: number | null;
  last_video_date: string | null;
  recorded_at: string;
}

export function useChannelMetrics(channelId: string | undefined) {
  return useQuery({
    queryKey: ['channel-metrics', channelId],
    queryFn: async () => {
      if (!channelId) return [];
      
      const { data, error } = await supabase
        .from('channel_metrics')
        .select('*')
        .eq('channel_id', channelId)
        .order('recorded_at', { ascending: true })
        .limit(30);

      if (error) throw error;
      return data as ChannelMetric[];
    },
    enabled: !!channelId,
  });
}

export function useLatestMetric(channelId: string | undefined) {
  return useQuery({
    queryKey: ['channel-latest-metric', channelId],
    queryFn: async () => {
      if (!channelId) return null;
      
      const { data, error } = await supabase
        .from('channel_metrics')
        .select('*')
        .eq('channel_id', channelId)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as ChannelMetric | null;
    },
    enabled: !!channelId,
  });
}
