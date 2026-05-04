export interface Book {
  id: number
  title: string
  author: string | null
  translator: string | null
  description: string | null
  cover_url: string | null
  is_active: boolean
  created_at: string
}

export interface Chapter {
  id: number
  book_id: number
  chapter_order: number
  title: string
  content_md: string
  content_html: string | null
  created_at: string
}

export interface UserProgress {
  user_id: string
  book_id: number
  last_chapter_id: number | null
  progress_percent: number
  updated_at: string
}

export interface MockUser {
  id: string
  mock_user_id: string
  display_name: string
  avatar_url: string | null
}
