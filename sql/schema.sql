-- ═══════════════════════════════════════════════════
--  elearning schema — Phase 1 (Free Reading)
-- ═══════════════════════════════════════════════════

-- 1. Profiles (mock auth — no LINE yet)
CREATE TABLE IF NOT EXISTS elearning_profiles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_user_id TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL DEFAULT 'ผู้อ่าน',
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Books
CREATE TABLE IF NOT EXISTS elearning_books (
  id          SERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  author      TEXT,
  translator  TEXT,
  description TEXT,
  cover_url   TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Chapters
CREATE TABLE IF NOT EXISTS elearning_chapters (
  id            SERIAL PRIMARY KEY,
  book_id       INTEGER REFERENCES elearning_books(id) ON DELETE CASCADE,
  chapter_order INTEGER NOT NULL,
  title         TEXT NOT NULL,
  content_md    TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (book_id, chapter_order)
);

-- 4. Reading Progress
CREATE TABLE IF NOT EXISTS elearning_user_progress (
  user_id          UUID REFERENCES elearning_profiles(id) ON DELETE CASCADE,
  book_id          INTEGER REFERENCES elearning_books(id) ON DELETE CASCADE,
  last_chapter_id  INTEGER REFERENCES elearning_chapters(id),
  progress_percent INTEGER DEFAULT 0,
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, book_id)
);

-- ── Row Level Security ──────────────────────────────
ALTER TABLE elearning_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE elearning_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE elearning_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE elearning_user_progress ENABLE ROW LEVEL SECURITY;

-- Public read for books & chapters
CREATE POLICY "books_select" ON elearning_books FOR SELECT USING (is_active = TRUE);
CREATE POLICY "chapters_select" ON elearning_chapters FOR SELECT USING (TRUE);

-- Profiles: anyone can insert/select (mock auth — no real auth.uid() yet)
CREATE POLICY "profiles_all" ON elearning_profiles FOR ALL USING (TRUE);

-- Progress: anyone can read/write (mock auth)
CREATE POLICY "progress_all" ON elearning_user_progress FOR ALL USING (TRUE);

-- ── Sample Data ─────────────────────────────────────
INSERT INTO elearning_books (title, author, description)
VALUES (
  'คนไม่ได้ซื้อสินค้า คนซื้อด้วย "ความรู้สึก"',
  'กิตติชน สนิทเชื้อ',
  'หลักจิตวิทยาการตัดสินใจซื้อ: คนซื้อด้วยอารมณ์แล้วหาเหตุผลทีหลัง พร้อมเทคนิคการเขียนที่แตะใจผู้อ่าน'
) ON CONFLICT DO NOTHING;
