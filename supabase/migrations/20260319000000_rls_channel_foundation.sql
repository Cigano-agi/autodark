-- Migration: RLS para channel_foundation
-- A tabela foi criada sem migration formal. Garantindo RLS alinhado
-- com o padrão de owns_channel() já usado nas demais tabelas.

ALTER TABLE IF EXISTS public.channel_foundation ENABLE ROW LEVEL SECURITY;

-- Remove policies antigas se existirem (idempotente)
DROP POLICY IF EXISTS "foundation_select" ON public.channel_foundation;
DROP POLICY IF EXISTS "foundation_insert" ON public.channel_foundation;
DROP POLICY IF EXISTS "foundation_update" ON public.channel_foundation;
DROP POLICY IF EXISTS "foundation_delete" ON public.channel_foundation;

CREATE POLICY "foundation_select"
  ON public.channel_foundation FOR SELECT
  USING (
    channel_id IN (
      SELECT id FROM public.channels WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "foundation_insert"
  ON public.channel_foundation FOR INSERT
  WITH CHECK (
    channel_id IN (
      SELECT id FROM public.channels WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "foundation_update"
  ON public.channel_foundation FOR UPDATE
  USING (
    channel_id IN (
      SELECT id FROM public.channels WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "foundation_delete"
  ON public.channel_foundation FOR DELETE
  USING (
    channel_id IN (
      SELECT id FROM public.channels WHERE user_id = auth.uid()
    )
  );
