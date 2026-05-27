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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_recommendations: {
        Row: {
          category: string | null
          created_at: string
          id: string
          module_type: string
          recommendation_text: string
          saved: boolean
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          module_type: string
          recommendation_text: string
          saved?: boolean
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          module_type?: string
          recommendation_text?: string
          saved?: boolean
          user_id?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          alert_threshold: number
          id: string
          monthly_limit: number
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_threshold?: number
          id?: string
          monthly_limit?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_threshold?: number
          id?: string
          monthly_limit?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_tasks: {
        Row: {
          category: string
          completed: boolean
          created_at: string
          id: string
          plan_day: number | null
          recommendation_id: string | null
          recurring_plan_id: string | null
          task_date: string
          title: string
          user_id: string
        }
        Insert: {
          category?: string
          completed?: boolean
          created_at?: string
          id?: string
          plan_day?: number | null
          recommendation_id?: string | null
          recurring_plan_id?: string | null
          task_date?: string
          title: string
          user_id: string
        }
        Update: {
          category?: string
          completed?: boolean
          created_at?: string
          id?: string
          plan_day?: number | null
          recommendation_id?: string | null
          recurring_plan_id?: string | null
          task_date?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          expense_date: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          expense_date?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          expense_date?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      focus_sessions: {
        Row: {
          created_at: string
          duration_seconds: number
          end_time: string | null
          goal_seconds: number | null
          habit_type: string
          id: string
          start_time: string
          status: string
          task_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number
          end_time?: string | null
          goal_seconds?: number | null
          habit_type: string
          id?: string
          start_time?: string
          status?: string
          task_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number
          end_time?: string | null
          goal_seconds?: number | null
          habit_type?: string
          id?: string
          start_time?: string
          status?: string
          task_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      metric_logs: {
        Row: {
          created_at: string
          id: string
          log_date: string
          metric_type: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          log_date?: string
          metric_type: string
          user_id: string
          value?: number
        }
        Update: {
          created_at?: string
          id?: string
          log_date?: string
          metric_type?: string
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bmi_age: number | null
          bmi_height_cm: number | null
          bmi_weight_kg: number | null
          calorie_target: number | null
          created_at: string
          current_streak: number
          daily_goal: number
          defaults_seeded: Json
          diet_goal: string | null
          full_name: string | null
          gems: number
          health_goals: Json
          id: string
          last_streak_date: string | null
          longest_streak: number
          missed_days: number
          preferences: Json
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bmi_age?: number | null
          bmi_height_cm?: number | null
          bmi_weight_kg?: number | null
          calorie_target?: number | null
          created_at?: string
          current_streak?: number
          daily_goal?: number
          defaults_seeded?: Json
          diet_goal?: string | null
          full_name?: string | null
          gems?: number
          health_goals?: Json
          id: string
          last_streak_date?: string | null
          longest_streak?: number
          missed_days?: number
          preferences?: Json
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bmi_age?: number | null
          bmi_height_cm?: number | null
          bmi_weight_kg?: number | null
          calorie_target?: number | null
          created_at?: string
          current_streak?: number
          daily_goal?: number
          defaults_seeded?: Json
          diet_goal?: string | null
          full_name?: string | null
          gems?: number
          health_goals?: Json
          id?: string
          last_streak_date?: string | null
          longest_streak?: number
          missed_days?: number
          preferences?: Json
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      recurring_plans: {
        Row: {
          active: boolean
          category: string
          created_at: string
          duration_days: number
          id: string
          recommendation_id: string | null
          start_date: string
          title: string
          user_id: string
        }
        Insert: {
          active?: boolean
          category?: string
          created_at?: string
          duration_days: number
          id?: string
          recommendation_id?: string | null
          start_date?: string
          title: string
          user_id: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          duration_days?: number
          id?: string
          recommendation_id?: string | null
          start_date?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      scheduled_reminders: {
        Row: {
          created_at: string
          id: string
          recommendation_id: string | null
          reminder_text: string
          schedule_date: string
          schedule_time: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          recommendation_id?: string | null
          reminder_text: string
          schedule_date?: string
          schedule_time?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          recommendation_id?: string | null
          reminder_text?: string
          schedule_date?: string
          schedule_time?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_reminders_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "ai_recommendations"
            referencedColumns: ["id"]
          },
        ]
      }
      streak_log: {
        Row: {
          completed_count: number
          counted: boolean
          id: string
          log_date: string
          percent: number
          total_count: number
          user_id: string
        }
        Insert: {
          completed_count?: number
          counted?: boolean
          id?: string
          log_date: string
          percent?: number
          total_count?: number
          user_id: string
        }
        Update: {
          completed_count?: number
          counted?: boolean
          id?: string
          log_date?: string
          percent?: number
          total_count?: number
          user_id?: string
        }
        Relationships: []
      }
      todos: {
        Row: {
          completed: boolean
          created_at: string
          due_date: string
          due_time: string | null
          id: string
          recurrence: string
          reminder_minutes: number | null
          title: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          due_date?: string
          due_time?: string | null
          id?: string
          recurrence?: string
          reminder_minutes?: number | null
          title: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          due_date?: string
          due_time?: string | null
          id?: string
          recurrence?: string
          reminder_minutes?: number | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
