# CLAUDE.md — หอสมุดดิจิทัล (Digital Library)

**Project Owner:** กิตติชน สนิทเชื้อ
**Repo:** https://github.com/kittichon-git/elearning
**Vision:** แพลตฟอร์มอ่านหนังสือออนไลน์ Mobile-First ผ่าน LINE LIFF

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14+ (App Router) |
| UI | Tailwind CSS (ไม่ใช้ Shadcn ใน Phase 1) |
| Auth | Mock login (localStorage) → เปลี่ยนเป็น LINE LIFF ทีหลัง |
| Database | Supabase (Free tier) |
| Content | Markdown (.md) per chapter |
| Dev | Local (localhost:3000) |

---

## Phase 1 Scope — ทำวันนี้ 🎯

**เป้าหมาย:** ระบบอ่านหนังสือฟรี 1 เล่ม 24 บท พร้อม push ขึ้น GitHub

### Features ที่ต้องมี
- [ ] Mock login (กรอกชื่อ → เข้าใช้ได้เลย)
- [ ] หน้า Library — แสดงรายการหนังสือ
- [ ] หน้า Book Detail — สารบัญ 24 บท + ความคืบหน้า
- [ ] หน้า Reader — อ่านเนื้อหา Markdown สวยงาม
- [ ] Reader features: progress bar, font size 14–22px, dark/light mode
- [ ] Auto-save reading progress ทุก 5 วินาที → Supabase
- [ ] Chapter navigation (prev/next)
- [ ] TOC panel (สารบัญ popup ใน reader)

### ไม่ทำใน Phase 1
- LINE LIFF จริง
- ระบบ Credit / Payment
- Physical book shop
- Admin CMS
- Multi-book (เพิ่มทีหลัง)

---

## โครงสร้างโปรเจกต์

```
D:/elearning web/
├── app/
│   ├── globals.css           ← Thai font (Sarabun) + reader styles
│   ├── layout.tsx
│   ├── page.tsx              ← Login page
│   ├── library/
│   │   └── page.tsx          ← รายการหนังสือ
│   ├── book/
│   │   └── [id]/
│   │       └── page.tsx      ← Book detail + สารบัญ
│   └── read/
│       └── [bookId]/
│           └── [chapterId]/
│               └── page.tsx  ← Reader
├── contexts/
│   └── AuthContext.tsx       ← Mock auth (localStorage)
├── lib/
│   ├── supabase.ts
│   └── types.ts
├── sql/
│   └── schema.sql            ← รัน 1 ครั้งใน Supabase SQL Editor
├── .env.local.example
├── .env.local                ← ไม่ commit (ใน .gitignore)
├── .gitignore
├── package.json
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

---

## Database Schema (Supabase — ทุกตารางขึ้นต้น elearning_)

```sql
-- 1. elearning_profiles — ข้อมูลผู้ใช้ (mock auth)
CREATE TABLE elearning_profiles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_user_id TEXT UNIQUE NOT NULL,   -- สร้างจาก timestamp ใน browser
  display_name TEXT NOT NULL DEFAULT 'ผู้อ่าน',
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 2. elearning_books — รายการหนังสือ
CREATE TABLE elearning_books (
  id          SERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  author      TEXT,
  translator  TEXT,
  description TEXT,
  cover_url   TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. elearning_chapters — เนื้อหาแต่ละบท
CREATE TABLE elearning_chapters (
  id            SERIAL PRIMARY KEY,
  book_id       INTEGER REFERENCES elearning_books(id) ON DELETE CASCADE,
  chapter_order INTEGER NOT NULL,
  title         TEXT NOT NULL,
  content_md    TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (book_id, chapter_order)
);

-- 4. elearning_user_progress — ความคืบหน้าการอ่าน
CREATE TABLE elearning_user_progress (
  user_id          UUID REFERENCES elearning_profiles(id) ON DELETE CASCADE,
  book_id          INTEGER REFERENCES elearning_books(id) ON DELETE CASCADE,
  last_chapter_id  INTEGER REFERENCES elearning_chapters(id),
  progress_percent INTEGER DEFAULT 0,
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, book_id)
);
```

**Row Level Security:** เปิด RLS แต่ใช้ policy แบบ public (Phase 1 ยังไม่มี auth จริง)

---

## Environment Variables

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxx
```

