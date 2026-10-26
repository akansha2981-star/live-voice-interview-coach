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
      answer_reviews: {
        Row: {
          id: string
          interview_id: string
          question_index: number
          reviewed_at: string
          user_id: string
        }
        Insert: {
          id?: string
          interview_id: string
          question_index: number
          reviewed_at?: string
          user_id: string
        }
        Update: {
          id?: string
          interview_id?: string
          question_index?: number
          reviewed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "answer_reviews_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_ledger: {
        Row: {
          created_at: string
          created_by: string | null
          delta: number
          id: string
          interview_id: string | null
          reason: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          delta: number
          id?: string
          interview_id?: string | null
          reason: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          delta?: number
          id?: string
          interview_id?: string | null
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      interview_bookings: {
        Row: {
          checked_at: string | null
          created_at: string
          id: string
          interview_id: string | null
          preflight: Json | null
          slot_id: string
          status: string
          user_id: string
        }
        Insert: {
          checked_at?: string | null
          created_at?: string
          id?: string
          interview_id?: string | null
          preflight?: Json | null
          slot_id: string
          status?: string
          user_id: string
        }
        Update: {
          checked_at?: string | null
          created_at?: string
          id?: string
          interview_id?: string | null
          preflight?: Json | null
          slot_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_bookings_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_bookings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "interview_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_slots: {
        Row: {
          capacity: number
          created_at: string
          created_by: string
          ends_at: string
          id: string
          published: boolean
          starts_at: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          created_by: string
          ends_at: string
          id?: string
          published?: boolean
          starts_at: string
        }
        Update: {
          capacity?: number
          created_at?: string
          created_by?: string
          ends_at?: string
          id?: string
          published?: boolean
          starts_at?: string
        }
        Relationships: []
      }
      interviews: {
        Row: {
          category: string | null
          created_at: string
          difficulty: string | null
          duration_s: number | null
          ended_at: string | null
          error: string | null
          id: string
          overall_score: number | null
          report: Json | null
          speech_metrics: Json | null
          started_at: string
          status: string
          transcript: Json
          user_id: string
          vision_summary: Json | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          difficulty?: string | null
          duration_s?: number | null
          ended_at?: string | null
          error?: string | null
          id?: string
          overall_score?: number | null
          report?: Json | null
          speech_metrics?: Json | null
          started_at?: string
          status?: string
          transcript?: Json
          user_id: string
          vision_summary?: Json | null
        }
        Update: {
          category?: string | null
          created_at?: string
          difficulty?: string | null
          duration_s?: number | null
          ended_at?: string | null
          error?: string | null
          id?: string
          overall_score?: number | null
          report?: Json | null
          speech_metrics?: Json | null
          started_at?: string
          status?: string
          transcript?: Json
          user_id?: string
          vision_summary?: Json | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          accessibility: string | null
          achievements: string | null
          career_objectives: string | null
          concerns: string | null
          created_at: string
          difficulty: string | null
          education: string | null
          email: string | null
          employment_status: string | null
          full_name: string | null
          functional_skills: string | null
          graduation_year: number | null
          id: string
          industry: string | null
          interview_category: string | null
          interview_language: string | null
          job_title: string | null
          linkedin_url: string | null
          phone: string | null
          projects: string | null
          resume_path: string | null
          resume_summary: string | null
          target_company: string | null
          target_role: string | null
          technical_skills: string | null
          updated_at: string
          use_concerns: boolean
          use_resume: boolean
          work_experience: string | null
        }
        Insert: {
          accessibility?: string | null
          achievements?: string | null
          career_objectives?: string | null
          concerns?: string | null
          created_at?: string
          difficulty?: string | null
          education?: string | null
          email?: string | null
          employment_status?: string | null
          full_name?: string | null
          functional_skills?: string | null
          graduation_year?: number | null
          id: string
          industry?: string | null
          interview_category?: string | null
          interview_language?: string | null
          job_title?: string | null
          linkedin_url?: string | null
          phone?: string | null
          projects?: string | null
          resume_path?: string | null
          resume_summary?: string | null
          target_company?: string | null
          target_role?: string | null
          technical_skills?: string | null
          updated_at?: string
          use_concerns?: boolean
          use_resume?: boolean
          work_experience?: string | null
        }
        Update: {
          accessibility?: string | null
          achievements?: string | null
          career_objectives?: string | null
          concerns?: string | null
          created_at?: string
          difficulty?: string | null
          education?: string | null
          email?: string | null
          employment_status?: string | null
          full_name?: string | null
          functional_skills?: string | null
          graduation_year?: number | null
          id?: string
          industry?: string | null
          interview_category?: string | null
          interview_language?: string | null
          job_title?: string | null
          linkedin_url?: string | null
          phone?: string | null
          projects?: string | null
          resume_path?: string | null
          resume_summary?: string | null
          target_company?: string | null
          target_role?: string | null
          technical_skills?: string | null
          updated_at?: string
          use_concerns?: boolean
          use_resume?: boolean
          work_experience?: string | null
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
      [_ in never]: never
    }
    Functions: {
      book_interview_slot: { Args: { _slot_id: string }; Returns: string }
      cancel_interview_booking: {
        Args: { _booking_id: string }
        Returns: undefined
      }
      credit_balance: { Args: { _user_id: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      interview_slot_availability: {
        Args: never
        Returns: {
          capacity: number
          ends_at: string
          id: string
          remaining: number
          starts_at: string
        }[]
      }
      score_benchmark: {
        Args: { _category: string }
        Returns: {
          avg_communication: number
          avg_general: number
          avg_overall: number
          avg_practical: number
          avg_resume: number
          sample_size: number
          scope: string
        }[]
      }
      start_interview: { Args: never; Returns: string }
    }
    Enums: {
      app_role:
        | "admin"
        | "student"
        | "operations_admin"
        | "support_agent"
        | "analyst"
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
      app_role: [
        "admin",
        "student",
        "operations_admin",
        "support_agent",
        "analyst",
      ],
    },
  },
} as const
