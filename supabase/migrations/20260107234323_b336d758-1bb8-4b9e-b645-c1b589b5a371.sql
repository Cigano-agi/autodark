-- Create channels table
CREATE TABLE public.channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    niche TEXT NOT NULL,
    niche_color TEXT DEFAULT 'bg-muted text-muted-foreground',
    subscribers INTEGER DEFAULT 0,
    monthly_views INTEGER DEFAULT 0,
    health TEXT DEFAULT 'green',
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create channel_blueprints table
CREATE TABLE public.channel_blueprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
    topic TEXT,
    voice_id TEXT,
    voice_name TEXT,
    script_rules TEXT,
    visual_style TEXT,
    upload_frequency TEXT DEFAULT '3x por semana',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(channel_id)
);

-- Create channel_metrics table
CREATE TABLE public.channel_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
    rpm DECIMAL(10,2) DEFAULT 0,
    last_video_views INTEGER DEFAULT 0,
    last_video_date DATE,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create channel_contents table
CREATE TABLE public.channel_contents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    scheduled_date DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_contents ENABLE ROW LEVEL SECURITY;

-- Helper function to check channel ownership
CREATE OR REPLACE FUNCTION public.owns_channel(_channel_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.channels
        WHERE id = _channel_id
          AND user_id = auth.uid()
    )
$$;

-- RLS policies for channels
CREATE POLICY "Users can view their own channels"
ON public.channels FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own channels"
ON public.channels FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own channels"
ON public.channels FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own channels"
ON public.channels FOR DELETE
USING (user_id = auth.uid());

-- RLS policies for blueprints
CREATE POLICY "Users can view blueprints of their channels"
ON public.channel_blueprints FOR SELECT
USING (public.owns_channel(channel_id));

CREATE POLICY "Users can create blueprints for their channels"
ON public.channel_blueprints FOR INSERT
WITH CHECK (public.owns_channel(channel_id));

CREATE POLICY "Users can update blueprints of their channels"
ON public.channel_blueprints FOR UPDATE
USING (public.owns_channel(channel_id));

CREATE POLICY "Users can delete blueprints of their channels"
ON public.channel_blueprints FOR DELETE
USING (public.owns_channel(channel_id));

-- RLS policies for metrics
CREATE POLICY "Users can view metrics of their channels"
ON public.channel_metrics FOR SELECT
USING (public.owns_channel(channel_id));

CREATE POLICY "Users can create metrics for their channels"
ON public.channel_metrics FOR INSERT
WITH CHECK (public.owns_channel(channel_id));

CREATE POLICY "Users can update metrics of their channels"
ON public.channel_metrics FOR UPDATE
USING (public.owns_channel(channel_id));

CREATE POLICY "Users can delete metrics of their channels"
ON public.channel_metrics FOR DELETE
USING (public.owns_channel(channel_id));

-- RLS policies for contents
CREATE POLICY "Users can view contents of their channels"
ON public.channel_contents FOR SELECT
USING (public.owns_channel(channel_id));

CREATE POLICY "Users can create contents for their channels"
ON public.channel_contents FOR INSERT
WITH CHECK (public.owns_channel(channel_id));

CREATE POLICY "Users can update contents of their channels"
ON public.channel_contents FOR UPDATE
USING (public.owns_channel(channel_id));

CREATE POLICY "Users can delete contents of their channels"
ON public.channel_contents FOR DELETE
USING (public.owns_channel(channel_id));

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_channels_updated_at
BEFORE UPDATE ON public.channels
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_channel_blueprints_updated_at
BEFORE UPDATE ON public.channel_blueprints
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_channel_contents_updated_at
BEFORE UPDATE ON public.channel_contents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();