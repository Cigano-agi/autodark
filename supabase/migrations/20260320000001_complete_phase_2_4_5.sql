-- Phase 2.1: Migration for video columns in channel_contents
ALTER TABLE public.channel_contents
ADD COLUMN IF NOT EXISTS scenes JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS video_path TEXT,
ADD COLUMN IF NOT EXISTS thumbnail_path TEXT,
ADD COLUMN IF NOT EXISTS render_status TEXT DEFAULT 'pending' CHECK (render_status IN ('pending', 'processing', 'completed', 'failed'));

-- Phase 4.1: Custom script prompt in channel_blueprints
ALTER TABLE public.channel_blueprints
ADD COLUMN IF NOT EXISTS custom_script_prompt TEXT;
