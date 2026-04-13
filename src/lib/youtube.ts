import { supabase } from "@/integrations/supabase/client";

export class YouTubeService {
  /**
   * Triggers the YouTube OAuth flow. 
   * Opens a popup for the user to authenticate the AutoDark app 
   * via GCP OAuth, returning an access token to Supabase.
   */
  static async requestOAuthAuthorization(channelId: string) {
    // In a real OAuth flow this redirects to Google consent screen
    // For now we simulate an edge function call to get the consent URL
    const { data, error } = await supabase.functions.invoke("youtube-publish", {
      body: { action: "get_auth_url", channelId },
    });
    
    if (error) throw new Error("Failed to initialize YouTube auth: " + error.message);
    if (data?.url) {
      window.open(data.url, "_blank", "width=500,height=600");
    }
  }

  /**
   * Uploads a finished video to YouTube.
   * Assumes the channel has valid OAuth tokens saved in the `channels` table 
   * or securely stored in Supabase Vault.
   */
  static async publishVideo(params: {
    channelId: string;
    contentId: string;
    videoUrl: string; // The composed MP4 location in storage
    title: string;
    description: string;
    tags: string[];
    privacyStatus?: "public" | "private" | "unlisted";
  }) {
    // Trigger Edge Function to stream the content from Supabase Storage -> YouTube API
    const { data, error } = await supabase.functions.invoke("youtube-publish", {
      body: {
        action: "upload_video",
        channelId: params.channelId,
        contentId: params.contentId,
        videoUrl: params.videoUrl,
        metadata: {
          snippet: {
            title: params.title,
            description: params.description,
            tags: params.tags,
            categoryId: "22", // Default "People & Blogs"
          },
          status: {
            privacyStatus: params.privacyStatus || "private",
          }
        }
      },
    });

    if (error) {
      console.error("[YouTubeService] Pulish Error:", error);
      throw new Error("Falha ao publicar no YouTube: " + error.message);
    }

    return data;
  }
}
