// app/ と server/ の両方から使う型（Nuxt 4 の shared/ は自動インポートされる）

export interface Artwork {
  id: string
  source: string
  source_id: string
  title: string
  artist: string | null
  date_display: string | null
  image_url: string
  source_url: string | null
}

export interface Prompt {
  id: string
  date: string
  constraint_text: string
  target_length: number
  artworks: Artwork
}

export interface Submission {
  id: string
  prompt_id: string
  body: string
  char_count: number
  visibility: 'private' | 'public'
  created_at: string
}

export type ReviewAxis = 'selection' | 'metaphor' | 'rhythm' | 'body'

export interface Review {
  id: string
  submission_id: string
  rubric_version: string
  score_selection: number
  score_metaphor: number
  score_rhythm: number
  score_body: number
  constraint_kept: boolean
  comments: Record<ReviewAxis, string>
  overall: string
  model: string
}

export interface TodayResponse {
  prompt: Prompt | null
  submission: Submission | null
  review: Review | null
  reference: string | null
}
