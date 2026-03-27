import { useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type LogStep =
  | "script_generation"
  | "image_generation"
  | "audio_generation"
  | "video_render"
  | "video_upload"
  | "export_capcut";

export type LogStatus = "started" | "running" | "success" | "error" | "skipped";

interface LogEntry {
  step_name: LogStep;
  status: LogStatus;
  message?: string;
  error_details?: string;
  metadata?: Record<string, unknown>;
}

export function useGenerationLogger(channelId: string | undefined) {
  const generationIdRef = useRef<string | null>(null);

  const setGenerationId = useCallback((id: string | null) => {
    generationIdRef.current = id;
  }, []);

  const log = useCallback(
    async (entry: LogEntry) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const row = {
          generation_id: generationIdRef.current,
          channel_id: channelId ?? null,
          user_id: user.id,
          step_name: entry.step_name,
          status: entry.status,
          message: entry.message ?? null,
          error_details: entry.error_details ?? null,
          metadata: entry.metadata ?? {},
        };

        await supabase.from("generation_logs").insert(row);
      } catch (err) {
        console.warn("[generation-logger] failed to persist log:", err);
      }
    },
    [channelId],
  );

  const logStep = useCallback(
    (step: LogStep, status: LogStatus, message?: string, extra?: { error_details?: string; metadata?: Record<string, unknown> }) => {
      log({
        step_name: step,
        status,
        message,
        error_details: extra?.error_details,
        metadata: extra?.metadata,
      });
    },
    [log],
  );

  return { logStep, setGenerationId, generationIdRef };
}
