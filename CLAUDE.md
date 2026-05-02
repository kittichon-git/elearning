# CLAUDE.md — หอสมุดดิจิทัล (Digital Library)

**Project Owner:** กิตติชน สนิทเชื้อ
**Repo:** https://github.com/kittichon-git/elearning
**Live:** https://elearning-xxx.vercel.app (Vercel)
**Vision:** แพลตฟอร์มอ่านหนังสือออนไลน์ Mobile-First ผ่าน LINE LIFF

**อัปเดตล่าสุด:** พฤษภาคม 2026

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router) |
| UI | Tailwind CSS + CSS Variables |
| Font | Sarabun (Google Fonts) — ภาษาไทยทั้งระบบ |
| Auth | Mock login (localStorage) → เปลี่ยนเป็น LINE LIFF Phase 2 |
| Database | Supabase (PostgreSQL, Free tier) |
| Content Source | Notion API (notion-to-md) |
| Markdown Render | react-markdown + remark-gfm + remark-breaks |
| Deploy | Vercel (auto-deploy จาก GitHub main branch) |

---

## หลักการทำงานของระบบ

### Content Flow
```
Notion Database
  → scripts/sync-notion.mjs (Notion API + notion-to-md)
  → Supabase (elearning_chapters.content_md)
  → Next.js Reader Page
  → ReactMarkdown render
  → ผู้อ่าน
```

### Auth Flow (Mock)
```
เปิดแอป → localStorage มี user?
  → ใช่: ไป /library
  → ไม่: หน้า Login (กรอกชื่อ)
      → insert elearning_profiles (Supabase)
      → บันทึก user ใน localStorage
      → ไป /library
```

### Reading Progress Flow
```
ผู้อ่าน scroll → onScroll event
  → คำนวณ percent = scrollTop / (scrollHeight - clientHeight)
  → debounce 5 วินาที → saveProgress()
  → upsert elearning_user_progress (user_id, book_id, last_chapter_id, percent)
```

---

## โครงสร้างโปรเจกต์

```
D:/elearning web/
├── app/
│   ├── globals.css               ← Sarabun font + CSS variables + reader styles
│   ├── layout.tsx                ← Root layout + AuthProvider
│   ├── page.tsx                  ← Login page
│   ├── library/
│   │   └── page.tsx              ← รายการหนังสือทั้งหมด
│   ├── book/
│   │   └── [id]/
│   │       └── page.tsx          ← Book detail + สารบัญ + progress
│   └── read/
│       └── [bookId]/
│           └── [chapterId]/
│               └── page.tsx      ← Reader (main page)
├── contexts/
│   └── AuthContext.tsx           ← Mock auth (localStorage + Supabase)
├── lib/
│   ├── supabase.ts               ← Supabase client
│   └── types.ts                  ← TypeScript types
├── scripts/
│   └── sync-notion.mjs           ← Notion → Supabase sync script
├── sql/
│   └── schema.sql                ← Supabase table definitions + RLS
├── .env.local                    ← ไม่ commit (ใน .gitignore)
├── .env.local.example
└── .gitignore
```

---

## Database Schema (Supabase)

ทุกตารางขึ้นต้นด้วย `elearning_`

```sql
-- ผู้ใช้ (mock auth)
elearning_profiles (id UUID, mock_user_id TEXT UNIQUE, display_name TEXT)

-- หนังสือ
elearning_books (id SERIAL, title TEXT, author TEXT, description TEXT, is_active BOOL)

-- บท (เนื้อหาเป็น Markdown)
elearning_chapters (id SERIAL, book_id INT, chapter_order INT, title TEXT, content_md TEXT)
-- UNIQUE (book_id, chapter_order)

-- ความคืบหน้า
elearning_user_progress (user_id UUID, book_id INT, last_chapter_id INT, progress_percent INT)
-- PRIMARY KEY (user_id, book_id)
```

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxx

# Notion (สำหรับ sync script เท่านั้น — ไม่ได้ใช้ใน frontend)
NOTION_TOKEN=secret_xxxx
NOTION_DATABASE_ID=xxxx
NOTION_BOOK_TITLE=ชื่อหนังสือ
NOTION_BOOK_AUTHOR=ชื่อผู้เขียน (optional)
```

---

## Notion Database Structure

script `sync-notion.mjs` อ่าน properties เหล่านี้:

| Property | Type | ใช้ทำอะไร |
|----------|------|---------|
| `ชื่อบท` | title | ชื่อบท |
| `บทที่` | number | ลำดับบท (0 = บทนำ) |

เนื้อหาบทดึงจาก **page body** (ไม่ใช่ property) ผ่าน notion-to-md

---

## Page Routes

| Route | หน้า | Auth |
|-------|------|------|
| `/` | Login | ไม่ต้อง |
| `/library` | รายการหนังสือ | ✓ |
| `/book/[id]` | Book detail + สารบัญ | ✓ |
| `/read/[bookId]/[chapterId]` | Reader | ✓ |

---

## Reader Features

- **Progress bar** — fixed top, สีทอง (#c8a96e), อัปเดตตาม scroll
- **Font size** — ปรับได้ 14–22px, บันทึกใน localStorage
- **Dark/Light mode** — toggle, บันทึกใน localStorage
- **TOC panel** — สารบัญ dropdown, highlight บทปัจจุบัน
- **Bottom nav** — prev/next chapter, แสดงเลข x/N
- **Auto-save** — บันทึก progress ทุก 5 วินาที หลัง scroll

---

## Color Scheme

```css
/* Light */
--reader-bg: #fafaf7
--reader-text: #1a1a1a
--reader-accent: #c8a96e   /* amber/gold */
--reader-border: #e5e7eb
--reader-surface: #ffffff

/* Dark */
--reader-bg: #1c1c1e
--reader-text: #e8e4dc
--reader-border: #2d2d2f
--reader-surface: #2c2c2e
```

---

## Phases

| Phase | Status | Feature |
|-------|--------|---------|
| Phase 1 | ✅ Done | Mock auth + Reader + Notion sync + Vercel deploy |
| Phase 2 | 🔜 Next | LINE LIFF auth จริง |
| Phase 3 | — | Credit wallet + Premium books |
| Phase 4 | — | Physical book shop |
| Phase 5 | — | Admin CMS |