---

## Page Routes

| Route | หน้า | Auth Required |
|-------|------|--------------|
| `/` | Login / Landing | ไม่ต้อง |
| `/library` | รายการหนังสือ | ✓ |
| `/book/[id]` | Book detail + สารบัญ | ✓ |
| `/read/[bookId]/[chapterId]` | Reader | ✓ |

---

## Reader UI Spec

### Typography
- Font: Sarabun (Google Fonts) — ทั้งระบบ
- Body: 17px default, ปรับได้ 14–22px
- Line-height: 1.9 (อ่านสบาย)
- Text-align: justify

### Layout
- Max-width: 672px (max-w-2xl) centered
- Padding: 20px sides, 40px top/bottom

### Components
| Component | รายละเอียด |
|-----------|-----------|
| Progress bar | Fixed top, 3px สีทอง (#c8a96e), อัปเดตตาม scroll |
| Header | Sticky — ปุ่มกลับ, ชื่อบท, ปุ่ม TOC, ปุ่ม Settings |
| Settings panel | Dropdown ใต้ header — slider font size + toggle dark/light |
| TOC panel | Dropdown ใต้ header — รายการบทพร้อม highlight บทปัจจุบัน |
| Content | Markdown render (react-markdown + remark-gfm) |
| Bottom nav | Prev chapter ← → Next chapter, แสดงเลข x/24 |

### Dark Mode
- ใช้ CSS variables: `--reader-bg`, `--reader-text`, `--reader-border`
- Toggle ด้วย class `dark` บน `<html>`
- บันทึกใน localStorage

### Markdown Styles (reader-content class)
| Element | Style |
|---------|-------|
| blockquote | border-left amber, bg เหลืองอ่อน, italic |
| table | header bg #2c3e50 สีขาว, สลับสีแถว |
| h1 | 1.5rem bold |
| h2 | 1.25rem bold |
| h3 | 1.1rem bold italic |
| code | Courier New, bg เทาอ่อน |

---

## Mock Auth Flow

```
เปิดแอป → localStorage มี user?
  → ใช่: ไป /library
  → ไม่: แสดงหน้า Login (กรอกชื่อ)
      → บันทึก profile ใน Supabase (elearning_profiles)
      → บันทึก user ใน localStorage
      → ไป /library
```

**หมายเหตุ:** mock_user_id = `mock_${Date.now()}` สร้างครั้งแรก ใช้ซ้ำจาก localStorage ตลอด

---

## Dependencies

```json
{
  "dependencies": {
    "next": "14.2.5",
    "react": "^18",
    "react-dom": "^18",
    "@supabase/supabase-js": "^2.44.4",
    "react-markdown": "^9.0.1",
    "remark-gfm": "^4.0.0",
    "lucide-react": "^0.400.0",
    "clsx": "^2.1.1"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "tailwindcss": "^3.4.1",
    "postcss": "^8",
    "autoprefixer": "^10.0.1"
  }
}
```

---

## ขั้นตอนเริ่มต้น (วันนี้)

```bash
# 1. ติดตั้ง dependencies
cd "D:/elearning web"
npm install

# 2. สร้าง .env.local ใส่ Supabase credentials
# 3. รัน schema.sql ใน Supabase SQL Editor
# 4. รัน dev server
npm run dev

# 5. Push GitHub
git init
git add .
git commit -m "feat: phase 1 - free reader with mock auth"
git remote add origin https://github.com/kittichon-git/elearning.git
git push -u origin main
```

---

## Phases ถัดไป (ยังไม่ทำ)

| Phase | Feature |
|-------|---------|
| Phase 2 | LINE LIFF auth จริง |
| Phase 3 | Credit wallet + Premium books |
| Phase 4 | Physical book shop + ShipPop |
| Phase 5 | Admin CMS (เพิ่มหนังสือ/บทผ่าน UI) |
| Phase 6 | LINE Messaging API notifications |
