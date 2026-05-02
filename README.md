# หอสมุดดิจิทัล — E-Learning Reader

แพลตฟอร์มอ่านหนังสือออนไลน์ภาษาไทย สร้างด้วย Next.js + Supabase + Notion API

---

## เริ่มต้นใช้งาน (Local Development)

### 1. Clone & ติดตั้ง Dependencies

```bash
git clone https://github.com/kittichon-git/elearning.git
cd elearning
npm install
```

### 2. ตั้งค่า Environment Variables

```bash
cp .env.local.example .env.local
```

แล้วใส่ค่าจริงใน `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxx

NOTION_TOKEN=secret_xxxx
NOTION_DATABASE_ID=xxxx
NOTION_BOOK_TITLE=ชื่อหนังสือ
NOTION_BOOK_AUTHOR=ชื่อผู้เขียน
```

### 3. สร้าง Supabase Tables

เปิด Supabase Dashboard → SQL Editor → รันไฟล์ `sql/schema.sql`

### 4. รัน Dev Server

```bash
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000)

---

## Sync เนื้อหาจาก Notion

### ทดสอบก่อน sync จริง

```bash
node scripts/sync-notion.mjs --dry-run
```

### Sync จริง

```bash
node scripts/sync-notion.mjs
```

ระบบจะดึงทุกบทจาก Notion Database → แปลงเป็น Markdown → บันทึกเข้า Supabase

### โครงสร้าง Notion Database ที่ต้องมี

| Property | Type | หมายเหตุ |
|----------|------|---------|
| `ชื่อบท` | Title | ชื่อบท |
| `บทที่` | Number | ลำดับบท (0 = บทนำ, 1, 2, 3...) |

เนื้อหาต้องอยู่ใน **page body** ไม่ใช่ property field

---

## การเพิ่มหนังสือเล่มใหม่

1. สร้าง Notion Database ใหม่
2. แชร์ให้ Notion Integration (Settings → Connections)
3. copy Database ID จาก URL ของ Notion
4. อัปเดต `.env.local`:
   ```env
   NOTION_DATABASE_ID=xxxx_ใหม่
   NOTION_BOOK_TITLE=ชื่อหนังสือเล่มใหม่
   ```
5. รัน sync:
   ```bash
   node scripts/sync-notion.mjs
   ```

---

## Deploy บน Vercel

โปรเจกต์ deploy บน Vercel — auto-deploy เมื่อ push ขึ้น `main` branch

### Environment Variables บน Vercel

Vercel Dashboard → Project → Settings → Environment Variables
ใส่ค่าเดียวกับ `.env.local` ทุกตัว

### Push และ Deploy

```bash
git add .
git commit -m "your message"
git push origin main
```

Vercel จะ deploy อัตโนมัติภายใน 1-2 นาที

---

## Pages

| Route | หน้า |
|-------|------|
| `/` | Login (Mock) |
| `/library` | รายการหนังสือทั้งหมด |
| `/book/[id]` | สารบัญ + ความคืบหน้า |
| `/read/[bookId]/[chapterId]` | Reader |

## Features

- Mock login — กรอกชื่อแล้วเข้าใช้ได้เลย
- Reader: progress bar, ปรับ font size, dark/light mode
- Auto-save ความคืบหน้าทุก 5 วินาที
- Chapter navigation + TOC panel
- Sync เนื้อหาจาก Notion โดยตรง

## Tech Stack

- **Next.js 14** (App Router)
- **Tailwind CSS** — Responsive + Dark mode
- **Supabase** — PostgreSQL Database
- **Notion API** + notion-to-md — Content management
- **react-markdown** + remark-gfm + remark-breaks
- **Vercel** — Hosting

## Phases

| Phase | Status | Feature |
|-------|--------|---------|
| Phase 1 | ✅ Done | Mock auth + Reader + Notion sync + Vercel |
| Phase 2 | 🔜 | LINE LIFF auth จริง |
| Phase 3 | — | Credit wallet + Premium books |
| Phase 4 | — | Physical book shop |
| Phase 5 | — | Admin CMS |
