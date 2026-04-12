/**
 * useProductionState — Protocolo de Persistência de Missão.
 * Garante que o estado da fábrica sobreviva a falhas críticas (F5/Crash).
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface SceneSnapshot {
  chapterIndex: number;
  sceneIndex: number;
  status: "pending" | "audio_done" | "visual_done" | "complete" | "error";
  audioUrl?: string;
  imageUrl?: string;
  durationSec?: number;
  prompt?: string;
  errorMessage?: string;
}

export interface ProductionStateData {
  script?: unknown;
  approvedIdea?: unknown;
  chaptersWithAudio?: unknown[];
  chaptersWithVisuals?: unknown[];
  seo?: unknown;
  language?: string;
  durationMin?: number;
  contentId?: string | null;
  [key: string]: unknown;
}

export interface ProductionState {
  id?: string;
  channel_id: string;
  step: number;
  status: "idle" | "running" | "paused" | "done" | "error";
  data: ProductionStateData;
  scenes?: SceneSnapshot[];
  total_scenes?: number;
  completed_scenes?: number;
  updated_at?: string;
}

const INITIAL: Omit<ProductionState, "channel_id"> = {
  step: 1,
  status: "idle",
  data: {},
};

export function useProductionState(channelId: string | undefined) {
  const { user } = useAuth();
  const [state, setState] = useState<ProductionState | null>(null);
  const [loading, setLoading] = useState(true);

  // Sincronizando com o Bunker (Supabase) ao iniciar uplink
  useEffect(() => {
    if (!channelId || !user) return;

    (async () => {
      setLoading(true);
      const { data, error } = await (supabase.from as any)("production_states")
        .select("*")
        .eq("channel_id", channelId)
        .maybeSingle();

      if (data && !error) {
        setState(data as ProductionState);
      } else {
        setState({ channel_id: channelId, ...INITIAL });
      }
      setLoading(false);
    })();
  }, [channelId, user]);

  // Monitoramento de Canal em Tempo Real
  useEffect(() => {
    if (!channelId) return;

    const channel = supabase
      .channel(`production-state-${channelId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "production_states",
        filter: `channel_id=eq.${channelId}`,
      }, (payload: any) => {
        if (payload.eventType === "DELETE") {
          setState({ channel_id: channelId, ...INITIAL });
        } else {
          setState(payload.new as ProductionState);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [channelId]);

  /** Persistência Completa: Upsert no banco de dados tático */
  const save = useCallback(async (updates: Partial<Omit<ProductionState, "channel_id">>) => {
    if (!channelId || !user) return;

    const merged: ProductionState = {
      ...(state ?? { channel_id: channelId, ...INITIAL }),
      ...updates,
      channel_id: channelId,
      data: { ...(state?.data ?? {}), ...(updates.data ?? {}) },
      updated_at: new Date().toISOString(),
    };

    setState(merged);

    await (supabase.from as any)("production_states").upsert(
      { ...merged, user_id: user.id },
      { onConflict: "channel_id" }
    );
  }, [channelId, user, state]);

  /** Atualização de Segmento: Salva dados sem sobrescrever o progresso total */
  const saveData = useCallback(async (
    step: number,
    status: ProductionState["status"],
    patch: Partial<ProductionStateData>,
  ) => {
    await save({ step, status, data: patch });
  }, [save]);

  /** Atualiza o snapshot de uma cena específica para Auto-Resume granular */
  const saveScene = useCallback(async (patch: SceneSnapshot, totalScenes?: number) => {
    if (!channelId || !user) return;

    const currentScenes: SceneSnapshot[] = state?.scenes ?? [];
    const idx = currentScenes.findIndex(
      s => s.chapterIndex === patch.chapterIndex && s.sceneIndex === patch.sceneIndex
    );
    const updatedScenes = idx >= 0
      ? currentScenes.map((s, i) => i === idx ? { ...s, ...patch } : s)
      : [...currentScenes, patch];

    const completed = updatedScenes.filter(s => s.status === "complete").length;
    const total = totalScenes ?? state?.total_scenes ?? updatedScenes.length;

    await save({
      scenes: updatedScenes as unknown as ProductionState["scenes"],
      total_scenes: total,
      completed_scenes: completed,
    } as Partial<Omit<ProductionState, "channel_id">>);
  }, [channelId, user, state, save]);

  /** Reinicializar Missão (Limpeza de rastro) */
  const reset = useCallback(async () => {
    await save({ step: 1, status: "idle", data: {}, scenes: [], total_scenes: 0, completed_scenes: 0 });
  }, [save]);

  return { state, loading, save, saveData, saveScene, reset };
}
