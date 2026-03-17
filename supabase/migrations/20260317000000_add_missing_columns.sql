-- Fix scrape-youtube-channel edge function (last_scraped_at missing → causes 400)
ALTER TABLE public.channels
ADD COLUMN IF NOT EXISTS last_scraped_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS youtube_id TEXT,
ADD COLUMN IF NOT EXISTS youtube_uploads_playlist_id TEXT;

-- Fix channel_blueprints for AI strategy
ALTER TABLE public.channel_blueprints
ADD COLUMN IF NOT EXISTS persona_prompt TEXT,
ADD COLUMN IF NOT EXISTS target_audience TEXT;

-- Fix channel_metrics (video metadata missing → insert errors)
ALTER TABLE public.channel_metrics
ADD COLUMN IF NOT EXISTS video_title TEXT,
ADD COLUMN IF NOT EXISTS video_url TEXT,
ADD COLUMN IF NOT EXISTS video_thumbnail TEXT;

-- Create content_ideas table (missing → causes 404 in frontend)
CREATE TABLE IF NOT EXISTS public.content_ideas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    concept TEXT,
    reasoning TEXT,
    score INTEGER,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.content_ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own content ideas"
ON public.content_ideas
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.channels
        WHERE channels.id = content_ideas.channel_id
        AND channels.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.channels
        WHERE channels.id = content_ideas.channel_id
        AND channels.user_id = auth.uid()
    )
);
