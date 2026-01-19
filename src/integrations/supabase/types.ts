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
          created_at: string
          id: string
          script_rules: string | null
          topic: string | null
          updated_at: string
          upload_frequency: string | null
          visual_style: string | null
          voice_id: string | null
          voice_name: string | null
        }
        Insert: {
          channel_id: string
          created_at?: string
          id?: string
          script_rules?: string | null
          topic?: string | null
          updated_at?: string
          upload_frequency?: string | null
          visual_style?: string | null
          voice_id?: string | null
          voice_name?: string | null
        }
        Update: {
          channel_id?: string
          created_at?: string
          id?: string
          script_rules?: string | null
          topic?: string | null
          updated_at?: string
          upload_frequency?: string | null
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
      channel_contents: {
        Row: {
          channel_id: string
          created_at: string
          id: string
          scheduled_date: string | null
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          channel_id: string
          created_at?: string
          id?: string
          scheduled_date?: string | null
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          channel_id?: string
          created_at?: string
          id?: string
          scheduled_date?: string | null
          status?: string | null
          title?: string
          updated_at?: string
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
      channel_metrics: {
        Row: {
          channel_id: string
          estimated_revenue: number | null
          id: string
          last_video_date: string | null
          last_video_views: number | null
          recorded_at: string
          rpm: number | null
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
      channels: {
        Row: {
          avatar_url: string | null
          created_at: string
          health: string | null
          id: string
          monthly_views: number | null
          name: string
          niche: string
          niche_color: string | null
          subscribers: number | null
          updated_at: string
          user_id: string
          youtube_access_token: string | null
          youtube_banner_url: string | null
          youtube_channel_id: string | null
          youtube_connected_at: string | null
          youtube_description: string | null
          youtube_joined_date: string | null
          youtube_refresh_token: string | null
          youtube_total_videos: number | null
          youtube_total_views: number | null
          youtube_username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          health?: string | null
          id?: string
          monthly_views?: number | null
          name: string
          niche: string
          niche_color?: string | null
          subscribers?: number | null
          updated_at?: string
          user_id: string
          youtube_access_token?: string | null
          youtube_banner_url?: string | null
          youtube_channel_id?: string | null
          youtube_connected_at?: string | null
          youtube_description?: string | null
          youtube_joined_date?: string | null
          youtube_refresh_token?: string | null
          youtube_total_videos?: number | null
          youtube_total_views?: number | null
          youtube_username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          health?: string | null
          id?: string
          monthly_views?: number | null
          name?: string
          niche?: string
          niche_color?: string | null
          subscribers?: number | null
          updated_at?: string
          user_id?: string
          youtube_access_token?: string | null
          youtube_banner_url?: string | null
          youtube_channel_id?: string | null
          youtube_connected_at?: string | null
          youtube_description?: string | null
          youtube_joined_date?: string | null
          youtube_refresh_token?: string | null
          youtube_total_videos?: number | null
          youtube_total_views?: number | null
          youtube_username?: string | null
        }
        Relationships: []
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
