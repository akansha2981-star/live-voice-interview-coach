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
      announcement_comments: {
        Row: {
          announcement_id: string
          author_name: string
          body: string
          created_at: string
          from_staff: boolean
          id: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          author_name?: string
          body: string
          created_at?: string
          from_staff?: boolean
          id?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          author_name?: string
          body?: string
          created_at?: string
          from_staff?: boolean
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_comments_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_likes: {
        Row: {
          announcement_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_likes_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          body: string | null
          created_at: string
          created_by: string | null
          id: string
          image_path: string | null
          link_url: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          image_path?: string | null
          link_url?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          image_path?: string | null
          link_url?: string | null
        }
        Relationships: []
      }
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
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          id: string
          target_user: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          target_user?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          target_user?: string | null
        }
        Relationships: []
      }
      college_training_docs: {
        Row: {
          college_id: string
          created_at: string
          created_by: string | null
          error: string | null
          file_path: string
          id: string
          kind: string
          knowledge: Json | null
          mime_type: string | null
          processed_at: string | null
          status: string
          title: string
        }
        Insert: {
          college_id: string
          created_at?: string
          created_by?: string | null
          error?: string | null
          file_path: string
          id?: string
          kind?: string
          knowledge?: Json | null
          mime_type?: string | null
          processed_at?: string | null
          status?: string
          title: string
        }
        Update: {
          college_id?: string
          created_at?: string
          created_by?: string | null
          error?: string | null
          file_path?: string
          id?: string
          kind?: string
          knowledge?: Json | null
          mime_type?: string | null
          processed_at?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "college_training_docs_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      colleges: {
        Row: {
          active: boolean
          created_at: string
          duration_minutes: number
          id: string
          name: string
          question_count: number
          question_max_seconds: number
          question_min_seconds: number
          sop_requirements: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          duration_minutes?: number
          id?: string
          name: string
          question_count?: number
          question_max_seconds?: number
          question_min_seconds?: number
          sop_requirements?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          duration_minutes?: number
          id?: string
          name?: string
          question_count?: number
          question_max_seconds?: number
          question_min_seconds?: number
          sop_requirements?: string | null
        }
        Relationships: []
      }
      course_purchases: {
        Row: {
          amount: number | null
          course_id: string | null
          course_name: string
          created_at: string
          created_by: string | null
          currency: string | null
          id: string
          interview_credits: number
          order_id: string | null
          payment_status: string | null
          purchased_at: string
          source: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          course_id?: string | null
          course_name: string
          created_at?: string
          created_by?: string | null
          currency?: string | null
          id?: string
          interview_credits?: number
          order_id?: string | null
          payment_status?: string | null
          purchased_at?: string
          source?: string
          user_id: string
        }
        Update: {
          amount?: number | null
          course_id?: string | null
          course_name?: string
          created_at?: string
          created_by?: string | null
          currency?: string | null
          id?: string
          interview_credits?: number
          order_id?: string | null
          payment_status?: string | null
          purchased_at?: string
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_purchases_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          actual_price: number
          created_at: string
          created_by: string | null
          credits: number
          deliverables: Json
          description: string | null
          final_price: number
          id: string
          name: string
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          actual_price: number
          created_at?: string
          created_by?: string | null
          credits: number
          deliverables?: Json
          description?: string | null
          final_price: number
          id?: string
          name: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          actual_price?: number
          created_at?: string
          created_by?: string | null
          credits?: number
          deliverables?: Json
          description?: string | null
          final_price?: number
          id?: string
          name?: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
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
      finance_balances: {
        Row: {
          as_of: string
          balance: number
          created_at: string
          created_by: string | null
          currency: string
          id: string
          notes: string
          provider: string
          spending_limit: number | null
        }
        Insert: {
          as_of: string
          balance: number
          created_at?: string
          created_by?: string | null
          currency: string
          id?: string
          notes?: string
          provider: string
          spending_limit?: number | null
        }
        Update: {
          as_of?: string
          balance?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          notes?: string
          provider?: string
          spending_limit?: number | null
        }
        Relationships: []
      }
      finance_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          currency: string
          id: string
          notes: string
          occurred_at: string
          product: string
          provider: string
          reference: string
          source: string
          voided_at: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by?: string | null
          currency: string
          id?: string
          notes?: string
          occurred_at: string
          product: string
          provider: string
          reference: string
          source?: string
          voided_at?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          notes?: string
          occurred_at?: string
          product?: string
          provider?: string
          reference?: string
          source?: string
          voided_at?: string | null
        }
        Relationships: []
      }
      finance_rates: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          effective_at: string
          id: string
          model: string
          per_quantity: number
          provider: string
          service: string
          unit: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency: string
          effective_at: string
          id?: string
          model: string
          per_quantity: number
          provider: string
          service: string
          unit: string
          unit_price: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          effective_at?: string
          id?: string
          model?: string
          per_quantity?: number
          provider?: string
          service?: string
          unit?: string
          unit_price?: number
        }
        Relationships: []
      }
      finance_usage: {
        Row: {
          cached_input_tokens: number | null
          estimates: Json
          event_key: string
          expense_id: string | null
          finalized: boolean
          id: string
          input_tokens: number | null
          model: string
          occurred_at: string
          output_tokens: number | null
          pricing_snapshot: Json
          product: string
          provider: string
          reasoning_tokens: number | null
          recorded_at: string
          seconds: number | null
          service: string
          status: string
          transaction_id: string | null
          user_id: string | null
        }
        Insert: {
          cached_input_tokens?: number | null
          estimates?: Json
          event_key: string
          expense_id?: string | null
          finalized?: boolean
          id?: string
          input_tokens?: number | null
          model: string
          occurred_at?: string
          output_tokens?: number | null
          pricing_snapshot?: Json
          product: string
          provider: string
          reasoning_tokens?: number | null
          recorded_at?: string
          seconds?: number | null
          service: string
          status: string
          transaction_id?: string | null
          user_id?: string | null
        }
        Update: {
          cached_input_tokens?: number | null
          estimates?: Json
          event_key?: string
          expense_id?: string | null
          finalized?: boolean
          id?: string
          input_tokens?: number | null
          model?: string
          occurred_at?: string
          output_tokens?: number | null
          pricing_snapshot?: Json
          product?: string
          provider?: string
          reasoning_tokens?: number | null
          recorded_at?: string
          seconds?: number | null
          service?: string
          status?: string
          transaction_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_usage_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "finance_expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_bookings: {
        Row: {
          actual_interview_at: string | null
          call_letter_path: string | null
          checked_at: string | null
          college_id: string | null
          college_name: string | null
          created_at: string
          id: string
          interview_id: string | null
          practice_only: boolean
          preflight: Json | null
          slot_id: string
          status: string
          user_id: string
        }
        Insert: {
          actual_interview_at?: string | null
          call_letter_path?: string | null
          checked_at?: string | null
          college_id?: string | null
          college_name?: string | null
          created_at?: string
          id?: string
          interview_id?: string | null
          practice_only?: boolean
          preflight?: Json | null
          slot_id: string
          status?: string
          user_id: string
        }
        Update: {
          actual_interview_at?: string | null
          call_letter_path?: string | null
          checked_at?: string | null
          college_id?: string | null
          college_name?: string | null
          created_at?: string
          id?: string
          interview_id?: string | null
          practice_only?: boolean
          preflight?: Json | null
          slot_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_bookings_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
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
      interview_settings: {
        Row: {
          duration_minutes: number
          id: number
          sop_tat_minutes: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          duration_minutes?: number
          id?: number
          sop_tat_minutes?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          duration_minutes?: number
          id?: number
          sop_tat_minutes?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
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
          limit_closed_reason: string | null
          limit_deadline: string | null
          limit_duration_seconds: number | null
          limit_question_count: number | null
          limit_question_max_seconds: number | null
          limit_question_min_seconds: number | null
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
          limit_closed_reason?: string | null
          limit_deadline?: string | null
          limit_duration_seconds?: number | null
          limit_question_count?: number | null
          limit_question_max_seconds?: number | null
          limit_question_min_seconds?: number | null
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
          limit_closed_reason?: string | null
          limit_deadline?: string | null
          limit_duration_seconds?: number | null
          limit_question_count?: number | null
          limit_question_max_seconds?: number | null
          limit_question_min_seconds?: number | null
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
          account_status: string
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
          account_status?: string
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
          account_status?: string
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
      resource_downloads: {
        Row: {
          downloaded_at: string
          id: string
          resource_id: string
          resource_title: string
          user_id: string
        }
        Insert: {
          downloaded_at?: string
          id?: string
          resource_id: string
          resource_title: string
          user_id: string
        }
        Update: {
          downloaded_at?: string
          id?: string
          resource_id?: string
          resource_title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_downloads_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          attachments: Json
          banner_path: string | null
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          event_at: string | null
          id: string
          instructions: string | null
          pdf_path: string | null
          published: boolean
          registration_url: string | null
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          attachments?: Json
          banner_path?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_at?: string | null
          id?: string
          instructions?: string | null
          pdf_path?: string | null
          published?: boolean
          registration_url?: string | null
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          attachments?: Json
          banner_path?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_at?: string | null
          id?: string
          instructions?: string | null
          pdf_path?: string | null
          published?: boolean
          registration_url?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      resume_analyses: {
        Row: {
          analysis_progress: Json | null
          ats_score: number | null
          completed_at: string | null
          created_at: string
          error: string | null
          extracted_text: string | null
          file_name: string
          file_path: string
          id: string
          improved_resume: Json | null
          mime_type: string | null
          report: Json | null
          status: string
          user_id: string
        }
        Insert: {
          analysis_progress?: Json | null
          ats_score?: number | null
          completed_at?: string | null
          created_at?: string
          error?: string | null
          extracted_text?: string | null
          file_name: string
          file_path: string
          id?: string
          improved_resume?: Json | null
          mime_type?: string | null
          report?: Json | null
          status?: string
          user_id: string
        }
        Update: {
          analysis_progress?: Json | null
          ats_score?: number | null
          completed_at?: string | null
          created_at?: string
          error?: string | null
          extracted_text?: string | null
          file_name?: string
          file_path?: string
          id?: string
          improved_resume?: Json | null
          mime_type?: string | null
          report?: Json | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      sop_reviews: {
        Row: {
          analysis_progress: Json | null
          college_id: string | null
          college_name: string
          completed_at: string | null
          created_at: string
          error: string | null
          expected_by: string
          extracted_text: string | null
          file_name: string
          file_path: string
          id: string
          mime_type: string | null
          overall_score: number | null
          report: Json | null
          samples_used: number
          status: string
          user_id: string
        }
        Insert: {
          analysis_progress?: Json | null
          college_id?: string | null
          college_name: string
          completed_at?: string | null
          created_at?: string
          error?: string | null
          expected_by?: string
          extracted_text?: string | null
          file_name: string
          file_path: string
          id?: string
          mime_type?: string | null
          overall_score?: number | null
          report?: Json | null
          samples_used?: number
          status?: string
          user_id: string
        }
        Update: {
          analysis_progress?: Json | null
          college_id?: string | null
          college_name?: string
          completed_at?: string | null
          created_at?: string
          error?: string | null
          expected_by?: string
          extracted_text?: string | null
          file_name?: string
          file_path?: string
          id?: string
          mime_type?: string | null
          overall_score?: number | null
          report?: Json | null
          samples_used?: number
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sop_reviews_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string
          id: string
          priority: string
          resolved_at: string | null
          status: string
          subject: string
          ticket_no: number
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          category: string
          created_at?: string
          id?: string
          priority?: string
          resolved_at?: string | null
          status?: string
          subject: string
          ticket_no?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          id?: string
          priority?: string
          resolved_at?: string | null
          status?: string
          subject?: string
          ticket_no?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          attachments: Json
          author_id: string
          body: string
          created_at: string
          from_staff: boolean
          id: string
          internal: boolean
          ticket_id: string
        }
        Insert: {
          attachments?: Json
          author_id: string
          body: string
          created_at?: string
          from_staff?: boolean
          id?: string
          internal?: boolean
          ticket_id: string
        }
        Update: {
          attachments?: Json
          author_id?: string
          body?: string
          created_at?: string
          from_staff?: boolean
          id?: string
          internal?: boolean
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
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
      admin_adjust_credits: {
        Args: { _delta: number; _reason: string; _user_id: string }
        Returns: number
      }
      admin_cancel_booking: {
        Args: { _booking_id: string; _status: string }
        Returns: undefined
      }
      admin_metrics: { Args: { _from: string; _to: string }; Returns: Json }
      admin_save_college_limits: {
        Args: {
          _count: number
          _duration: number
          _id: string
          _max: number
          _min: number
          _name: string
        }
        Returns: string
      }
      admin_set_account_status: {
        Args: { _status: string; _user_id: string }
        Returns: undefined
      }
      admin_set_role: {
        Args: {
          _email: string
          _grant: boolean
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: undefined
      }
      announcement_like_counts: {
        Args: { _ids: string[] }
        Returns: {
          announcement_id: string
          likes: number
        }[]
      }
      book_interview_slot: { Args: { _slot_id: string }; Returns: string }
      book_interview_with_details: {
        Args: {
          _actual_at: string
          _college: string
          _letter: string
          _practice: boolean
          _slot_id: string
        }
        Returns: string
      }
      can_operate: { Args: { _user_id: string }; Returns: boolean }
      can_read_finance: { Args: { _user_id: string }; Returns: boolean }
      can_support: { Args: { _user_id: string }; Returns: boolean }
      can_view_feed: { Args: { _user_id: string }; Returns: boolean }
      cancel_interview_booking: {
        Args: { _booking_id: string }
        Returns: undefined
      }
      credit_balance: { Args: { _user_id: string }; Returns: number }
      finance_record_usage: { Args: { _row: Json }; Returns: undefined }
      finance_save: { Args: { _data: Json; _kind: string }; Returns: string }
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
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      log_audit: {
        Args: { _action: string; _details: Json; _target: string }
        Returns: undefined
      }
      reopen_ticket: { Args: { _ticket_id: string }; Returns: undefined }
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
