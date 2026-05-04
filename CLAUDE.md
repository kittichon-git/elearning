# CLAUDE.md — หอสมุดดิจิทัล (Digital Library)

**Project Owner:** กิตติชน สนิทเชื้อ
**Repo:** https://github.com/kittichon-git/elearning
**Live:** https://elearning-xxx.vercel.app (Vercel)
**Vision:** แพลตฟอร์มอ่านหนังสือออนไลน์ Mobile-First ผ่าน LINE LIFF

**อัปเดตล่าสุด:** 5 พฤษภาคม 2026

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
| HTML Render | dangerouslySetInnerHTML — render pre-built HTML จาก DB โดยตรง |
| MD→HTML Convert | marked — แปลง markdown + HTML จาก Notion เป็น HTML ตอน sync |
| Deploy | Vercel (auto-deploy จาก GitHub main branch) |

> **หมายเหตุ:** ลบ react-markdown / remark / rehype ออกแล้ว — reader ใช้ `dangerouslySetInnerHTML` กับ `content_html` ที่ pre-render ไว้ใน DB แทน เร็วกว่าและรองรับ HTML tags ได้ดีกว่า

---

## หลักการทำงานของระบบ

### Content Flow
```
Notion Database
  → scripts/sync-notion.mjs (Notion API + notion-to-md)
  → แปลงเป็น HTML ด้วย marked.parse()
  → Supabase (elearning_chapters.content_md + content_html)
  → Next.js Reader Page
  → dangerouslySetInnerHTML render
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
│   │   └── page.tsx              ← รายการหนังสือ (grid 2 คอลัมน์ + ปกหนังสือ)
│   ├── book/
│   │   └── [id]/
│   │       └── page.tsx          ← Book detail: ปก + คำอธิบาย + CTA + สารบัญ
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
elearning_books (
  id SERIAL, title TEXT, author TEXT, translator TEXT,
  description TEXT,   -- คำอธิบายยาว (sales pitch) แสดงใน Book Detail
  cover_url TEXT,     -- URL รูปปกหนังสือ (Supabase Storage หรือ URL ภายนอก)
  buy_url TEXT,       -- URL ลิงก์ซื้อหนังสือ (optional)
  is_active BOOL
)

-- บท (เนื้อหาเก็บทั้ง Markdown และ HTML)
elearning_chapters (
  id SERIAL, book_id INT, chapter_order INT, title TEXT,
  content_md TEXT,    -- Markdown ต้นฉบับ (สำรอง)
  content_html TEXT   -- HTML pre-rendered (ใช้งานจริง — เร็วกว่า)
)
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
NOTION_TOKEN=secret_xxxx        ← ใช้ได้กับทุก DB ใน workspace เดียวกัน
NOTION_DATABASE_ID=xxxx         ← เปลี่ยนทุกครั้งที่ sync หนังสือเล่มใหม่
NOTION_BOOK_TITLE=ชื่อหนังสือ   ← ต้องตรงกับชื่อที่ต้องการใน Supabase
NOTION_BOOK_AUTHOR=ชื่อผู้เขียน (optional)
```

**เพิ่มหนังสือเล่มใหม่:** เปลี่ยน `NOTION_DATABASE_ID` + `NOTION_BOOK_TITLE` + `NOTION_BOOK_AUTHOR` แล้วรัน sync ใหม่
**NOTION_TOKEN ไม่ต้องเปลี่ยน** แต่ต้อง share integration ให้ database ใหม่ใน Notion ด้วย

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
| `/library` | รายการหนังสือ (grid 2 คอลัมน์ + ปก) | ✓ |
| `/book/[id]` | Book detail: ปก + คำอธิบาย + CTA + สารบัญ | ✓ |
| `/read/[bookId]/[chapterId]` | Reader | ✓ |

---

## Library & Book Detail Features

### Library Page
- Grid 2 คอลัมน์ — ปกหนังสือ (aspect 3:4) + ชื่อ + ผู้แต่ง + คำอธิบายย่อ
- Placeholder ปกสีทองถ้าไม่มี `cover_url`

### Book Detail Page
- Hero: ปกหนังสือ (ซ้าย) + ชื่อ/ผู้แต่ง/progress (ขวา)
- คำอธิบายยาว (sales pitch) จาก `description`
- 3 ปุ่ม CTA:
  - **เริ่มอ่านเลย** / **อ่านต่อจากที่ค้างไว้** — ไปหน้า reader
  - **ดูสารบัญ** — scroll ลงไปส่วน TOC ด้านล่าง
  - **ซื้อหนังสือ** — แสดงเฉพาะเมื่อมี `buy_url`
- สารบัญพร้อม check mark บทที่อ่านแล้ว

---

## Reader Features

- **Progress bar** — fixed top, สีทอง (#c8a96e), อัปเดตตาม scroll
- **Font size** — ปรับได้ 14–22px, บันทึกใน localStorage
- **Dark/Light mode** — toggle, บันทึกใน localStorage
- **TOC panel** — สารบัญ dropdown, highlight บทปัจจุบัน
- **Bottom nav** — prev/next chapter, แสดงเลข x/N
- **Auto-save** — บันทึก progress ทุก 5 วินาที หลัง scroll
- **Toggle scroll fix** — ป้องกัน `<details>` ยุบตัวขณะ scroll บน mobile (touchend + memo)
- **Memoized content** — `ChapterContent` ใช้ `React.memo` ป้องกัน re-render จาก scrollProgress

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

## Notion Block Support

| Block Type | การแสดงผล |
|------------|----------|
| Callout | `<aside class="callout callout-{color}">` — มีสีตาม Notion (green/blue/yellow/red ฯลฯ) |
| Toggle | `<details><summary>` — กดเปิด/ปิดได้ |
| Toggleable Heading | `<details><summary><h1/2/3>` — heading ที่ toggle ได้ |
| Blockquote | `>` — กรอบสีทอง left border |
| Code block | `<pre><code>` — scroll horizontal ได้ |
| Table | render ครบ header/row |

### Custom Transformer (sync-notion.mjs)
- callout → ดึง `color` + `icon.emoji` + children → HTML ใน `<aside class="callout callout-{color}">`
- toggle / toggleable heading → `<details><summary>` พร้อม children เป็น HTML
- ทั้งหมด pre-render เป็น HTML ตอน sync ด้วย `marked.parse()` → เก็บใน `content_html`
- ต้องรัน `node scripts/sync-notion.mjs` ทุกครั้งที่แก้เนื้อหาใน Notion

---

## Phases

| Phase | Status | Feature |
|-------|--------|---------|
| Phase 1 | ✅ Done | Mock auth + Reader + Notion sync + Vercel deploy |
| Phase 2 | 🔜 Next | LINE LIFF auth จริง |
| Phase 3 | — | Credit wallet + Premium books |
| Phase 4 | — | Physical book shop |
| Phase 5 | — | Admin CMS |
