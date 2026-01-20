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
      access_invitations: {
        Row: {
          accepted_at: string | null
          access: Database["public"]["Enums"]["access_level"]
          email: string
          entity_id: string
          expires_at: string
          id: string
          invited_at: string
          invited_by: string
          role_labels: string[] | null
          status: string
          token: string | null
        }
        Insert: {
          accepted_at?: string | null
          access: Database["public"]["Enums"]["access_level"]
          email: string
          entity_id: string
          expires_at?: string
          id?: string
          invited_at?: string
          invited_by: string
          role_labels?: string[] | null
          status?: string
          token?: string | null
        }
        Update: {
          accepted_at?: string | null
          access?: Database["public"]["Enums"]["access_level"]
          email?: string
          entity_id?: string
          expires_at?: string
          id?: string
          invited_at?: string
          invited_by?: string
          role_labels?: string[] | null
          status?: string
          token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_invitations_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      designs: {
        Row: {
          background: Json
          created_at: string | null
          created_by: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          sections: Json
          template: string
          theme: Json
          updated_at: string | null
        }
        Insert: {
          background?: Json
          created_at?: string | null
          created_by?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          sections?: Json
          template?: string
          theme?: Json
          updated_at?: string | null
        }
        Update: {
          background?: Json
          created_at?: string | null
          created_by?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          sections?: Json
          template?: string
          theme?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "designs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      entities: {
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
          tagline: string | null
          type: Database["public"]["Enums"]["entity_type"]
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
          tagline?: string | null
          type: Database["public"]["Enums"]["entity_type"]
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
          tagline?: string | null
          type?: Database["public"]["Enums"]["entity_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_team: {
        Row: {
          access: Database["public"]["Enums"]["access_level"]
          entity_id: string
          id: string
          is_public: boolean
          joined_at: string
          left_at: string | null
          role_labels: string[] | null
          user_id: string
        }
        Insert: {
          access?: Database["public"]["Enums"]["access_level"]
          entity_id: string
          id?: string
          is_public?: boolean
          joined_at?: string
          left_at?: string | null
          role_labels?: string[] | null
          user_id: string
        }
        Update: {
          access?: Database["public"]["Enums"]["access_level"]
          entity_id?: string
          id?: string
          is_public?: boolean
          joined_at?: string
          left_at?: string | null
          role_labels?: string[] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_team_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_team_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_timeline_events: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          date: string | null
          description: string | null
          entity_id: string
          event_type: string
          id: string
          location_name: string | null
          media: Json | null
          title: string
          updated_at: string
          visibility: string
          year: number | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          date?: string | null
          description?: string | null
          entity_id: string
          event_type: string
          id?: string
          location_name?: string | null
          media?: Json | null
          title: string
          updated_at?: string
          visibility?: string
          year?: number | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          date?: string | null
          description?: string | null
          entity_id?: string
          event_type?: string
          id?: string
          location_name?: string | null
          media?: Json | null
          title?: string
          updated_at?: string
          visibility?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "entity_timeline_events_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      event_entities: {
        Row: {
          billing_order: number
          entity_id: string
          event_id: string
          feature_order: number | null
          is_featured: boolean | null
        }
        Insert: {
          billing_order?: number
          entity_id: string
          event_id: string
          feature_order?: number | null
          is_featured?: boolean | null
        }
        Update: {
          billing_order?: number
          entity_id?: string
          event_id?: string
          feature_order?: number | null
          is_featured?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "event_entities_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_entities_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
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
          bg_image_url_desktop: string | null
          bg_image_url_mobile: string | null
          bg_mode: string
          content_json: Json | null
          created_at: string | null
          festival_id: string
          id: string
          image_fit_mode: string | null
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
          bg_image_url_desktop?: string | null
          bg_image_url_mobile?: string | null
          bg_mode?: string
          content_json?: Json | null
          created_at?: string | null
          festival_id: string
          id?: string
          image_fit_mode?: string | null
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
          bg_image_url_desktop?: string | null
          bg_image_url_mobile?: string | null
          bg_mode?: string
          content_json?: Json | null
          created_at?: string | null
          festival_id?: string
          id?: string
          image_fit_mode?: string | null
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
          date_range_section_id: string | null
          description: string | null
          description_section_id: string | null
          end_at: string | null
          id: string
          name: string
          name_section_id: string | null
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
          date_range_section_id?: string | null
          description?: string | null
          description_section_id?: string | null
          end_at?: string | null
          id?: string
          name: string
          name_section_id?: string | null
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
          date_range_section_id?: string | null
          description?: string | null
          description_section_id?: string | null
          end_at?: string | null
          id?: string
          name?: string
          name_section_id?: string | null
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
            foreignKeyName: "festivals_date_range_section_id_fkey"
            columns: ["date_range_section_id"]
            isOneToOne: false
            referencedRelation: "festival_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "festivals_description_section_id_fkey"
            columns: ["description_section_id"]
            isOneToOne: false
            referencedRelation: "festival_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "festivals_name_section_id_fkey"
            columns: ["name_section_id"]
            isOneToOne: false
            referencedRelation: "festival_sections"
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
      personas: {
        Row: {
          avatar_url: string | null
          bio: string | null
          category_tags: string[] | null
          created_at: string
          id: string
          is_public: boolean
          name: string
          slug: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          category_tags?: string[] | null
          created_at?: string
          id?: string
          is_public?: boolean
          name: string
          slug: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          category_tags?: string[] | null
          created_at?: string
          id?: string
          is_public?: boolean
          name?: string
          slug?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personas_user_id_fkey"
            columns: ["user_id"]
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
      project_timeline_events: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          date: string | null
          description: string | null
          event_type: string
          id: string
          location_name: string | null
          media: Json | null
          project_id: string
          title: string
          updated_at: string
          visibility: string
          year: number | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          date?: string | null
          description?: string | null
          event_type: string
          id?: string
          location_name?: string | null
          media?: Json | null
          project_id: string
          title: string
          updated_at?: string
          visibility?: string
          year?: number | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          date?: string | null
          description?: string | null
          event_type?: string
          id?: string
          location_name?: string | null
          media?: Json | null
          project_id?: string
          title?: string
          updated_at?: string
          visibility?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_timeline_events_project_id_fkey"
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
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
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
      can_edit_entity: { Args: { p_entity_id: string }; Returns: boolean }
      get_user_entities: {
        Args: never
        Returns: {
          access: Database["public"]["Enums"]["access_level"]
          entity_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_entity_admin: { Args: { p_entity_id: string }; Returns: boolean }
      is_entity_owner: { Args: { p_entity_id: string }; Returns: boolean }
      is_entity_team_member: { Args: { p_entity_id: string }; Returns: boolean }
      is_project_admin: { Args: { p_project_id: string }; Returns: boolean }
      is_project_member: { Args: { p_project_id: string }; Returns: boolean }
      is_venue_admin: { Args: { p_venue_id: string }; Returns: boolean }
    }
    Enums: {
      access_level: "owner" | "admin" | "editor" | "viewer"
      app_role: "admin" | "moderator" | "user"
      entity_type: "venue" | "solo" | "band"
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
      access_level: ["owner", "admin", "editor", "viewer"],
      app_role: ["admin", "moderator", "user"],
      entity_type: ["venue", "solo", "band"],
      project_type: ["solo", "band"],
      publish_status: ["draft", "submitted", "published"],
      social_entity_type: ["project", "event", "festival", "venue"],
      social_format: ["story", "feed", "poster"],
      theme_font_preset: ["industrial", "grotesk", "editorial"],
      theme_texture_preset: ["grain_dark", "grain_blue", "paper_offwhite"],
    },
  },
} as const
