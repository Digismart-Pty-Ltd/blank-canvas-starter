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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          at: string
          changed_columns: string[] | null
          id: number
          row_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          at?: string
          changed_columns?: string[] | null
          id?: never
          row_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          at?: string
          changed_columns?: string[] | null
          id?: never
          row_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      advertisements: {
        Row: {
          activation_date: string | null
          ad_type: string | null
          business_name: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          dimensions: string | null
          enabled: boolean
          expiry_date: string | null
          id: string
          image_url: string | null
          is_member: boolean
          legacy_id: string | null
          logo_url: string | null
          months: number | null
          order_number: string
          price: number | null
          slogan: string | null
          status: string
          website_url: string | null
        }
        Insert: {
          activation_date?: string | null
          ad_type?: string | null
          business_name: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          dimensions?: string | null
          enabled?: boolean
          expiry_date?: string | null
          id?: string
          image_url?: string | null
          is_member?: boolean
          legacy_id?: string | null
          logo_url?: string | null
          months?: number | null
          order_number?: string
          price?: number | null
          slogan?: string | null
          status?: string
          website_url?: string | null
        }
        Update: {
          activation_date?: string | null
          ad_type?: string | null
          business_name?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          dimensions?: string | null
          enabled?: boolean
          expiry_date?: string | null
          id?: string
          image_url?: string | null
          is_member?: boolean
          legacy_id?: string | null
          logo_url?: string | null
          months?: number | null
          order_number?: string
          price?: number | null
          slogan?: string | null
          status?: string
          website_url?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          description: string | null
          key: string
          value: string
        }
        Insert: {
          description?: string | null
          key: string
          value: string
        }
        Update: {
          description?: string | null
          key?: string
          value?: string
        }
        Relationships: []
      }
      email_outbox: {
        Row: {
          attempts: number
          body_text: string
          created_at: string
          id: string
          last_error: string | null
          sent_at: string | null
          status: string
          subject: string
          to_emails: string[]
        }
        Insert: {
          attempts?: number
          body_text: string
          created_at?: string
          id?: string
          last_error?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          to_emails?: string[]
        }
        Update: {
          attempts?: number
          body_text?: string
          created_at?: string
          id?: string
          last_error?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          to_emails?: string[]
        }
        Relationships: []
      }
      event_registrations: {
        Row: {
          checked_in_at: string | null
          contact: string | null
          created_at: string
          emergency: string | null
          event_id: string
          id: string
          legacy_id: string | null
          name: string
          open_runner: boolean
          reminder_sent: boolean
          tier: string | null
          user_id: string | null
        }
        Insert: {
          checked_in_at?: string | null
          contact?: string | null
          created_at?: string
          emergency?: string | null
          event_id: string
          id?: string
          legacy_id?: string | null
          name?: string
          open_runner?: boolean
          reminder_sent?: boolean
          tier?: string | null
          user_id?: string | null
        }
        Update: {
          checked_in_at?: string | null
          contact?: string | null
          created_at?: string
          emergency?: string | null
          event_id?: string
          id?: string
          legacy_id?: string | null
          name?: string
          open_runner?: boolean
          reminder_sent?: boolean
          tier?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "member_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "event_registrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          after_run_place: string | null
          archived: boolean
          created_at: string
          description: string | null
          distance_display: string | null
          distance_km: number | null
          event_date: string
          event_time: string | null
          id: string
          image_orientation: string | null
          image_url: string | null
          legacy_id: string | null
          meeting_place: string | null
          members_only: boolean
          title: string
          updated_at: string
        }
        Insert: {
          after_run_place?: string | null
          archived?: boolean
          created_at?: string
          description?: string | null
          distance_display?: string | null
          distance_km?: number | null
          event_date: string
          event_time?: string | null
          id?: string
          image_orientation?: string | null
          image_url?: string | null
          legacy_id?: string | null
          meeting_place?: string | null
          members_only?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          after_run_place?: string | null
          archived?: boolean
          created_at?: string
          description?: string | null
          distance_display?: string | null
          distance_km?: number | null
          event_date?: string
          event_time?: string | null
          id?: string
          image_orientation?: string | null
          image_url?: string | null
          legacy_id?: string | null
          meeting_place?: string | null
          members_only?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_states: {
        Row: {
          hidden_at: string | null
          notification_id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          hidden_at?: string | null
          notification_id: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          hidden_at?: string | null
          notification_id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_states_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          audience: string
          body: string
          created_at: string
          id: string
          legacy_id: string | null
          link: string | null
          target_tier: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          audience?: string
          body?: string
          created_at?: string
          id?: string
          legacy_id?: string | null
          link?: string | null
          target_tier?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          audience?: string
          body?: string
          created_at?: string
          id?: string
          legacy_id?: string | null
          link?: string | null
          target_tier?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      order_lines: {
        Row: {
          colour: string | null
          id: string
          order_id: string
          product: string
          qty: number
          size: string | null
        }
        Insert: {
          colour?: string | null
          id?: string
          order_id: string
          product: string
          qty: number
          size?: string | null
        }
        Update: {
          colour?: string | null
          id?: string
          order_id?: string
          product?: string
          qty?: number
          size?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_lines_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          batched: boolean
          created_at: string
          email: string
          id: string
          legacy_id: string | null
          name: string
          notes: string | null
          order_number: string
          phone: string | null
        }
        Insert: {
          batched?: boolean
          created_at?: string
          email: string
          id?: string
          legacy_id?: string | null
          name: string
          notes?: string | null
          order_number?: string
          phone?: string | null
        }
        Update: {
          batched?: boolean
          created_at?: string
          email?: string
          id?: string
          legacy_id?: string | null
          name?: string
          notes?: string | null
          order_number?: string
          phone?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_path: string | null
          contact: string | null
          created_at: string
          email: string
          emergency: string | null
          id: string
          id_number: string | null
          joined: string
          last_run: string | null
          last_tier_check: string | null
          legacy_uid: string | null
          member_kind: string
          name: string
          rewards_pending: number
          tier: string
          tier_downgraded_at: string | null
          tier_reset_at: string | null
          upgraded_at: string | null
          waiver_accepted: boolean
          waiver_accepted_at: string | null
        }
        Insert: {
          avatar_path?: string | null
          contact?: string | null
          created_at?: string
          email?: string
          emergency?: string | null
          id: string
          id_number?: string | null
          joined?: string
          last_run?: string | null
          last_tier_check?: string | null
          legacy_uid?: string | null
          member_kind?: string
          name?: string
          rewards_pending?: number
          tier?: string
          tier_downgraded_at?: string | null
          tier_reset_at?: string | null
          upgraded_at?: string | null
          waiver_accepted?: boolean
          waiver_accepted_at?: string | null
        }
        Update: {
          avatar_path?: string | null
          contact?: string | null
          created_at?: string
          email?: string
          emergency?: string | null
          id?: string
          id_number?: string | null
          joined?: string
          last_run?: string | null
          last_tier_check?: string | null
          legacy_uid?: string | null
          member_kind?: string
          name?: string
          rewards_pending?: number
          tier?: string
          tier_downgraded_at?: string | null
          tier_reset_at?: string | null
          upgraded_at?: string | null
          waiver_accepted?: boolean
          waiver_accepted_at?: string | null
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string
          id: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      redemptions: {
        Row: {
          id: string
          legacy_id: string | null
          redeemed_at: string
          reward_id: string
          user_id: string
        }
        Insert: {
          id?: string
          legacy_id?: string | null
          redeemed_at?: string
          reward_id: string
          user_id: string
        }
        Update: {
          id?: string
          legacy_id?: string | null
          redeemed_at?: string
          reward_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "member_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          created_at: string
          description: string | null
          expires_in_days: number | null
          id: string
          legacy_id: string | null
          tier: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          expires_in_days?: number | null
          id?: string
          legacy_id?: string | null
          tier: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          expires_in_days?: number | null
          id?: string
          legacy_id?: string | null
          tier?: string
          title?: string
        }
        Relationships: []
      }
      sponsors: {
        Row: {
          created_at: string
          id: string
          legacy_id: string | null
          logo_url: string | null
          name: string
          sort_order: number
          website_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          legacy_id?: string | null
          logo_url?: string | null
          name: string
          sort_order?: number
          website_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          legacy_id?: string | null
          logo_url?: string | null
          name?: string
          sort_order?: number
          website_url?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      event_registration_counts: {
        Row: {
          event_id: string | null
          registrations: number | null
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      member_stats: {
        Row: {
          races_this_year: number | null
          races_total: number | null
          user_id: string | null
        }
        Relationships: []
      }
      public_advertisements: {
        Row: {
          activation_date: string | null
          ad_type: string | null
          business_name: string | null
          dimensions: string | null
          expiry_date: string | null
          id: string | null
          image_url: string | null
          logo_url: string | null
          slogan: string | null
          website_url: string | null
        }
        Insert: {
          activation_date?: string | null
          ad_type?: string | null
          business_name?: string | null
          dimensions?: string | null
          expiry_date?: string | null
          id?: string | null
          image_url?: string | null
          logo_url?: string | null
          slogan?: string | null
          website_url?: string | null
        }
        Update: {
          activation_date?: string | null
          ad_type?: string | null
          business_name?: string | null
          dimensions?: string | null
          expiry_date?: string | null
          id?: string | null
          image_url?: string | null
          logo_url?: string | null
          slogan?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_send_order_batch: { Args: never; Returns: number }
      admin_set_tier: {
        Args: { p_tier: string; p_user: string }
        Returns: undefined
      }
      become_member: {
        Args: {
          p_contact: string
          p_emergency: string
          p_id_number: string
          p_name: string
        }
        Returns: undefined
      }
      check_in: {
        Args: { p_code: string; p_registration_id: string }
        Returns: undefined
      }
      create_order_batch: { Args: { p_force?: boolean }; Returns: number }
      event_start: { Args: { d: string; t: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      my_kind: { Args: never; Returns: string }
      my_tier: { Args: never; Returns: string }
      queue_admin_email: {
        Args: { p_body: string; p_subject: string }
        Returns: undefined
      }
      redeem_reward: {
        Args: { p_code: string; p_reward_id: string }
        Returns: undefined
      }
      register_push_token: { Args: { p_token: string }; Returns: undefined }
      submit_advertisement: {
        Args: {
          p_activation_date: string
          p_ad_type: string
          p_business_name: string
          p_contact_email: string
          p_contact_name: string
          p_contact_phone: string
          p_dimensions: string
          p_image_url: string
          p_is_member: boolean
          p_logo_url: string
          p_months: number
          p_price: number
          p_slogan: string
          p_website_url: string
        }
        Returns: string
      }
      submit_order: {
        Args: {
          p_email: string
          p_lines: Json
          p_name: string
          p_notes: string
          p_phone: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "member"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "member"],
    },
  },
} as const
