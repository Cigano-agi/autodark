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
  video_title?: string | null;
  video_url?: string | null;
  video_thumbnail?: string | null;
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
  topVideos: MetricRecord[];
  // Summary fields from the channel itself
  channelTotalSubscribers: number;
  channelMonthlyViews: number;
}

export type TimePeriod = '7d' | '30d' | 'all';

export function useChannelMetrics(channelId: string | undefined, period: TimePeriod = 'all') {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['channel-metrics', channelId, period],
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
          topVideos: [],
          channelTotalSubscribers: 0,
          channelMonthlyViews: 0
        };
      }

      // Fetch both metrics and the channel data for summary counts
      const [metricsResponse, channelResponse] = await Promise.all([
        supabase
          .from('channel_metrics')
          .select('*')
          .eq('channel_id', channelId)
          .order('recorded_at', { ascending: true }),
        supabase
          .from('channels')
          .select('subscribers, monthly_views, youtube_total_views')
          .eq('id', channelId)
          .single()
      ]);

      if (metricsResponse.error) throw metricsResponse.error;
      if (channelResponse.error) throw channelResponse.error;

      let metrics = (metricsResponse.data || []) as MetricRecord[];
      const channel = channelResponse.data;

      // Filter metrics by period
      if (period !== 'all') {
        const now = new Date();
        const days = period === '7d' ? 7 : 30;
        const cutoff = new Date(now.setDate(now.getDate() - days));
        metrics = metrics.filter(m => new Date(m.recorded_at) >= cutoff);
      }

      if (metrics.length === 0) {
        return {
          dailyViews: [],
          dailySubs: [],
          dailyRevenue: [],
          totalViews: channel?.youtube_total_views || 0,
          totalRevenue: 0,
          avgRpm: 0,
          latestMetric: null,
          topVideos: [],
          channelTotalSubscribers: channel?.subscribers || 0,
          channelMonthlyViews: channel?.monthly_views || 0
        };
      }

      // Estimate RPM if not provided (fallback for scraped data)
      const DEFAULT_RPM = 1.5; // Estimated R$ 1,50 per 1000 views

      const processedMetrics = metrics.map(m => {
        const rpm = Number(m.rpm) || DEFAULT_RPM;
        const views = m.views || m.last_video_views || 0;
        const estimatedRevenue = m.estimated_revenue !== null && Number(m.estimated_revenue) > 0
          ? Number(m.estimated_revenue)
          : (views / 1000) * rpm;

        return {
          ...m,
          views,
          rpm,
          estimated_revenue: estimatedRevenue
        };
      });

      const dailyViews: ChartDataPoint[] = processedMetrics.map(m => ({
        date: new Date(m.recorded_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        value: m.views,
      }));

      const dailyRevenue: ChartDataPoint[] = processedMetrics.map(m => ({
        date: new Date(m.recorded_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        value: m.estimated_revenue,
      }));

      // Subs data isn't directly in metrics, use a placeholder based on views trend
      const dailySubs: ChartDataPoint[] = processedMetrics.map(m => ({
        date: new Date(m.recorded_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        value: Math.round(m.views * 0.01), // ~1% conversion estimate
      }));

      const totalViews = processedMetrics.reduce((sum, m) => sum + m.views, 0);
      const totalRevenue = processedMetrics.reduce((sum, m) => sum + m.estimated_revenue, 0);
      const avgRpm = processedMetrics.reduce((sum, m) => sum + m.rpm, 0) / processedMetrics.length;

      // Get top videos
      const topVideos = [...processedMetrics]
        .filter(m => m.video_title)
        .sort((a, b) => (b.views || 0) - (a.views || 0))
        .slice(0, 5);

      return {
        dailyViews,
        dailySubs,
        dailyRevenue,
        totalViews: period === 'all' ? (channel?.youtube_total_views || totalViews) : totalViews,
        totalRevenue,
        avgRpm,
        latestMetric: processedMetrics[processedMetrics.length - 1] as any,
        topVideos,
        channelTotalSubscribers: channel?.subscribers || 0,
        channelMonthlyViews: channel?.monthly_views || 0
      };
    },
    enabled: !!user && !!channelId,
  });
}
