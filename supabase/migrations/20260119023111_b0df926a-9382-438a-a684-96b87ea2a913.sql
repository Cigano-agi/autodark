-- Add new columns to channels table for additional YouTube metrics
ALTER TABLE public.channels 
ADD COLUMN IF NOT EXISTS youtube_username TEXT,
ADD COLUMN IF NOT EXISTS youtube_total_videos INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS youtube_total_views BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS youtube_description TEXT,
ADD COLUMN IF NOT EXISTS youtube_joined_date TEXT,
ADD COLUMN IF NOT EXISTS youtube_banner_url TEXT;