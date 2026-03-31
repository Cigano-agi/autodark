import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getFriendlyErrorMessage } from "@/utils/errorHandler";
import { toast } from "sonner";

export interface VisualSignature {
  palette: string;
  music_style: string;
  font: string;
  voice_tone: string;
}

export interface HardwareProfile {
  gpu_vram_gb: number;
  ram_gb: number;
  has_nvenc: boolean;
}

export interface SeedChannel {
  channel_id: string;
  name: string;
  pillar: string;
}

export interface QualitySystem {
  checks: string[];
  pass_score: number;
}

export interface PublishSchedule {
  days: string[];
  time_utc: string;
}

export interface ChannelFoundation {
  id?: string;
  channel_id: string;
  // Bloco A
  niche: string;
  insider_angle: string;
  narrative_enemy: string;
  channel_name_rationale: string;
  visual_signature: VisualSignature;
  // Bloco B
  publish_frequency: string;
  target_duration_min: number;
  sub_niches: string[];
  primary_language: string;
  monetization_model: string[];
  // Bloco C
  hardware_profile: HardwareProfile;
  monthly_api_budget: number;
  required_apis: string[];
  voice_cloning: boolean;
  evidence_strategy: string;
  // Bloco D
  seed_channels: SeedChannel[];
  rss_feeds: string[];
  z_score_threshold: number;
  narrative_structure: string;
  quality_system: QualitySystem;
  // Bloco E
  publish_schedule: PublishSchedule;
  feedback_loop: string;
  scaling_plan: string;
  operational_risks: string;
  defensive_moat: string;
  // Meta
  is_complete?: boolean;
  generated_directives?: Record<string, string>;
  directives_generated_at?: string;
}

export const FOUNDATION_DEFAULTS: Omit<ChannelFoundation, "channel_id"> = {
  niche: "",
  insider_angle: "",
  narrative_enemy: "",
  channel_name_rationale: "",
  visual_signature: { palette: "", music_style: "", font: "", voice_tone: "" },
  publish_frequency: "2x_week",
  target_duration_min: 12,
  sub_niches: [],
  primary_language: "en",
  monetization_model: [],
  hardware_profile: { gpu_vram_gb: 4, ram_gb: 32, has_nvenc: true },
  monthly_api_budget: 150,
  required_apis: [],
  voice_cloning: true,
  evidence_strategy: "mix",
  seed_channels: [],
  rss_feeds: [],
  z_score_threshold: 2.5,
  narrative_structure: "",
  quality_system: { checks: [], pass_score: 8 },
  publish_schedule: { days: ["tuesday", "thursday"], time_utc: "18:00" },
  feedback_loop: "",
  scaling_plan: "",
  operational_risks: "",
  defensive_moat: "",
  is_complete: false,
};

export function useChannelFoundation(channelId: string) {
  return useQuery({
    queryKey: ["channel_foundation", channelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("channel_foundation")
        .select("*")
        .eq("channel_id", channelId)
        .maybeSingle();
      if (error) throw error;
      return data as ChannelFoundation | null;
    },
    enabled: !!channelId,
  });
}

export function useSaveFoundation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (foundation: ChannelFoundation) => {
      const { data: existing } = await supabase
        .from("channel_foundation")
        .select("id")
        .eq("channel_id", foundation.channel_id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("channel_foundation")
          .update(foundation)
          .eq("channel_id", foundation.channel_id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("channel_foundation")
          .insert(foundation);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["channel_foundation", vars.channel_id] });
      toast.success("Fundação salva.");
    },
    onError: (error: Error) => toast.error(getFriendlyErrorMessage(error, "ao salvar as fundações do canal")),
  });
}

export function useGenerateDirectives() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (channelId: string) => {
      const { data, error } = await supabase.functions.invoke("generate-directives", {
        body: { channel_id: channelId },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data.directives as Record<string, string>;
    },
    onSuccess: (_, channelId) => {
      qc.invalidateQueries({ queryKey: ["channel_foundation", channelId] });
      toast.success("Diretivas geradas com sucesso!");
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });
}
