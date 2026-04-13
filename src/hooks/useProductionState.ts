/**
 * useProductionState — Protocolo de Persistência de Missão.
 * Garante que o estado da fábrica sobreviva a falhas críticas (F5/Crash).
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface SceneSnapshot {
  chapterIndex: number;
  sceneIndex: number;
  status: "pending" | "processing" | "audio_done" | "visual_done" | "complete" | "error" | "processing_audio" | "processing_visuals";
  audioUrl?: string;
  imageUrl?: string;
  durationSec?: number;
  prompt?: string;
  errorMessage?: string;
  errorCount?: number;
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
  const stateRef = useRef<ProductionState | null>(null);
  const [loading, setLoading] = useState(true);

  stateRef.current = state;

  const fetchState = useCallback(async () => {
    if (!channelId || !user) return;
    setLoading(true);
    const { data, error } = await (supabase.from as any)("production_states")
      .select("*")
      .eq("channel_id", channelId)
      .maybeSingle();

    if (error) {
      console.error("[useProductionState] Falha ao carregar estado do pipeline:", error.message);
      setState(null);
    } else if (data) {
      setState(data as ProductionState);
    } else {
      setState({ channel_id: channelId, ...INITIAL });
    }
    setLoading(false);
  }, [channelId, user]);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

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

  const save = useCallback(async (updates: Partial<Omit<ProductionState, "channel_id">>) => {
    if (!channelId || !user) return;

    const currentState = stateRef.current;
    const merged: ProductionState = {
      ...(currentState ?? { channel_id: channelId, ...INITIAL }),
      ...updates,
      channel_id: channelId,
      data: { ...(currentState?.data ?? {}), ...(updates.data ?? {}) },
      updated_at: new Date().toISOString(),
    };

    setState(merged);
    stateRef.current = merged;

    await (supabase.from as any)("production_states").upsert(
      { ...merged, user_id: user.id },
      { onConflict: "channel_id" }
    );
  }, [channelId, user]);

  const saveData = useCallback(async (
    step: number,
    status: ProductionState["status"],
    patch: Partial<ProductionStateData>,
  ) => {
    await save({ step, status, data: patch });
  }, [save]);

  /** Atualiza o snapshot de uma cena específica */
  const saveScene = useCallback(async (patch: SceneSnapshot, totalScenes?: number) => {
    if (!channelId || !user) return;

    const currentState = stateRef.current;
    const currentScenes: SceneSnapshot[] = currentState?.scenes ?? [];
    const idx = currentScenes.findIndex(
      s => s.chapterIndex === patch.chapterIndex && s.sceneIndex === patch.sceneIndex
    );
    const updatedScenes = idx >= 0
      ? currentScenes.map((s, i) => i === idx ? { ...s, ...patch } : s)
      : [...currentScenes, patch];

    const completed = updatedScenes.filter(s => s.status === "complete" || s.status === "visual_done").length;
    const total = totalScenes ?? currentState?.total_scenes ?? updatedScenes.length;

    await save({
      scenes: updatedScenes as unknown as ProductionState["scenes"],
      total_scenes: total,
      completed_scenes: completed,
    });
  }, [channelId, user, save]);

  /** Salva todas as cenas de uma vez (Batch Update) */
  const saveAllScenes = useCallback(async (allScenes: SceneSnapshot[]) => {
    if (!channelId || !user) return;

    await save({
      scenes: allScenes as any,
      total_scenes: allScenes.length,
      completed_scenes: allScenes.filter(s => s.status === "complete" || s.status === "visual_done").length,
    });
  }, [channelId, user, save]);

  const reset = useCallback(async () => {
    await save({ step: 1, status: "idle", data: {}, scenes: [], total_scenes: 0, completed_scenes: 0 });
  }, [save]);

  return { state, loading, refetch: fetchState, save, saveData, saveScene, saveAllScenes, reset };
}
