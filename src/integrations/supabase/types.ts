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
      event_projects: {
        Row: {
          billing_order: number
          event_id: string
          feature_order: number | null
          is_featured: boolean | null
          project_id: string
        }
        Insert: {
          billing_order?: number
          event_id: string
          feature_order?: number | null
          is_featured?: boolean | null
          project_id: string
        }
        Update: {
          billing_order?: number
          event_id?: string
          feature_order?: number | null
          is_featured?: boolean | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_projects_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          city: string | null
          created_at: string
          created_by: string
          description: string | null
          end_at: string | null
          hero_image_url: string | null
          id: string
          slug: string
          start_at: string
          status: Database["public"]["Enums"]["publish_status"]
          title: string
          updated_at: string
          venue_id: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          end_at?: string | null
          hero_image_url?: string | null
          id?: string
          slug: string
          start_at: string
          status?: Database["public"]["Enums"]["publish_status"]
          title: string
          updated_at?: string
          venue_id?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          end_at?: string | null
          hero_image_url?: string | null
          id?: string
          slug?: string
          start_at?: string
          status?: Database["public"]["Enums"]["publish_status"]
          title?: string
          updated_at?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      festival_events: {
        Row: {
          event_id: string
          festival_id: string
          is_featured: boolean | null
          show_in_program: boolean | null
          sort_order: number
        }
        Insert: {
          event_id: string
          festival_id: string
          is_featured?: boolean | null
          show_in_program?: boolean | null
          sort_order?: number
        }
        Update: {
          event_id?: string
          festival_id?: string
          is_featured?: boolean | null
          show_in_program?: boolean | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "festival_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "festival_events_festival_id_fkey"
            columns: ["festival_id"]
            isOneToOne: false
            referencedRelation: "festivals"
            referencedColumns: ["id"]
          },
        ]
      }
      festival_sections: {
        Row: {
          accent_override: string | null
          bg_image_url: string | null
          bg_mode: string
          content_json: Json | null
          created_at: string | null
          festival_id: string
          id: string
          is_enabled: boolean | null
          overlay_strength: number | null
          sort_order: number
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          accent_override?: string | null
          bg_image_url?: string | null
          bg_mode?: string
          content_json?: Json | null
          created_at?: string | null
          festival_id: string
          id?: string
          is_enabled?: boolean | null
          overlay_strength?: number | null
          sort_order?: number
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          accent_override?: string | null
          bg_image_url?: string | null
          bg_mode?: string
          content_json?: Json | null
          created_at?: string | null
          festival_id?: string
          id?: string
          is_enabled?: boolean | null
          overlay_strength?: number | null
          sort_order?: number
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "festival_sections_festival_id_fkey"
            columns: ["festival_id"]
            isOneToOne: false
            referencedRelation: "festivals"
            referencedColumns: ["id"]
          },
        ]
      }
      festivals: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          end_at: string | null
          id: string
          name: string
          slug: string
          start_at: string | null
          status: Database["public"]["Enums"]["publish_status"]
          theme_id: string | null
          updated_at: string
          venue_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          end_at?: string | null
          id?: string
          name: string
          slug: string
          start_at?: string | null
          status?: Database["public"]["Enums"]["publish_status"]
          theme_id?: string | null
          updated_at?: string
          venue_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          end_at?: string | null
          id?: string
          name?: string
          slug?: string
          start_at?: string | null
          status?: Database["public"]["Enums"]["publish_status"]
          theme_id?: string | null
          updated_at?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "festivals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "festivals_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "themes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "festivals_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      media: {
        Row: {
          alt_text: string | null
          created_at: string | null
          created_by: string
          description: string | null
          duration: number | null
          external_provider: string | null
          external_url: string | null
          file_type: string
          filename: string
          height: number | null
          id: string
          is_public: boolean | null
          mime_type: string
          original_filename: string
          original_size_bytes: number | null
          public_url: string
          size_bytes: number
          storage_path: string
          tags: string[] | null
          updated_at: string | null
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          duration?: number | null
          external_provider?: string | null
          external_url?: string | null
          file_type: string
          filename: string
          height?: number | null
          id?: string
          is_public?: boolean | null
          mime_type: string
          original_filename: string
          original_size_bytes?: number | null
          public_url: string
          size_bytes: number
          storage_path: string
          tags?: string[] | null
          updated_at?: string | null
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          duration?: number | null
          external_provider?: string | null
          external_url?: string | null
          file_type?: string
          filename?: string
          height?: number | null
          id?: string
          is_public?: boolean | null
          mime_type?: string
          original_filename?: string
          original_size_bytes?: number | null
          public_url?: string
          size_bytes?: number
          storage_path?: string
          tags?: string[] | null
          updated_at?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string
          display_name: string | null
          handle: string | null
          id: string
          slug: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          handle?: string | null
          id: string
          slug?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          handle?: string | null
          id?: string
          slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_members: {
        Row: {
          is_admin: boolean
          is_public: boolean
          joined_at: string
          left_at: string | null
          profile_id: string
          project_id: string
          role_label: string | null
        }
        Insert: {
          is_admin?: boolean
          is_public?: boolean
          joined_at?: string
          left_at?: string | null
          profile_id: string
          project_id: string
          role_label?: string | null
        }
        Update: {
          is_admin?: boolean
          is_public?: boolean
          joined_at?: string
          left_at?: string | null
          profile_id?: string
          project_id?: string
          role_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          hero_image_url: string | null
          id: string
          is_published: boolean
          name: string
          slug: string
          tagline: string | null
          type: Database["public"]["Enums"]["project_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          hero_image_url?: string | null
          id?: string
          is_published?: boolean
          name: string
          slug: string
          tagline?: string | null
          type: Database["public"]["Enums"]["project_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          hero_image_url?: string | null
          id?: string
          is_published?: boolean
          name?: string
          slug?: string
          tagline?: string | null
          type?: Database["public"]["Enums"]["project_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      social_assets: {
        Row: {
          caption_text: string | null
          created_at: string
          created_by: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["social_entity_type"]
          format: Database["public"]["Enums"]["social_format"]
          id: string
          image_url: string | null
          theme_id: string | null
        }
        Insert: {
          caption_text?: string | null
          created_at?: string
          created_by: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["social_entity_type"]
          format: Database["public"]["Enums"]["social_format"]
          id?: string
          image_url?: string | null
          theme_id?: string | null
        }
        Update: {
          caption_text?: string | null
          created_at?: string
          created_by?: string
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["social_entity_type"]
          format?: Database["public"]["Enums"]["social_format"]
          id?: string
          image_url?: string | null
          theme_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_assets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_assets_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "themes"
            referencedColumns: ["id"]
          },
        ]
      }
      themes: {
        Row: {
          accent_color: string | null
          created_at: string
          font_preset: Database["public"]["Enums"]["theme_font_preset"]
          hero_image_url: string | null
          id: string
          name: string
          texture_preset: Database["public"]["Enums"]["theme_texture_preset"]
        }
        Insert: {
          accent_color?: string | null
          created_at?: string
          font_preset?: Database["public"]["Enums"]["theme_font_preset"]
          hero_image_url?: string | null
          id?: string
          name: string
          texture_preset?: Database["public"]["Enums"]["theme_texture_preset"]
        }
        Update: {
          accent_color?: string | null
          created_at?: string
          font_preset?: Database["public"]["Enums"]["theme_font_preset"]
          hero_image_url?: string | null
          id?: string
          name?: string
          texture_preset?: Database["public"]["Enums"]["theme_texture_preset"]
        }
        Relationships: []
      }
      venue_members: {
        Row: {
          is_admin: boolean
          is_public: boolean
          profile_id: string
          venue_id: string
        }
        Insert: {
          is_admin?: boolean
          is_public?: boolean
          profile_id: string
          venue_id: string
        }
        Update: {
          is_admin?: boolean
          is_public?: boolean
          profile_id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_members_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          created_by: string
          description: string | null
          hero_image_url: string | null
          id: string
          is_published: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          hero_image_url?: string | null
          id?: string
          is_published?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          hero_image_url?: string | null
          id?: string
          is_published?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "venues_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_project_admin: { Args: { p_project_id: string }; Returns: boolean }
      is_project_member: { Args: { p_project_id: string }; Returns: boolean }
      is_venue_admin: { Args: { p_venue_id: string }; Returns: boolean }
    }
    Enums: {
      project_type: "solo" | "band"
      publish_status: "draft" | "submitted" | "published"
      social_entity_type: "project" | "event" | "festival" | "venue"
      social_format: "story" | "feed" | "poster"
      theme_font_preset: "industrial" | "grotesk" | "editorial"
      theme_texture_preset: "grain_dark" | "grain_blue" | "paper_offwhite"
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
    Enums: {
      project_type: ["solo", "band"],
      publish_status: ["draft", "submitted", "published"],
      social_entity_type: ["project", "event", "festival", "venue"],
      social_format: ["story", "feed", "poster"],
      theme_font_preset: ["industrial", "grotesk", "editorial"],
      theme_texture_preset: ["grain_dark", "grain_blue", "paper_offwhite"],
    },
  },
} as const
