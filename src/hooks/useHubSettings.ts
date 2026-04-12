import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface HubSettings {
  voice_provider: string;
  voice_id: string;
  slides_image_provider: string;
  thumb_image_provider: string;
  video_model: string;
}

const DEFAULTS: HubSettings = {
  voice_provider: "ai33",
  voice_id: "onyx",
  slides_image_provider: "kie_flux",
  thumb_image_provider: "kie_flux",
  video_model: "none",
};

/**
 * Reads/writes hub settings from channel_settings in the database.
 * Falls back to localStorage for backwards compatibility, then migrates to DB.
 */
export function useHubSettings(channelId: string | undefined) {
  const [settings, setSettings] = useState<HubSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!channelId) return;

    (async () => {
      setLoading(true);

      // Try to read from database
      const { data, error } = await (supabase.from as any)("channel_settings")
        .select("voice_id, voice_provider, slides_image_provider, thumb_image_provider, video_model")
        .eq("channel_id", channelId)
        .maybeSingle();

      if (data && !error) {
        setSettings({
          voice_provider: data.voice_provider ?? DEFAULTS.voice_provider,
          voice_id: data.voice_id ?? DEFAULTS.voice_id,
          slides_image_provider: data.slides_image_provider ?? DEFAULTS.slides_image_provider,
          thumb_image_provider: data.thumb_image_provider ?? DEFAULTS.thumb_image_provider,
          video_model: data.video_model ?? DEFAULTS.video_model,
        });
      } else {
        // Fallback: read from localStorage (legacy) and migrate
        try {
          const raw = localStorage.getItem("autodark_hub_defaults_v2");
          const all = raw ? JSON.parse(raw) : {};
          const legacy = all[channelId] || all["global"];
          if (legacy) {
            const migrated: HubSettings = {
              voice_provider: legacy.voice ?? DEFAULTS.voice_provider,
              voice_id: legacy.voiceId ?? DEFAULTS.voice_id,
              slides_image_provider: legacy.slidesImage ?? DEFAULTS.slides_image_provider,
              thumb_image_provider: legacy.thumbImage ?? DEFAULTS.thumb_image_provider,
              video_model: legacy.videoModel ?? DEFAULTS.video_model,
            };
            setSettings(migrated);
          }
        } catch {
          // Use defaults
        }
      }

      setLoading(false);
    })();
  }, [channelId]);

  const save = useCallback(async (updates: Partial<HubSettings>) => {
    if (!channelId) return;
    const merged = { ...settings, ...updates };
    setSettings(merged);

    // Upsert to database
    const { error } = await (supabase.from as any)("channel_settings")
      .upsert({
        channel_id: channelId,
        voice_id: merged.voice_id,
        voice_provider: merged.voice_provider,
        slides_image_provider: merged.slides_image_provider,
        thumb_image_provider: merged.thumb_image_provider,
        video_model: merged.video_model,
        updated_at: new Date().toISOString(),
      }, { onConflict: "channel_id" });

    if (error) {
      console.error("[useHubSettings] Save failed:", error.message);
    }
  }, [channelId, settings]);

  return { settings, save, loading };
}

/** Convert HubSettings to the legacy HubDefaults format used by agents */
export function toHubDefaults(s: HubSettings) {
  return {
    voice: s.voice_provider,
    voiceId: s.voice_id,
    slidesImage: s.slides_image_provider,
    thumbImage: s.thumb_image_provider,
    videoModel: s.video_model,
  };
}
