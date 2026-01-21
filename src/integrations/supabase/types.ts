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
      agent_settings_ui: {
        Row: {
          created_at: string
          data: Json
          id: string
          section_key: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          section_key: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          section_key?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_settings_ui_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string
          tenant_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name: string
          tenant_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string
          tenant_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_slots: {
        Row: {
          created_at: string | null
          day_of_week: number | null
          end_time: string
          id: string
          is_available: boolean | null
          location_id: string | null
          max_bookings: number | null
          service_id: string | null
          specific_date: string | null
          start_time: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          day_of_week?: number | null
          end_time: string
          id?: string
          is_available?: boolean | null
          location_id?: string | null
          max_bookings?: number | null
          service_id?: string | null
          specific_date?: string | null
          start_time: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          day_of_week?: number | null
          end_time?: string
          id?: string
          is_available?: boolean | null
          location_id?: string | null
          max_bookings?: number | null
          service_id?: string | null
          specific_date?: string | null
          start_time?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "availability_slots_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_slots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_dates: {
        Row: {
          created_at: string | null
          date: string
          end_time: string | null
          id: string
          is_full_day: boolean | null
          reason: string | null
          start_time: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          end_time?: string | null
          id?: string
          is_full_day?: boolean | null
          reason?: string | null
          start_time?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          end_time?: string | null
          id?: string
          is_full_day?: boolean | null
          reason?: string | null
          start_time?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_dates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          contact_email: string | null
          contact_id: string | null
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
          service_id_fk: string | null
          service_name: string
          session_id: string | null
          status: Database["public"]["Enums"]["booking_status"] | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_id?: string | null
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
          service_id_fk?: string | null
          service_name: string
          session_id?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_id?: string | null
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
          service_id_fk?: string | null
          service_name?: string
          session_id?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fk_fkey"
            columns: ["service_id_fk"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
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
      campaign_recipients: {
        Row: {
          campaign_id: string
          contact_name: string | null
          contact_phone: string
          created_at: string | null
          delivered_at: string | null
          error_message: string | null
          id: string
          read_at: string | null
          sent_at: string | null
          status: string | null
          tenant_id: string
          variables: Json | null
          wa_message_id: string | null
        }
        Insert: {
          campaign_id: string
          contact_name?: string | null
          contact_phone: string
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          read_at?: string | null
          sent_at?: string | null
          status?: string | null
          tenant_id: string
          variables?: Json | null
          wa_message_id?: string | null
        }
        Update: {
          campaign_id?: string
          contact_name?: string | null
          contact_phone?: string
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          read_at?: string | null
          sent_at?: string | null
          status?: string | null
          tenant_id?: string
          variables?: Json | null
          wa_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_recipients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          delivered_count: number | null
          description: string | null
          failed_count: number | null
          id: string
          name: string
          read_count: number | null
          replied_count: number | null
          scheduled_at: string | null
          sent_count: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["campaign_status"]
          target_audience: Json | null
          template_id: string | null
          tenant_id: string
          total_recipients: number | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          delivered_count?: number | null
          description?: string | null
          failed_count?: number | null
          id?: string
          name: string
          read_count?: number | null
          replied_count?: number | null
          scheduled_at?: string | null
          sent_count?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          target_audience?: Json | null
          template_id?: string | null
          tenant_id: string
          total_recipients?: number | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          delivered_count?: number | null
          description?: string | null
          failed_count?: number | null
          id?: string
          name?: string
          read_count?: number | null
          replied_count?: number | null
          scheduled_at?: string | null
          sent_count?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          target_audience?: Json | null
          template_id?: string | null
          tenant_id?: string
          total_recipients?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_labels: {
        Row: {
          color: string
          created_at: string | null
          id: string
          name: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          color?: string
          created_at?: string | null
          id?: string
          name: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: string
          name?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_labels_tenant_id_fkey"
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
      chat_session_labels: {
        Row: {
          created_at: string | null
          id: string
          label_id: string
          session_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          label_id: string
          session_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          label_id?: string
          session_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_session_labels_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "chat_labels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_session_labels_tenant_id_fkey"
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
          contact_id: string | null
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
          contact_id?: string | null
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
          contact_id?: string | null
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
            foreignKeyName: "chat_sessions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          created_at: string | null
          custom_fields: Json | null
          email: string | null
          funnel_stage: Database["public"]["Enums"]["funnel_stage"] | null
          id: string
          is_blocked: boolean | null
          is_priority: boolean | null
          last_contact_at: string | null
          lifetime_value: number | null
          name: string | null
          notes: string | null
          phone: string
          source: string | null
          tags: string[] | null
          tenant_id: string
          total_bookings: number | null
          total_conversations: number | null
          updated_at: string | null
          wa_contact_id: string | null
        }
        Insert: {
          created_at?: string | null
          custom_fields?: Json | null
          email?: string | null
          funnel_stage?: Database["public"]["Enums"]["funnel_stage"] | null
          id?: string
          is_blocked?: boolean | null
          is_priority?: boolean | null
          last_contact_at?: string | null
          lifetime_value?: number | null
          name?: string | null
          notes?: string | null
          phone: string
          source?: string | null
          tags?: string[] | null
          tenant_id: string
          total_bookings?: number | null
          total_conversations?: number | null
          updated_at?: string | null
          wa_contact_id?: string | null
        }
        Update: {
          created_at?: string | null
          custom_fields?: Json | null
          email?: string | null
          funnel_stage?: Database["public"]["Enums"]["funnel_stage"] | null
          id?: string
          is_blocked?: boolean | null
          is_priority?: boolean | null
          last_contact_at?: string | null
          lifetime_value?: number | null
          name?: string | null
          notes?: string | null
          phone?: string
          source?: string | null
          tags?: string[] | null
          tenant_id?: string
          total_bookings?: number | null
          total_conversations?: number | null
          updated_at?: string | null
          wa_contact_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_usd: number
          created_at: string | null
          description: string | null
          id: string
          invoice_url: string | null
          paid_at: string | null
          status: string
          stripe_invoice_id: string | null
          subscription_id: string | null
          tenant_id: string
        }
        Insert: {
          amount_usd: number
          created_at?: string | null
          description?: string | null
          id?: string
          invoice_url?: string | null
          paid_at?: string | null
          status?: string
          stripe_invoice_id?: string | null
          subscription_id?: string | null
          tenant_id: string
        }
        Update: {
          amount_usd?: number
          created_at?: string | null
          description?: string | null
          id?: string
          invoice_url?: string | null
          paid_at?: string | null
          status?: string
          stripe_invoice_id?: string | null
          subscription_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
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
      notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          is_read: boolean | null
          message: string | null
          read_at: string | null
          tenant_id: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          read_at?: string | null
          tenant_id: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          read_at?: string | null
          tenant_id?: string
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
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
      services: {
        Row: {
          category: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          display_order: number | null
          duration_minutes: number | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          modality: string[] | null
          name: string
          price: number | null
          price_type: string | null
          requirements: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          display_order?: number | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          modality?: string[] | null
          name: string
          price?: number | null
          price_type?: string | null
          requirements?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          display_order?: number | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          modality?: string[] | null
          name?: string
          price?: number | null
          price_type?: string | null
          requirements?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          billing_cycle: string
          created_at: string | null
          current_period_end: string
          current_period_start: string
          id: string
          plan: string
          price_usd: number
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          billing_cycle?: string
          created_at?: string | null
          current_period_end?: string
          current_period_start?: string
          id?: string
          plan?: string
          price_usd: number
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          billing_cycle?: string
          created_at?: string | null
          current_period_end?: string
          current_period_start?: string
          id?: string
          plan?: string
          price_usd?: number
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_addons: {
        Row: {
          activated_at: string | null
          addon_id: string
          cancelled_at: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          price_usd: number
          status: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          activated_at?: string | null
          addon_id: string
          cancelled_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          price_usd: number
          status?: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          activated_at?: string | null
          addon_id?: string
          cancelled_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          price_usd?: number
          status?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_addons_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_webhooks: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          tenant_id: string
          updated_at: string | null
          webhook_type: string
          webhook_url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          tenant_id: string
          updated_at?: string | null
          webhook_type?: string
          webhook_url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          tenant_id?: string
          updated_at?: string | null
          webhook_type?: string
          webhook_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_webhooks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          plan: string
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
          plan?: string
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
          plan?: string
          slug?: string
          timezone?: string | null
          updated_at?: string | null
          whatsapp_business_id?: string | null
          whatsapp_phone_id?: string | null
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          sender_id: string | null
          sender_type: string
          tenant_id: string
          ticket_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          sender_id?: string | null
          sender_type: string
          tenant_id: string
          ticket_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          sender_id?: string | null
          sender_type?: string
          tenant_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assigned_to: string | null
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          priority: string
          status: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          priority?: string
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          priority?: string
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
      webhook_logs: {
        Row: {
          created_at: string | null
          direction: string
          endpoint: string | null
          error_message: string | null
          event_type: Database["public"]["Enums"]["webhook_event_type"]
          id: string
          payload: Json
          processing_time_ms: number | null
          response_body: Json | null
          response_status: number | null
          tenant_id: string | null
          wa_message_id: string | null
        }
        Insert: {
          created_at?: string | null
          direction: string
          endpoint?: string | null
          error_message?: string | null
          event_type: Database["public"]["Enums"]["webhook_event_type"]
          id?: string
          payload: Json
          processing_time_ms?: number | null
          response_body?: Json | null
          response_status?: number | null
          tenant_id?: string | null
          wa_message_id?: string | null
        }
        Update: {
          created_at?: string | null
          direction?: string
          endpoint?: string | null
          error_message?: string | null
          event_type?: Database["public"]["Enums"]["webhook_event_type"]
          id?: string
          payload?: Json
          processing_time_ms?: number | null
          response_body?: Json | null
          response_status?: number | null
          tenant_id?: string | null
          wa_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          body_text: string
          buttons: Json | null
          category: Database["public"]["Enums"]["template_category"]
          created_at: string | null
          footer_text: string | null
          header_content: string | null
          header_type: string | null
          id: string
          language: string | null
          last_synced_at: string | null
          name: string
          status: Database["public"]["Enums"]["template_status"]
          tenant_id: string
          updated_at: string | null
          variables: Json | null
          wa_template_id: string | null
          wa_template_name: string | null
        }
        Insert: {
          body_text: string
          buttons?: Json | null
          category?: Database["public"]["Enums"]["template_category"]
          created_at?: string | null
          footer_text?: string | null
          header_content?: string | null
          header_type?: string | null
          id?: string
          language?: string | null
          last_synced_at?: string | null
          name: string
          status?: Database["public"]["Enums"]["template_status"]
          tenant_id: string
          updated_at?: string | null
          variables?: Json | null
          wa_template_id?: string | null
          wa_template_name?: string | null
        }
        Update: {
          body_text?: string
          buttons?: Json | null
          category?: Database["public"]["Enums"]["template_category"]
          created_at?: string | null
          footer_text?: string | null
          header_content?: string | null
          header_type?: string | null
          id?: string
          language?: string | null
          last_synced_at?: string | null
          name?: string
          status?: Database["public"]["Enums"]["template_status"]
          tenant_id?: string
          updated_at?: string | null
          variables?: Json | null
          wa_template_id?: string | null
          wa_template_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_templates_tenant_id_fkey"
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
      add_user_to_tenant: {
        Args: { _role?: string; _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      get_available_slots: {
        Args: { _date: string; _service_id?: string; _tenant_id: string }
        Returns: {
          available_spots: number
          end_time: string
          slot_id: string
          start_time: string
        }[]
      }
      get_user_tenant_id: { Args: never; Returns: string }
      has_tenant_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _tenant_id: string
          _user_id: string
        }
        Returns: boolean
      }
      setup_new_client: {
        Args: {
          _plan?: string
          _tenant_name: string
          _tenant_slug: string
          _timezone?: string
          _user_id: string
        }
        Returns: string
      }
      user_belongs_to_tenant: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      addon_type:
        | "report_meta_ads"
        | "report_unconverted_leads"
        | "report_converted_sales"
        | "report_ad_advisor"
        | "report_conversational_metrics"
        | "report_agent_performance"
      app_role: "owner" | "admin" | "agent" | "viewer"
      booking_origin: "chat" | "campaign" | "manual" | "web"
      booking_status:
        | "pending"
        | "confirmed"
        | "cancelled"
        | "completed"
        | "no_show"
      campaign_status:
        | "draft"
        | "scheduled"
        | "running"
        | "paused"
        | "completed"
        | "cancelled"
      chat_status: "active" | "waiting" | "resolved" | "escalated" | "abandoned"
      funnel_stage: "tofu" | "mofu" | "hot" | "bofu" | "converted" | "lost"
      notification_type: "handoff" | "booking" | "campaign" | "system" | "alert"
      plan_type: "basic" | "pro" | "enterprise"
      template_category: "marketing" | "utility" | "authentication" | "service"
      template_status: "draft" | "pending" | "approved" | "rejected"
      webhook_event_type:
        | "message"
        | "status"
        | "template_status"
        | "error"
        | "other"
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
      addon_type: [
        "report_meta_ads",
        "report_unconverted_leads",
        "report_converted_sales",
        "report_ad_advisor",
        "report_conversational_metrics",
        "report_agent_performance",
      ],
      app_role: ["owner", "admin", "agent", "viewer"],
      booking_origin: ["chat", "campaign", "manual", "web"],
      booking_status: [
        "pending",
        "confirmed",
        "cancelled",
        "completed",
        "no_show",
      ],
      campaign_status: [
        "draft",
        "scheduled",
        "running",
        "paused",
        "completed",
        "cancelled",
      ],
      chat_status: ["active", "waiting", "resolved", "escalated", "abandoned"],
      funnel_stage: ["tofu", "mofu", "hot", "bofu", "converted", "lost"],
      notification_type: ["handoff", "booking", "campaign", "system", "alert"],
      plan_type: ["basic", "pro", "enterprise"],
      template_category: ["marketing", "utility", "authentication", "service"],
      template_status: ["draft", "pending", "approved", "rejected"],
      webhook_event_type: [
        "message",
        "status",
        "template_status",
        "error",
        "other",
      ],
    },
  },
} as const
