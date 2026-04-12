ALTER TABLE public.channel_competitors
  ADD COLUMN IF NOT EXISTS last_video_date timestamptz,
  ADD COLUMN IF NOT EXISTS youtube_channel_id text;
