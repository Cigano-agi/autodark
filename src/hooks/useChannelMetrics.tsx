import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface MetricRecord {
  id: string;
  channel_id: string;
  views: number | null;
  rpm: number | null;
  watch_time_minutes: number | null;
  estimated_revenue: number | null;
  last_video_views: number | null;
  last_video_date: string | null;
  recorded_at: string;
}

export interface ChartDataPoint {
  date: string;
  value: number;
}

export interface ChannelMetricsData {
  dailyViews: ChartDataPoint[];
  dailySubs: ChartDataPoint[];
  dailyRevenue: ChartDataPoint[];
  totalViews: number;
  totalRevenue: number;
  avgRpm: number;
  latestMetric: MetricRecord | null;
}

export function useChannelMetrics(channelId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['channel-metrics', channelId],
    queryFn: async (): Promise<ChannelMetricsData> => {
      if (!channelId) {
        return {
          dailyViews: [],
          dailySubs: [],
          dailyRevenue: [],
          totalViews: 0,
          totalRevenue: 0,
          avgRpm: 0,
          latestMetric: null,
        };
      }

      const { data, error } = await supabase
        .from('channel_metrics')
        .select('*')
        .eq('channel_id', channelId)
        .order('recorded_at', { ascending: true });

      if (error) throw error;

      const metrics = (data || []) as MetricRecord[];

      if (metrics.length === 0) {
        return {
          dailyViews: [],
          dailySubs: [],
          dailyRevenue: [],
          totalViews: 0,
          totalRevenue: 0,
          avgRpm: 0,
          latestMetric: null,
        };
      }

      const dailyViews: ChartDataPoint[] = metrics.map(m => ({
        date: new Date(m.recorded_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        value: m.views || m.last_video_views || 0,
      }));

      const dailyRevenue: ChartDataPoint[] = metrics.map(m => ({
        date: new Date(m.recorded_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        value: Number(m.estimated_revenue) || 0,
      }));

      // Subs data isn't directly in metrics, use a placeholder based on views trend
      const dailySubs: ChartDataPoint[] = metrics.map(m => ({
        date: new Date(m.recorded_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        value: Math.round((m.views || 0) * 0.01), // ~1% conversion estimate
      }));

      const totalViews = metrics.reduce((sum, m) => sum + (m.views || m.last_video_views || 0), 0);
      const totalRevenue = metrics.reduce((sum, m) => sum + (Number(m.estimated_revenue) || 0), 0);
      const avgRpm = metrics.length > 0
        ? metrics.reduce((sum, m) => sum + (Number(m.rpm) || 0), 0) / metrics.length
        : 0;

      return {
        dailyViews,
        dailySubs,
        dailyRevenue,
        totalViews,
        totalRevenue,
        avgRpm,
        latestMetric: metrics[metrics.length - 1],
      };
    },
    enabled: !!user && !!channelId,
  });
}
