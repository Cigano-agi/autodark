CREATE TABLE public.channel_competitors (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    channel_id uuid REFERENCES public.channels(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    handle text NOT NULL,
    youtube_url text,
    niche text,
    subscribers integer DEFAULT 0,
    avg_views integer DEFAULT 0,
    upload_frequency text DEFAULT '?',
    last_video text DEFAULT 'Buscando...',
    growth text DEFAULT '+0%',
    tracking boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.channel_competitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own competitors"
ON public.channel_competitors
FOR ALL
USING (owns_channel(channel_id))
WITH CHECK (owns_channel(channel_id));