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
      agent_prompts: {
        Row: {
          id: string
          prompt_business_context: string | null
          prompt_faq: string | null
          prompt_handover: string | null
          prompt_limits: string | null
          prompt_payments: string | null
          prompt_personality: string | null
          prompt_policies: string | null
          prompt_rescheduling: string | null
          prompt_services: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          prompt_business_context?: string | null
          prompt_faq?: string | null
          prompt_handover?: string | null
          prompt_limits?: string | null
          prompt_payments?: string | null
          prompt_personality?: string | null
          prompt_policies?: string | null
          prompt_rescheduling?: string | null
          prompt_services?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          prompt_business_context?: string | null
          prompt_faq?: string | null
          prompt_handover?: string | null
          prompt_limits?: string | null
          prompt_payments?: string | null
          prompt_personality?: string | null
          prompt_policies?: string | null
          prompt_rescheduling?: string | null
          prompt_services?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_prompts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          contact_email: string | null
          contact_name: string
          contact_phone: string
          created_at: string | null
          currency: string | null
          duration_minutes: number | null
          id: string
          metadata: Json | null
          notes: string | null
          origin: Database["public"]["Enums"]["booking_origin"] | null
          price: number | null
          scheduled_at: string
          service_id: string | null
          service_name: string
          session_id: string | null
          status: Database["public"]["Enums"]["booking_status"] | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_name: string
          contact_phone: string
          created_at?: string | null
          currency?: string | null
          duration_minutes?: number | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          origin?: Database["public"]["Enums"]["booking_origin"] | null
          price?: number | null
          scheduled_at: string
          service_id?: string | null
          service_name: string
          session_id?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_name?: string
          contact_phone?: string
          created_at?: string | null
          currency?: string | null
          duration_minutes?: number | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          origin?: Database["public"]["Enums"]["booking_origin"] | null
          price?: number | null
          scheduled_at?: string
          service_id?: string | null
          service_name?: string
          session_id?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string | null
          created_at: string | null
          direction: string
          id: string
          message_type: string | null
          metadata: Json | null
          sender_type: string
          session_id: string
          tenant_id: string
          wa_message_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          direction: string
          id?: string
          message_type?: string | null
          metadata?: Json | null
          sender_type: string
          session_id: string
          tenant_id: string
          wa_message_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          direction?: string
          id?: string
          message_type?: string | null
          metadata?: Json | null
          sender_type?: string
          session_id?: string
          tenant_id?: string
          wa_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          assigned_agent_id: string | null
          contact_name: string | null
          contact_phone: string
          created_at: string | null
          funnel_stage: Database["public"]["Enums"]["funnel_stage"] | null
          handoff_reason: string | null
          id: string
          is_handoff: boolean | null
          last_message_at: string | null
          metadata: Json | null
          status: Database["public"]["Enums"]["chat_status"] | null
          tenant_id: string
          updated_at: string | null
          wa_contact_id: string
        }
        Insert: {
          assigned_agent_id?: string | null
          contact_name?: string | null
          contact_phone: string
          created_at?: string | null
          funnel_stage?: Database["public"]["Enums"]["funnel_stage"] | null
          handoff_reason?: string | null
          id?: string
          is_handoff?: boolean | null
          last_message_at?: string | null
          metadata?: Json | null
          status?: Database["public"]["Enums"]["chat_status"] | null
          tenant_id: string
          updated_at?: string | null
          wa_contact_id: string
        }
        Update: {
          assigned_agent_id?: string | null
          contact_name?: string | null
          contact_phone?: string
          created_at?: string | null
          funnel_stage?: Database["public"]["Enums"]["funnel_stage"] | null
          handoff_reason?: string | null
          id?: string
          is_handoff?: boolean | null
          last_message_at?: string | null
          metadata?: Json | null
          status?: Database["public"]["Enums"]["chat_status"] | null
          tenant_id?: string
          updated_at?: string | null
          wa_contact_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      metrics_daily: {
        Row: {
          avg_response_time_seconds: number | null
          bofu_count: number | null
          bookings_cancelled: number | null
          bookings_confirmed: number | null
          bookings_created: number | null
          converted_count: number | null
          created_at: string | null
          date: string
          handoffs: number | null
          hot_count: number | null
          id: string
          inbound_messages: number | null
          lost_count: number | null
          mofu_count: number | null
          new_contacts: number | null
          outbound_messages: number | null
          revenue: number | null
          tenant_id: string
          tofu_count: number | null
          total_messages: number | null
          total_sessions: number | null
        }
        Insert: {
          avg_response_time_seconds?: number | null
          bofu_count?: number | null
          bookings_cancelled?: number | null
          bookings_confirmed?: number | null
          bookings_created?: number | null
          converted_count?: number | null
          created_at?: string | null
          date: string
          handoffs?: number | null
          hot_count?: number | null
          id?: string
          inbound_messages?: number | null
          lost_count?: number | null
          mofu_count?: number | null
          new_contacts?: number | null
          outbound_messages?: number | null
          revenue?: number | null
          tenant_id: string
          tofu_count?: number | null
          total_messages?: number | null
          total_sessions?: number | null
        }
        Update: {
          avg_response_time_seconds?: number | null
          bofu_count?: number | null
          bookings_cancelled?: number | null
          bookings_confirmed?: number | null
          bookings_created?: number | null
          converted_count?: number | null
          created_at?: string | null
          date?: string
          handoffs?: number | null
          hot_count?: number | null
          id?: string
          inbound_messages?: number | null
          lost_count?: number | null
          mofu_count?: number | null
          new_contacts?: number | null
          outbound_messages?: number | null
          revenue?: number | null
          tenant_id?: string
          tofu_count?: number | null
          total_messages?: number | null
          total_sessions?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "metrics_daily_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tenants: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          plan: string | null
          slug: string
          timezone: string | null
          updated_at: string | null
          whatsapp_business_id: string | null
          whatsapp_phone_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          plan?: string | null
          slug: string
          timezone?: string | null
          updated_at?: string | null
          whatsapp_business_id?: string | null
          whatsapp_phone_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          plan?: string | null
          slug?: string
          timezone?: string | null
          updated_at?: string | null
          whatsapp_business_id?: string | null
          whatsapp_phone_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_tenant_id: { Args: never; Returns: string }
      has_tenant_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _tenant_id: string
          _user_id: string
        }
        Returns: boolean
      }
      user_belongs_to_tenant: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "admin" | "agent" | "viewer"
      booking_origin: "chat" | "campaign" | "manual" | "web"
      booking_status:
        | "pending"
        | "confirmed"
        | "cancelled"
        | "completed"
        | "no_show"
      chat_status: "active" | "waiting" | "resolved" | "escalated" | "abandoned"
      funnel_stage: "tofu" | "mofu" | "hot" | "bofu" | "converted" | "lost"
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
      app_role: ["owner", "admin", "agent", "viewer"],
      booking_origin: ["chat", "campaign", "manual", "web"],
      booking_status: [
        "pending",
        "confirmed",
        "cancelled",
        "completed",
        "no_show",
      ],
      chat_status: ["active", "waiting", "resolved", "escalated", "abandoned"],
      funnel_stage: ["tofu", "mofu", "hot", "bofu", "converted", "lost"],
    },
  },
} as const
