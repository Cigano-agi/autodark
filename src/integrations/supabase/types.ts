export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      channel_blueprints: {
        Row: {
          channel_id: string
          char_limit: number | null
          character_consistency: boolean | null
          character_description: string | null
          created_at: string
          cta: string | null
          custom_music_url: string | null
          id: string
          persona_prompt: string | null
          reference: string | null
          scenes_image_ratio: number | null
          scenes_video_ratio: number | null
          script_rules: string | null
          style_reference_url: string | null
          target_audience: string | null
          topic: string | null
          updated_at: string
          upload_frequency: string | null
          videos_per_batch: number | null
          visual_style: string | null
          voice_id: string | null
          voice_name: string | null
        }
        Insert: {
          channel_id: string
          char_limit?: number | null
          character_consistency?: boolean | null
          character_description?: string | null
          created_at?: string
          cta?: string | null
          custom_music_url?: string | null
          id?: string
          persona_prompt?: string | null
          reference?: string | null
          scenes_image_ratio?: number | null
          scenes_video_ratio?: number | null
          script_rules?: string | null
          style_reference_url?: string | null
          target_audience?: string | null
          topic?: string | null
          updated_at?: string
          upload_frequency?: string | null
          videos_per_batch?: number | null
          visual_style?: string | null
          voice_id?: string | null
          voice_name?: string | null
        }
        Update: {
          channel_id?: string
          char_limit?: number | null
          character_consistency?: boolean | null
          character_description?: string | null
          created_at?: string
          cta?: string | null
          custom_music_url?: string | null
          id?: string
          persona_prompt?: string | null
          reference?: string | null
          scenes_image_ratio?: number | null
          scenes_video_ratio?: number | null
          script_rules?: string | null
          style_reference_url?: string | null
          target_audience?: string | null
          topic?: string | null
          updated_at?: string
          upload_frequency?: string | null
          videos_per_batch?: number | null
          visual_style?: string | null
          voice_id?: string | null
          voice_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "channel_blueprints_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: true
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_competitors: {
        Row: {
          avg_views: number | null
          channel_id: string
          created_at: string | null
          growth: string | null
          handle: string
          id: string
          last_video: string | null
          last_video_date: string | null
          name: string
          niche: string | null
          subscribers: number | null
          tracking: boolean | null
          updated_at: string | null
          upload_frequency: string | null
          youtube_channel_id: string | null
          youtube_url: string | null
        }
        Insert: {
          avg_views?: number | null
          channel_id: string
          created_at?: string | null
          growth?: string | null
          handle: string
          id?: string
          last_video?: string | null
          last_video_date?: string | null
          name: string
          niche?: string | null
          subscribers?: number | null
          tracking?: boolean | null
          updated_at?: string | null
          upload_frequency?: string | null
          youtube_channel_id?: string | null
          youtube_url?: string | null
        }
        Update: {
          avg_views?: number | null
          channel_id?: string
          created_at?: string | null
          growth?: string | null
          handle?: string
          id?: string
          last_video?: string | null
          last_video_date?: string | null
          name?: string
          niche?: string | null
          subscribers?: number | null
          tracking?: boolean | null
          updated_at?: string | null
          upload_frequency?: string | null
          youtube_channel_id?: string | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "channel_competitors_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_contents: {
        Row: {
          angle: string | null
          approved_at: string | null
          audio_duration: number | null
          audio_path: string | null
          audio_url: string | null
          channel_id: string
          character: string | null
          created_at: string
          error_log: string | null
          hook: string | null
          id: string
          narration_script: string | null
          nicho_slug: string | null
          reference: string | null
          render_status: string | null
          scenes: Json | null
          scheduled_date: string | null
          script: string | null
          slide_images: Json | null
          slide_script: Json | null
          srt_url: string | null
          ssml_cache: string | null
          status: string | null
          subtitle_path: string | null
          thumbnail_path: string | null
          thumbnail_prompt: string | null
          thumbnail_url: string | null
          title: string
          topic: string | null
          tts_task_id: string | null
          updated_at: string
          video_duration: number | null
          video_path: string | null
          voice_name: string | null
        }
        Insert: {
          angle?: string | null
          approved_at?: string | null
          audio_duration?: number | null
          audio_path?: string | null
          audio_url?: string | null
          channel_id: string
          character?: string | null
          created_at?: string
          error_log?: string | null
          hook?: string | null
          id?: string
          narration_script?: string | null
          nicho_slug?: string | null
          reference?: string | null
          render_status?: string | null
          scenes?: Json | null
          scheduled_date?: string | null
          script?: string | null
          slide_images?: Json | null
          slide_script?: Json | null
          srt_url?: string | null
          ssml_cache?: string | null
          status?: string | null
          subtitle_path?: string | null
          thumbnail_path?: string | null
          thumbnail_prompt?: string | null
          thumbnail_url?: string | null
          title: string
          topic?: string | null
          tts_task_id?: string | null
          updated_at?: string
          video_duration?: number | null
          video_path?: string | null
          voice_name?: string | null
        }
        Update: {
          angle?: string | null
          approved_at?: string | null
          audio_duration?: number | null
          audio_path?: string | null
          audio_url?: string | null
          channel_id?: string
          character?: string | null
          created_at?: string
          error_log?: string | null
          hook?: string | null
          id?: string
          narration_script?: string | null
          nicho_slug?: string | null
          reference?: string | null
          render_status?: string | null
          scenes?: Json | null
          scheduled_date?: string | null
          script?: string | null
          slide_images?: Json | null
          slide_script?: Json | null
          srt_url?: string | null
          ssml_cache?: string | null
          status?: string | null
          subtitle_path?: string | null
          thumbnail_path?: string | null
          thumbnail_prompt?: string | null
          thumbnail_url?: string | null
          title?: string
          topic?: string | null
          tts_task_id?: string | null
          updated_at?: string
          video_duration?: number | null
          video_path?: string | null
          voice_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "channel_contents_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_foundation: {
        Row: {
          channel_id: string
          channel_name_rationale: string | null
          created_at: string | null
          defensive_moat: string | null
          directives_generated_at: string | null
          evidence_strategy: string | null
          feedback_loop: string | null
          generated_directives: Json | null
          hardware_profile: Json | null
          id: string
          insider_angle: string | null
          is_complete: boolean | null
          monetization_model: string[] | null
          monthly_api_budget: number | null
          narrative_enemy: string | null
          narrative_structure: string | null
          niche: string | null
          operational_risks: string | null
          primary_language: string | null
          publish_frequency: string | null
          publish_schedule: Json | null
          quality_system: Json | null
          required_apis: string[] | null
          rss_feeds: string[] | null
          scaling_plan: string | null
          seed_channels: Json | null
          sub_niches: string[] | null
          target_duration_min: number | null
          updated_at: string | null
          visual_signature: Json | null
          voice_cloning: boolean | null
          z_score_threshold: number | null
        }
        Insert: {
          channel_id: string
          channel_name_rationale?: string | null
          created_at?: string | null
          defensive_moat?: string | null
          directives_generated_at?: string | null
          evidence_strategy?: string | null
          feedback_loop?: string | null
          generated_directives?: Json | null
          hardware_profile?: Json | null
          id?: string
          insider_angle?: string | null
          is_complete?: boolean | null
          monetization_model?: string[] | null
          monthly_api_budget?: number | null
          narrative_enemy?: string | null
          narrative_structure?: string | null
          niche?: string | null
          operational_risks?: string | null
          primary_language?: string | null
          publish_frequency?: string | null
          publish_schedule?: Json | null
          quality_system?: Json | null
          required_apis?: string[] | null
          rss_feeds?: string[] | null
          scaling_plan?: string | null
          seed_channels?: Json | null
          sub_niches?: string[] | null
          target_duration_min?: number | null
          updated_at?: string | null
          visual_signature?: Json | null
          voice_cloning?: boolean | null
          z_score_threshold?: number | null
        }
        Update: {
          channel_id?: string
          channel_name_rationale?: string | null
          created_at?: string | null
          defensive_moat?: string | null
          directives_generated_at?: string | null
          evidence_strategy?: string | null
          feedback_loop?: string | null
          generated_directives?: Json | null
          hardware_profile?: Json | null
          id?: string
          insider_angle?: string | null
          is_complete?: boolean | null
          monetization_model?: string[] | null
          monthly_api_budget?: number | null
          narrative_enemy?: string | null
          narrative_structure?: string | null
          niche?: string | null
          operational_risks?: string | null
          primary_language?: string | null
          publish_frequency?: string | null
          publish_schedule?: Json | null
          quality_system?: Json | null
          required_apis?: string[] | null
          rss_feeds?: string[] | null
          scaling_plan?: string | null
          seed_channels?: Json | null
          sub_niches?: string[] | null
          target_duration_min?: number | null
          updated_at?: string | null
          visual_signature?: Json | null
          voice_cloning?: boolean | null
          z_score_threshold?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "channel_foundation_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: true
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_metrics: {
        Row: {
          channel_id: string
          estimated_revenue: number | null
          id: string
          last_video_date: string | null
          last_video_views: number | null
          recorded_at: string
          rpm: number | null
          video_thumbnail: string | null
          video_title: string | null
          video_url: string | null
          views: number | null
          watch_time_minutes: number | null
        }
        Insert: {
          channel_id: string
          estimated_revenue?: number | null
          id?: string
          last_video_date?: string | null
          last_video_views?: number | null
          recorded_at?: string
          rpm?: number | null
          video_thumbnail?: string | null
          video_title?: string | null
          video_url?: string | null
          views?: number | null
          watch_time_minutes?: number | null
        }
        Update: {
          channel_id?: string
          estimated_revenue?: number | null
          id?: string
          last_video_date?: string | null
          last_video_views?: number | null
          recorded_at?: string
          rpm?: number | null
          video_thumbnail?: string | null
          video_title?: string | null
          video_url?: string | null
          views?: number | null
          watch_time_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "channel_metrics_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_prompts: {
        Row: {
          channel_id: string
          content_type: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          prompt_template: string
          updated_at: string | null
          variables: Json | null
        }
        Insert: {
          channel_id: string
          content_type?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          prompt_template: string
          updated_at?: string | null
          variables?: Json | null
        }
        Update: {
          channel_id?: string
          content_type?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          prompt_template?: string
          updated_at?: string | null
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "channel_prompts_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_settings: {
        Row: {
          channel_id: string
          character_enabled: boolean | null
          character_image_url: string | null
          created_at: string | null
          custom_notes: string | null
          id: string
          scene_video_ratio: number | null
          style: string | null
          style_reference_url: string | null
          updated_at: string | null
          voice_id: string | null
        }
        Insert: {
          channel_id: string
          character_enabled?: boolean | null
          character_image_url?: string | null
          created_at?: string | null
          custom_notes?: string | null
          id?: string
          scene_video_ratio?: number | null
          style?: string | null
          style_reference_url?: string | null
          updated_at?: string | null
          voice_id?: string | null
        }
        Update: {
          channel_id?: string
          character_enabled?: boolean | null
          character_image_url?: string | null
          created_at?: string | null
          custom_notes?: string | null
          id?: string
          scene_video_ratio?: number | null
          style?: string | null
          style_reference_url?: string | null
          updated_at?: string | null
          voice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "channel_settings_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: true
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          avatar_url: string | null
          created_at: string
          health: string | null
          id: string
          last_scraped_at: string | null
          monthly_views: number | null
          name: string
          niche: string
          niche_color: string | null
          requires_review: boolean | null
          subscribers: number | null
          updated_at: string
          user_id: string
          whatsapp_connected: boolean | null
          whatsapp_connected_at: string | null
          whatsapp_instance_id: string | null
          whatsapp_phone: string | null
          youtube_access_token: string | null
          youtube_banner_url: string | null
          youtube_channel_id: string | null
          youtube_connected_at: string | null
          youtube_description: string | null
          youtube_id: string | null
          youtube_joined_date: string | null
          youtube_refresh_token: string | null
          youtube_total_videos: number | null
          youtube_total_views: number | null
          youtube_uploads_playlist_id: string | null
          youtube_username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          health?: string | null
          id?: string
          last_scraped_at?: string | null
          monthly_views?: number | null
          name: string
          niche: string
          niche_color?: string | null
          requires_review?: boolean | null
          subscribers?: number | null
          updated_at?: string
          user_id: string
          whatsapp_connected?: boolean | null
          whatsapp_connected_at?: string | null
          whatsapp_instance_id?: string | null
          whatsapp_phone?: string | null
          youtube_access_token?: string | null
          youtube_banner_url?: string | null
          youtube_channel_id?: string | null
          youtube_connected_at?: string | null
          youtube_description?: string | null
          youtube_id?: string | null
          youtube_joined_date?: string | null
          youtube_refresh_token?: string | null
          youtube_total_videos?: number | null
          youtube_total_views?: number | null
          youtube_uploads_playlist_id?: string | null
          youtube_username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          health?: string | null
          id?: string
          last_scraped_at?: string | null
          monthly_views?: number | null
          name?: string
          niche?: string
          niche_color?: string | null
          requires_review?: boolean | null
          subscribers?: number | null
          updated_at?: string
          user_id?: string
          whatsapp_connected?: boolean | null
          whatsapp_connected_at?: string | null
          whatsapp_instance_id?: string | null
          whatsapp_phone?: string | null
          youtube_access_token?: string | null
          youtube_banner_url?: string | null
          youtube_channel_id?: string | null
          youtube_connected_at?: string | null
          youtube_description?: string | null
          youtube_id?: string | null
          youtube_joined_date?: string | null
          youtube_refresh_token?: string | null
          youtube_total_videos?: number | null
          youtube_total_views?: number | null
          youtube_uploads_playlist_id?: string | null
          youtube_username?: string | null
        }
        Relationships: []
      }
      characters: {
        Row: {
          created_at: string | null
          group_name: string | null
          id: string
          name: string
          organization: string | null
          power: string | null
          season_name: string | null
          season_number: number | null
        }
        Insert: {
          created_at?: string | null
          group_name?: string | null
          id?: string
          name: string
          organization?: string | null
          power?: string | null
          season_name?: string | null
          season_number?: number | null
        }
        Update: {
          created_at?: string | null
          group_name?: string | null
          id?: string
          name?: string
          organization?: string | null
          power?: string | null
          season_name?: string | null
          season_number?: number | null
        }
        Relationships: []
      }
      content_ideas: {
        Row: {
          channel_id: string | null
          concept: string | null
          created_at: string | null
          id: string
          reasoning: string | null
          score: number | null
          status: string | null
          title: string
        }
        Insert: {
          channel_id?: string | null
          concept?: string | null
          created_at?: string | null
          id?: string
          reasoning?: string | null
          score?: number | null
          status?: string | null
          title: string
        }
        Update: {
          channel_id?: string | null
          concept?: string | null
          created_at?: string | null
          id?: string
          reasoning?: string | null
          score?: number | null
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_ideas_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_logs: {
        Row: {
          channel_id: string | null
          created_at: string | null
          error_details: string | null
          generation_id: string | null
          id: string
          message: string | null
          metadata: Json | null
          status: string
          step_name: string
          user_id: string | null
        }
        Insert: {
          channel_id?: string | null
          created_at?: string | null
          error_details?: string | null
          generation_id?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          status?: string
          step_name: string
          user_id?: string | null
        }
        Update: {
          channel_id?: string | null
          created_at?: string | null
          error_details?: string | null
          generation_id?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          status?: string
          step_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generation_logs_generation_id_fkey"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "video_generations"
            referencedColumns: ["id"]
          },
        ]
      }
      intelligence_scans: {
        Row: {
          channel_id: string
          id: string
          pillar: string | null
          published_at: string | null
          scanned_at: string | null
          title: string | null
          video_id: string
          views: number | null
          vph: number | null
          z_score: number | null
        }
        Insert: {
          channel_id: string
          id?: string
          pillar?: string | null
          published_at?: string | null
          scanned_at?: string | null
          title?: string | null
          video_id: string
          views?: number | null
          vph?: number | null
          z_score?: number | null
        }
        Update: {
          channel_id?: string
          id?: string
          pillar?: string | null
          published_at?: string | null
          scanned_at?: string | null
          title?: string | null
          video_id?: string
          views?: number | null
          vph?: number | null
          z_score?: number | null
        }
        Relationships: []
      }
      long_video_contents: {
        Row: {
          channel_id: string | null
          created_at: string | null
          description: string | null
          full_audio_path: string | null
          id: string
          scenes: Json | null
          status: string | null
          tags: string | null
          title: string | null
          video_path: string | null
        }
        Insert: {
          channel_id?: string | null
          created_at?: string | null
          description?: string | null
          full_audio_path?: string | null
          id?: string
          scenes?: Json | null
          status?: string | null
          tags?: string | null
          title?: string | null
          video_path?: string | null
        }
        Update: {
          channel_id?: string | null
          created_at?: string | null
          description?: string | null
          full_audio_path?: string | null
          id?: string
          scenes?: Json | null
          status?: string | null
          tags?: string | null
          title?: string | null
          video_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "long_video_contents_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_scripts: {
        Row: {
          created_at: string | null
          failed_checks: string[] | null
          id: string
          model_used: string | null
          score: number | null
          script_hash: string | null
          script_text: string | null
          status: string | null
          topic_id: string | null
        }
        Insert: {
          created_at?: string | null
          failed_checks?: string[] | null
          id?: string
          model_used?: string | null
          score?: number | null
          script_hash?: string | null
          script_text?: string | null
          status?: string | null
          topic_id?: string | null
        }
        Update: {
          created_at?: string | null
          failed_checks?: string[] | null
          id?: string
          model_used?: string | null
          score?: number | null
          script_hash?: string | null
          script_text?: string | null
          status?: string | null
          topic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_scripts_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          channel_ref: string | null
          created_at: string | null
          id: string
          pillar: string | null
          status: string | null
          title: string
          video_id: string | null
          vph: number | null
          z_score: number | null
        }
        Insert: {
          channel_ref?: string | null
          created_at?: string | null
          id?: string
          pillar?: string | null
          status?: string | null
          title: string
          video_id?: string | null
          vph?: number | null
          z_score?: number | null
        }
        Update: {
          channel_ref?: string | null
          created_at?: string | null
          id?: string
          pillar?: string | null
          status?: string | null
          title?: string
          video_id?: string | null
          vph?: number | null
          z_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "topics_channel_ref_fkey"
            columns: ["channel_ref"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      video_generations: {
        Row: {
          channel_id: string | null
          created_at: string | null
          duration_sec: number | null
          id: string
          scene_count: number | null
          script_data: Json
          status: string | null
          thumbnail_data: string | null
          title: string
          updated_at: string | null
          user_id: string | null
          video_url: string | null
          visual_prompts: Json | null
          youtube_description: string | null
          youtube_title: string | null
        }
        Insert: {
          channel_id?: string | null
          created_at?: string | null
          duration_sec?: number | null
          id?: string
          scene_count?: number | null
          script_data?: Json
          status?: string | null
          thumbnail_data?: string | null
          title: string
          updated_at?: string | null
          user_id?: string | null
          video_url?: string | null
          visual_prompts?: Json | null
          youtube_description?: string | null
          youtube_title?: string | null
        }
        Update: {
          channel_id?: string | null
          created_at?: string | null
          duration_sec?: number | null
          id?: string
          scene_count?: number | null
          script_data?: Json
          status?: string | null
          thumbnail_data?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
          video_url?: string | null
          visual_prompts?: Json | null
          youtube_description?: string | null
          youtube_title?: string | null
        }
        Relationships: []
      }
      video_performance_base: {
        Row: {
          ctr_48h: number | null
          id: string
          recorded_at: string | null
          retention_30s: number | null
          retention_60s: number | null
          video_id: string | null
        }
        Insert: {
          ctr_48h?: number | null
          id?: string
          recorded_at?: string | null
          retention_30s?: number | null
          retention_60s?: number | null
          video_id?: string | null
        }
        Update: {
          ctr_48h?: number | null
          id?: string
          recorded_at?: string | null
          retention_30s?: number | null
          retention_60s?: number | null
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_performance_base_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "video_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      video_uploads: {
        Row: {
          content_id: string | null
          cost_breakdown: Json | null
          error_message: string | null
          id: string
          pipeline_progress: Json | null
          pipeline_stage: string | null
          script_id: string | null
          status: string | null
          thumbnail_url: string | null
          title: string | null
          upload_timestamp: string | null
          youtube_video_id: string | null
        }
        Insert: {
          content_id?: string | null
          cost_breakdown?: Json | null
          error_message?: string | null
          id?: string
          pipeline_progress?: Json | null
          pipeline_stage?: string | null
          script_id?: string | null
          status?: string | null
          thumbnail_url?: string | null
          title?: string | null
          upload_timestamp?: string | null
          youtube_video_id?: string | null
        }
        Update: {
          content_id?: string | null
          cost_breakdown?: Json | null
          error_message?: string | null
          id?: string
          pipeline_progress?: Json | null
          pipeline_stage?: string | null
          script_id?: string | null
          status?: string | null
          thumbnail_url?: string | null
          title?: string | null
          upload_timestamp?: string | null
          youtube_video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_uploads_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "channel_contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_uploads_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "pipeline_scripts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      owns_channel: { Args: { _channel_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
