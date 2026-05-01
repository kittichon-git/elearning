# หอสมุดดิจิทัล — Phase 1

ระบบอ่านหนังสือออนไลน์ Mobile-First ด้วย Next.js 14 + Supabase

## Stack
- **Next.js 14** (App Router)
- **Tailwind CSS** — Responsive + Dark mode
- **Supabase** — Database + Auth
- **React Markdown** — Render เนื้อหา .md

## Setup

### 1. Clone & Install
```bash
git clone https://github.com/kittichon-git/elearning.git
cd elearning
npm install
```

### 2. Environment Variables
```bash
cp .env.local.example .env.local
```
แก้ไข `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxx
```

### 3. Supabase Setup
รัน `sql/schema.sql` ใน Supabase SQL Editor ครั้งเดียว

### 4. Run
```bash
npm run dev
# เปิด http://localhost:3000
```

## Pages
| Route | หน้า |
|-------|------|
| `/` | Login (Mock) |
| `/library` | รายการหนังสือ |
| `/book/[id]` | สารบัญ + ความคืบหน้า |
| `/read/[bookId]/[chapterId]` | Reader |

## Features
- Mock login (กรอกชื่อ → เข้าใช้ได้เลย)
- Reader: progress bar, font size, dark/light mode
- Auto-save ความคืบหน้าทุก 5 วินาที
- Chapter navigation + TOC panel

## Phases
- **Phase 1** ✅ Free reading (ปัจจุบัน)
- Phase 2: LINE LIFF auth
- Phase 3: Credit + Premium books
- Phase 4: Physical shop
