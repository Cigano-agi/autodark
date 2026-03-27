import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TopicStatus = "pending" | "approved" | "rejected" | "scripted";
export type ScriptStatus = "pending" | "approved" | "rejected";
export type UploadStatus = "queued" | "running" | "completed" | "failed";

export type PipelineStage =
  | "voice"
  | "time_master"
  | "video_analyzer"
  | "evidence"
  | "flux"
  | "frame_composer"
  | "wan"
  | "wan_intro"
  | "opening"
  | "assembly"
  | "upload";

export interface Topic {
  id: string;
  title: string;
  video_id: string | null;
  z_score: number | null;
  vph: number | null;
  pillar: string | null;
  status: string | null;
  channel_ref: string | null;
  created_at: string | null;
}

export interface PipelineScript {
  id: string;
  topic_id: string | null;
  status: string | null;
  score: number | null;
  failed_checks: string[] | null;
  script_text: string | null;
  script_hash: string | null;
  model_used: string | null;
  created_at: string | null;
  topics?: Topic;
}

export interface VideoUpload {
  id: string;
  script_id: string | null;
  youtube_video_id: string | null;
  title: string | null;
  status: string | null;
  pipeline_stage: string | null;
  pipeline_progress: Record<string, boolean> | null;
  cost_breakdown: Record<string, number> | null;
  upload_timestamp: string | null;
  error_message: string | null;
  pipeline_scripts?: PipelineScript;
}

// ─── Etapas do pipeline (ordem e labels) ─────────────────────────────────────

export const PIPELINE_STEPS: { key: PipelineStage; label: string; script: string }[] = [
  { key: "voice",         label: "Voz (TTS)",          script: "voice_producer.py" },
  { key: "time_master",   label: "Sincronização",       script: "time_master.py" },
  { key: "video_analyzer",label: "Análise de Vídeo",    script: "video_analyzer.py" },
  { key: "evidence",      label: "Evidências",          script: "evidence_collector.py" },
  { key: "flux",          label: "Imagens FLUX",        script: "flux_agent.py" },
  { key: "frame_composer",label: "Composição de Frames",script: "frame_composer.py" },
  { key: "wan",           label: "Hooks Animados",      script: "wan_agent.py" },
  { key: "wan_intro",     label: "Abertura (Veo 2)",    script: "wan_intro_agent.py" },
  { key: "opening",       label: "Montagem Abertura",   script: "opening_agent.py" },
  { key: "assembly",      label: "Montagem Final",      script: "assembly_agent.py" },
  { key: "upload",        label: "Upload YouTube",      script: "publisher_agent.py" },
];

// ─── Topics ───────────────────────────────────────────────────────────────────

export function useTopics(status?: TopicStatus) {
  return useQuery({
    queryKey: ["topics", status],
    queryFn: async () => {
      let q = supabase
        .from("topics")
        .select("*")
        .order("z_score", { ascending: false });
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return data as Topic[];
    },
  });
}

export function useUpdateTopicStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TopicStatus }) => {
      const { error } = await supabase
        .from("topics")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      qc.invalidateQueries({ queryKey: ["topics"] });
      toast.success(status === "approved" ? "Tópico aprovado!" : "Tópico rejeitado.");
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });
}

// ─── Pipeline Scripts ─────────────────────────────────────────────────────────

export function usePipelineScripts(status?: ScriptStatus) {
  return useQuery({
    queryKey: ["pipeline_scripts", status],
    queryFn: async () => {
      let q = supabase
        .from("pipeline_scripts")
        .select("*, topics(*)")
        .order("created_at", { ascending: false });
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return data as PipelineScript[];
    },
  });
}

export function useUpdateScriptStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ScriptStatus }) => {
      const { error } = await supabase
        .from("pipeline_scripts")
        .update({ status })
        .eq("id", id);
      if (error) throw error;

      // Se aprovado, cria o registro em video_uploads (inicia job queue)
      if (status === "approved") {
        const { error: uploadErr } = await supabase
          .from("video_uploads")
          .insert({ script_id: id, status: "queued", pipeline_stage: "voice" });
        if (uploadErr) throw uploadErr;
      }
    },
    onSuccess: (_, { status }) => {
      qc.invalidateQueries({ queryKey: ["pipeline_scripts"] });
      qc.invalidateQueries({ queryKey: ["video_uploads"] });
      if (status === "approved") {
        toast.success("Roteiro aprovado! Pipeline na fila.");
      } else {
        toast.info("Roteiro rejeitado.");
      }
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });
}

// ─── Video Uploads (Pipeline Status) ─────────────────────────────────────────

export function useVideoUploads() {
  return useQuery({
    queryKey: ["video_uploads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("video_uploads")
        .select("*, pipeline_scripts(*, topics(*))")
        .order("upload_timestamp", { ascending: false, nullsFirst: true });
      if (error) throw error;
      return data as VideoUpload[];
    },
  });
}

export function useVideoUpload(id: string) {
  return useQuery({
    queryKey: ["video_uploads", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("video_uploads")
        .select("*, pipeline_scripts(*, topics(*))")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as VideoUpload;
    },
    enabled: !!id,
    refetchInterval: 10_000, // poll a cada 10s quando ativo
  });
}

// ─── Realtime subscription para status do pipeline ───────────────────────────

export function usePipelineRealtime() {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("pipeline_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "video_uploads" },
        () => qc.invalidateQueries({ queryKey: ["video_uploads"] })
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "topics" },
        () => qc.invalidateQueries({ queryKey: ["topics"] })
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pipeline_scripts" },
        () => qc.invalidateQueries({ queryKey: ["pipeline_scripts"] })
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [qc]);
}

// ─── Helper: status de cada etapa dado o pipeline_progress ───────────────────

export function getStepStatus(
  upload: VideoUpload,
  stepKey: PipelineStage
): "done" | "running" | "pending" | "error" {
  if (upload.status === "failed" && upload.pipeline_stage === stepKey) return "error";
  if (upload.pipeline_progress?.[stepKey]) return "done";
  if (upload.pipeline_stage === stepKey) return "running";
  const stepIdx = PIPELINE_STEPS.findIndex(s => s.key === stepKey);
  const currentIdx = PIPELINE_STEPS.findIndex(s => s.key === upload.pipeline_stage);
  if (stepIdx < currentIdx) return "done";
  return "pending";
}
