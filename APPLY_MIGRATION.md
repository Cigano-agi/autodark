# Aplicar Migration: Histórico de Vídeos

**1 passo — execute este SQL no Supabase Dashboard:**

👉 https://supabase.com/dashboard/project/bwitfpvqruwikpuaiurc/sql/new

```sql
CREATE TABLE public.video_generations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  youtube_title TEXT,
  youtube_description TEXT,
  scene_count INTEGER DEFAULT 0,
  duration_sec INTEGER DEFAULT 0,
  script_data JSONB NOT NULL DEFAULT '{}',
  visual_prompts JSONB DEFAULT '[]',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','complete','exported')),
  thumbnail_data TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.video_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own video generations"
  ON public.video_generations
  FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_video_generations_channel ON public.video_generations(channel_id);
CREATE INDEX idx_video_generations_user ON public.video_generations(user_id);
```

Após executar, o histórico de gerações aparece automaticamente no Studio (Step 1).
