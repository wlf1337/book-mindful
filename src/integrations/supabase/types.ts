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
      ai_insights: {
        Row: {
          book_id: string
          created_at: string
          custom_instruction: string | null
          generated_content: string
          id: string
          prompt_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          custom_instruction?: string | null
          generated_content: string
          id?: string
          prompt_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          custom_instruction?: string | null
          generated_content?: string
          id?: string
          prompt_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_insights_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_prompts: {
        Row: {
          created_at: string
          description: string | null
          id: string
          prompt_type: string
          system_prompt: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          prompt_type: string
          system_prompt: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          prompt_type?: string
          system_prompt?: string
          updated_at?: string
        }
        Relationships: []
      }
      books: {
        Row: {
          author: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          isbn: string | null
          manual_entry: boolean | null
          page_count: number | null
          published_date: string | null
          publisher: string | null
          title: string
        }
        Insert: {
          author?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          isbn?: string | null
          manual_entry?: boolean | null
          page_count?: number | null
          published_date?: string | null
          publisher?: string | null
          title: string
        }
        Update: {
          author?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          isbn?: string | null
          manual_entry?: boolean | null
          page_count?: number | null
          published_date?: string | null
          publisher?: string | null
          title?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          book_id: string
          content: string
          created_at: string
          id: string
          note_type: Database["public"]["Enums"]["note_type"]
          page_number: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          content: string
          created_at?: string
          id?: string
          note_type?: Database["public"]["Enums"]["note_type"]
          page_number?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          content?: string
          created_at?: string
          id?: string
          note_type?: Database["public"]["Enums"]["note_type"]
          page_number?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          completion_notifications: boolean
          created_at: string
          daily_reminder_enabled: boolean
          goal_notifications: boolean
          id: string
          reminder_time: string
          streak_notifications: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          completion_notifications?: boolean
          created_at?: string
          daily_reminder_enabled?: boolean
          goal_notifications?: boolean
          id?: string
          reminder_time?: string
          streak_notifications?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          completion_notifications?: boolean
          created_at?: string
          daily_reminder_enabled?: boolean
          goal_notifications?: boolean
          id?: string
          reminder_time?: string
          streak_notifications?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_goals: {
        Row: {
          created_at: string
          goal_type: Database["public"]["Enums"]["goal_type"]
          id: string
          target_value: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          goal_type: Database["public"]["Enums"]["goal_type"]
          id?: string
          target_value: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          goal_type?: Database["public"]["Enums"]["goal_type"]
          id?: string
          target_value?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_sessions: {
        Row: {
          book_id: string
          created_at: string
          duration_seconds: number | null
          end_page: number | null
          ended_at: string | null
          id: string
          pages_read: number | null
          paused_at: string | null
          paused_duration_seconds: number | null
          start_page: number | null
          started_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          duration_seconds?: number | null
          end_page?: number | null
          ended_at?: string | null
          id?: string
          pages_read?: number | null
          paused_at?: string | null
          paused_duration_seconds?: number | null
          start_page?: number | null
          started_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          duration_seconds?: number | null
          end_page?: number | null
          ended_at?: string | null
          id?: string
          pages_read?: number | null
          paused_at?: string | null
          paused_duration_seconds?: number | null
          start_page?: number | null
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_sessions_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_books: {
        Row: {
          book_id: string
          completed_at: string | null
          created_at: string
          current_page: number | null
          id: string
          rating: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["reading_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          completed_at?: string | null
          created_at?: string
          current_page?: number | null
          id?: string
          rating?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["reading_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          completed_at?: string | null
          created_at?: string
          current_page?: number | null
          id?: string
          rating?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["reading_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_books_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_books_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_id_by_email: { Args: { _email: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      goal_type:
        | "daily_minutes"
        | "weekly_minutes"
        | "books_per_month"
        | "books_per_year"
      note_type: "note" | "quote"
      reading_status: "want_to_read" | "reading" | "completed"
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
      app_role: ["admin", "user"],
      goal_type: [
        "daily_minutes",
        "weekly_minutes",
        "books_per_month",
        "books_per_year",
      ],
      note_type: ["note", "quote"],
      reading_status: ["want_to_read", "reading", "completed"],
    },
  },
} as const
