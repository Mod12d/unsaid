// supabase/migrations/0001_init.sql に対応する型。
// Supabase のプロジェクトができたら、次のコマンドで生成した型に置き換える:
//   npx supabase gen types typescript --project-id <id> > app/types/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '12'
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          created_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          created_at?: string
        }
        Relationships: []
      }
      artworks: {
        Row: {
          id: string
          source: string
          source_id: string
          title: string
          artist: string | null
          date_display: string | null
          image_url: string
          source_url: string | null
          license: string
          created_at: string
        }
        Insert: {
          id?: string
          source: string
          source_id: string
          title: string
          artist?: string | null
          date_display?: string | null
          image_url: string
          source_url?: string | null
          license?: string
          created_at?: string
        }
        Update: {
          id?: string
          source?: string
          source_id?: string
          title?: string
          artist?: string | null
          date_display?: string | null
          image_url?: string
          source_url?: string | null
          license?: string
          created_at?: string
        }
        Relationships: []
      }
      prompts: {
        Row: {
          id: string
          date: string
          artwork_id: string
          constraint_text: string
          target_length: number
          created_at: string
        }
        Insert: {
          id?: string
          date: string
          artwork_id: string
          constraint_text: string
          target_length?: number
          created_at?: string
        }
        Update: {
          id?: string
          date?: string
          artwork_id?: string
          constraint_text?: string
          target_length?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'prompts_artwork_id_fkey'
            columns: ['artwork_id']
            isOneToOne: false
            referencedRelation: 'artworks'
            referencedColumns: ['id']
          },
        ]
      }
      reference_texts: {
        Row: {
          id: string
          prompt_id: string
          body: string
          model: string
          created_at: string
        }
        Insert: {
          id?: string
          prompt_id: string
          body: string
          model: string
          created_at?: string
        }
        Update: {
          id?: string
          prompt_id?: string
          body?: string
          model?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'reference_texts_prompt_id_fkey'
            columns: ['prompt_id']
            isOneToOne: false
            referencedRelation: 'prompts'
            referencedColumns: ['id']
          },
        ]
      }
      submissions: {
        Row: {
          id: string
          user_id: string
          prompt_id: string
          body: string
          char_count: number
          visibility: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          prompt_id: string
          body: string
          char_count: number
          visibility?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          prompt_id?: string
          body?: string
          char_count?: number
          visibility?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'submissions_prompt_id_fkey'
            columns: ['prompt_id']
            isOneToOne: false
            referencedRelation: 'prompts'
            referencedColumns: ['id']
          },
        ]
      }
      reviews: {
        Row: {
          id: string
          submission_id: string
          rubric_version: string
          score_selection: number
          score_metaphor: number
          score_rhythm: number
          score_body: number
          constraint_kept: boolean
          comments: Json
          overall: string
          model: string
          created_at: string
        }
        Insert: {
          id?: string
          submission_id: string
          rubric_version: string
          score_selection: number
          score_metaphor: number
          score_rhythm: number
          score_body: number
          constraint_kept: boolean
          comments: Json
          overall: string
          model: string
          created_at?: string
        }
        Update: {
          id?: string
          submission_id?: string
          rubric_version?: string
          score_selection?: number
          score_metaphor?: number
          score_rhythm?: number
          score_body?: number
          constraint_kept?: boolean
          comments?: Json
          overall?: string
          model?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'reviews_submission_id_fkey'
            columns: ['submission_id']
            isOneToOne: false
            referencedRelation: 'submissions'
            referencedColumns: ['id']
          },
        ]
      }
      likes: {
        Row: {
          user_id: string
          submission_id: string
          created_at: string
        }
        Insert: {
          user_id?: string
          submission_id: string
          created_at?: string
        }
        Update: {
          user_id?: string
          submission_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'likes_submission_id_fkey'
            columns: ['submission_id']
            isOneToOne: false
            referencedRelation: 'submissions'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      prompt_rankings: {
        Row: {
          prompt_id: string | null
          submission_id: string | null
          user_id: string | null
          rubric_version: string | null
          ai_score: number | null
          like_count: number | null
        }
        Relationships: []
      }
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
