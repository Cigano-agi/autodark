-- Migration: async_scene_queue
-- Formaliza a tabela production_states (criada manualmente no dashboard)
-- e garante compatibilidade com o worker de background da Phase 5.

-- 1. Criar tabela se não existir (idempotente)
CREATE TABLE IF NOT EXISTS public.production_states (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id    UUID        UNIQUE REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id       UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  step          NUMERIC     DEFAULT 1,
  status        TEXT        DEFAULT 'idle',
  data          JSONB       DEFAULT '{}',
  scenes        JSONB       DEFAULT '[]',
  total_scenes  INTEGER     DEFAULT 0,
  completed_scenes INTEGER  DEFAULT 0,
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- 2. Habilitar RLS (se ainda não estiver habilitado)
ALTER TABLE public.production_states ENABLE ROW LEVEL SECURITY;

-- 3. Criar policy RLS se não existir
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'production_states'
      AND schemaname = 'public'
      AND policyname = 'production_states_owner'
  ) THEN
    EXECUTE '
      CREATE POLICY production_states_owner
        ON public.production_states
        FOR ALL
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id)
    ';
  END IF;
END $$;

-- 4. Index por channel_id para performance (se não existir)
CREATE INDEX IF NOT EXISTS idx_production_states_channel_id
  ON public.production_states(channel_id);

-- 5. Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_production_states_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_production_states_updated_at ON public.production_states;
CREATE TRIGGER trg_production_states_updated_at
  BEFORE UPDATE ON public.production_states
  FOR EACH ROW EXECUTE FUNCTION public.update_production_states_timestamp();

-- Nota: O campo errorCount por cena vive dentro do JSONB scenes[].errorCount
-- (campo opcional — worker trata ausência como 0, sem necessidade de ALTER TABLE)
