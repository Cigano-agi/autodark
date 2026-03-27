-- Database Architect: Schema Verification & Updates for Head Agent

-- 1. Verify 'channels' table has necessary columns for scraping (since we are skipping Google Sync)
ALTER TABLE public.channels 
ADD COLUMN IF NOT EXISTS youtube_id text, -- ID externo do canal (ex: UC...)
ADD COLUMN IF NOT EXISTS youtube_uploads_playlist_id text, -- ID da playlist de uploads
ADD COLUMN IF NOT EXISTS last_scraped_at timestamptz;

-- 2. Verify 'channel_blueprints' for AI Strategy
-- usage: AI reads 'topic', 'script_rules' and writes suggestions? 
-- actually, we might need a separate table for 'strategies' or 'suggestions' if we want history.
-- For now, let's ensure the blueprint can hold the "Persona" info the AI needs.
ALTER TABLE public.channel_blueprints
ADD COLUMN IF NOT EXISTS persona_prompt text, -- Custom instruction for the AI persona
ADD COLUMN IF NOT EXISTS target_audience text;

-- 3. Create a table for AI generated content ideas (The "Head Agent" output)
CREATE TABLE IF NOT EXISTS public.content_ideas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    channel_id uuid REFERENCES public.channels(id) ON DELETE CASCADE,
    title text NOT NULL,
    concept text,
    reasoning text, -- Why the AI suggested this
    score integer, -- Potential viral score
    status text DEFAULT 'pending', -- pending, approved, rejected
    created_at timestamptz DEFAULT now()
);

-- 4. Enable RLS on new table
ALTER TABLE public.content_ideas ENABLE ROW LEVEL SECURITY;

-- 5. Create Policy for content_ideas (User can only see their own)
CREATE POLICY "Users can manage their own content ideas"
ON public.content_ideas
USING (
    exists (
        select 1 from public.channels
        where channels.id = content_ideas.channel_id
        and channels.user_id = auth.uid()
    )
);

-- 6. Function to update channel metrics from Apify data (optional helper)
-- (Logic handles this in the Edge Function, but good to have schema ready)
