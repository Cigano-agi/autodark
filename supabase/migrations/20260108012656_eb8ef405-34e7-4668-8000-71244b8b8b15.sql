-- Add YouTube integration columns to channels table
ALTER TABLE public.channels
ADD COLUMN youtube_channel_id text,
ADD COLUMN youtube_access_token text,
ADD COLUMN youtube_refresh_token text,
ADD COLUMN youtube_connected_at timestamp with time zone;

-- Expand channel_metrics with additional YouTube Analytics fields
ALTER TABLE public.channel_metrics
ADD COLUMN views integer DEFAULT 0,
ADD COLUMN watch_time_minutes integer DEFAULT 0,
ADD COLUMN estimated_revenue numeric DEFAULT 0;