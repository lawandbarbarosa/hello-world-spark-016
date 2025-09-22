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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      campaigns: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          campaign_id: string | null
          created_at: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          replied_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          replied_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          replied_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sends: {
        Row: {
          campaign_id: string
          clicked_at: string | null
          contact_id: string
          created_at: string
          error_message: string | null
          gmail_message_id: string | null
          gmail_synced: boolean | null
          gmail_synced_at: string | null
          id: string
          opened_at: string | null
          sender_account_id: string
          sent_at: string | null
          sequence_id: string
          status: string | null
        }
        Insert: {
          campaign_id: string
          clicked_at?: string | null
          contact_id: string
          created_at?: string
          error_message?: string | null
          gmail_message_id?: string | null
          gmail_synced?: boolean | null
          gmail_synced_at?: string | null
          id?: string
          opened_at?: string | null
          sender_account_id: string
          sent_at?: string | null
          sequence_id: string
          status?: string | null
        }
        Update: {
          campaign_id?: string
          clicked_at?: string | null
          contact_id?: string
          created_at?: string
          error_message?: string | null
          gmail_message_id?: string | null
          gmail_synced?: boolean | null
          gmail_synced_at?: string | null
          id?: string
          opened_at?: string | null
          sender_account_id?: string
          sent_at?: string | null
          sequence_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_sends_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sends_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sends_sender_account_id_fkey"
            columns: ["sender_account_id"]
            isOneToOne: false
            referencedRelation: "sender_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sends_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "email_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      email_replies: {
        Row: {
          campaign_id: string
          contact_id: string
          content: string
          created_at: string
          email_send_id: string | null
          from_email: string
          id: string
          in_reply_to: string | null
          message_id: string | null
          received_at: string
          references: string | null
          subject: string
          to_email: string
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          contact_id: string
          content: string
          created_at?: string
          email_send_id?: string | null
          from_email: string
          id?: string
          in_reply_to?: string | null
          message_id?: string | null
          received_at?: string
          references?: string | null
          subject: string
          to_email: string
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          contact_id?: string
          content?: string
          created_at?: string
          email_send_id?: string | null
          from_email?: string
          id?: string
          in_reply_to?: string | null
          message_id?: string | null
          received_at?: string
          references?: string | null
          subject?: string
          to_email?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_email_replies_campaign_id"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_email_replies_contact_id"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_email_replies_email_send_id"
            columns: ["email_send_id"]
            isOneToOne: false
            referencedRelation: "email_sends"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sequences: {
        Row: {
          body: string
          campaign_id: string
          created_at: string
          delay_amount: number | null
          delay_unit: string | null
          id: string
          scheduled_date: string | null
          scheduled_time: string | null
          step_number: number
          subject: string
        }
        Insert: {
          body: string
          campaign_id: string
          created_at?: string
          delay_amount?: number | null
          delay_unit?: string | null
          id?: string
          scheduled_date?: string | null
          scheduled_time?: string | null
          step_number: number
          subject: string
        }
        Update: {
          body?: string
          campaign_id?: string
          created_at?: string
          delay_amount?: number | null
          delay_unit?: string | null
          id?: string
          scheduled_date?: string | null
          scheduled_time?: string | null
          step_number?: number
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_sequences_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      email_verifications: {
        Row: {
          created_at: string
          email: string
          execution_time_ms: number | null
          flags: string[] | null
          id: string
          is_deliverable: boolean
          is_valid: boolean
          suggested_correction: string | null
          updated_at: string
          user_id: string
          verification_result: string
          verified_at: string
        }
        Insert: {
          created_at?: string
          email: string
          execution_time_ms?: number | null
          flags?: string[] | null
          id?: string
          is_deliverable?: boolean
          is_valid?: boolean
          suggested_correction?: string | null
          updated_at?: string
          user_id: string
          verification_result: string
          verified_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          execution_time_ms?: number | null
          flags?: string[] | null
          id?: string
          is_deliverable?: boolean
          is_valid?: boolean
          suggested_correction?: string | null
          updated_at?: string
          user_id?: string
          verification_result?: string
          verified_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scheduled_emails: {
        Row: {
          attempts: number
          campaign_id: string
          contact_id: string
          created_at: string
          error_message: string | null
          id: string
          scheduled_for: string
          sender_account_id: string
          sequence_id: string
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          campaign_id: string
          contact_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          scheduled_for: string
          sender_account_id: string
          sequence_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          campaign_id?: string
          contact_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          scheduled_for?: string
          sender_account_id?: string
          sequence_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      sender_accounts: {
        Row: {
          campaign_id: string | null
          created_at: string
          daily_limit: number | null
          email: string
          gmail_client_id: string | null
          gmail_client_secret: string | null
          gmail_refresh_token: string | null
          gmail_sync_enabled: boolean | null
          id: string
          provider: string
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          daily_limit?: number | null
          email: string
          gmail_client_id?: string | null
          gmail_client_secret?: string | null
          gmail_refresh_token?: string | null
          gmail_sync_enabled?: boolean | null
          id?: string
          provider: string
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          daily_limit?: number | null
          email?: string
          gmail_client_id?: string | null
          gmail_client_secret?: string | null
          gmail_refresh_token?: string | null
          gmail_sync_enabled?: boolean | null
          id?: string
          provider?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sender_accounts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      spam_emails: {
        Row: {
          campaign_id: string | null
          content: string | null
          created_at: string
          id: string
          original_message_id: string | null
          received_at: string
          sender_email: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          content?: string | null
          created_at?: string
          id?: string
          original_message_id?: string | null
          received_at?: string
          sender_email: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          content?: string | null
          created_at?: string
          id?: string
          original_message_id?: string | null
          received_at?: string
          sender_email?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_spam_emails_campaign_id"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          created_at: string
          csv_mapping_defaults: Json | null
          daily_send_limit: number | null
          default_signature: string | null
          fallback_merge_tags: Json | null
          from_name_format: string | null
          id: string
          legal_disclaimer: string | null
          reply_handling_enabled: boolean | null
          send_time_end: string | null
          send_time_start: string | null
          sending_days: string[] | null
          theme_mode: string | null
          timezone: string | null
          unsubscribe_link_enabled: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          csv_mapping_defaults?: Json | null
          daily_send_limit?: number | null
          default_signature?: string | null
          fallback_merge_tags?: Json | null
          from_name_format?: string | null
          id?: string
          legal_disclaimer?: string | null
          reply_handling_enabled?: boolean | null
          send_time_end?: string | null
          send_time_start?: string | null
          sending_days?: string[] | null
          theme_mode?: string | null
          timezone?: string | null
          unsubscribe_link_enabled?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          csv_mapping_defaults?: Json | null
          daily_send_limit?: number | null
          default_signature?: string | null
          fallback_merge_tags?: Json | null
          from_name_format?: string | null
          id?: string
          legal_disclaimer?: string | null
          reply_handling_enabled?: boolean | null
          send_time_end?: string | null
          send_time_start?: string | null
          sending_days?: string[] | null
          theme_mode?: string | null
          timezone?: string | null
          unsubscribe_link_enabled?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_valid_email: {
        Args: { email: string }
        Returns: boolean
      }
      mark_contact_replied: {
        Args: { campaign_id_param: string; contact_email: string }
        Returns: undefined
      }
      enable_gmail_sync: {
        Args: { 
          sender_email_param: string
          refresh_token_param: string
          client_id_param: string
          client_secret_param: string
        }
        Returns: undefined
      }
      disable_gmail_sync: {
        Args: { sender_email_param: string }
        Returns: undefined
      }
      get_gmail_sync_stats: {
        Args: { user_id_param: string }
        Returns: {
          total_emails: number
          synced_emails: number
          sync_rate: number
          sender_accounts_with_sync: number
        }[]
      }
      store_email_reply: {
        Args: {
          contact_email_param: string
          campaign_id_param: string
          from_email_param: string
          to_email_param: string
          subject_param: string
          content_param: string
          message_id_param?: string | null
          in_reply_to_param?: string | null
          references_param?: string | null
          email_send_id_param?: string | null
        }
        Returns: string
      }
      get_contact_replies: {
        Args: { contact_email_param: string; campaign_id_param: string }
        Returns: {
          id: string
          from_email: string
          to_email: string
          subject: string
          content: string
          received_at: string
          message_id: string | null
        }[]
      }
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
