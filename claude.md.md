# 📚 Blueprint: Open Library & Knowledge Hub (Mobile-First via LINE LIFF)
**Project Owner:** กิตติชน สนิทเชื้อ
**Vision:** แพลตฟอร์ม "หอสมุดดิจิทัล" ที่มอบมูลค่าให้สังคมผ่านหนังสือแปล Public Domain และสร้างรายได้ยั่งยืนจากผลงานส่วนตัวและระบบสมาชิก

---

## 🛠 1. Technical Stack (The Modern Core)
* **Frontend:** Next.js 14+ (App Router) - เน้นความเร็วและ SEO
* **UI/UX:** Tailwind CSS + Shadcn/UI - ปรับแต่งหน้า Reader ให้คลีนและสบายตาที่สุด
* **Platform:** LINE LIFF (LINE Front-end Framework) - เน้นการใช้งานภายในแอป LINE
* **Backend/Database:** Supabase - จัดการ Auth, Database และระบบ Real-time
* **Payment:** Omise (Opn) - รองรับ Thai QR Code (PromptPay) และบัตรเครดิต
* **Shipping:** ShipPop API - เชื่อมต่อระบบขนส่งและออกใบจ่าหน้าอัตโนมัติ
* **Notifications:** LINE Messaging API - แจ้งเตือนสถานะการสั่งซื้อและเลขพัสดุ

---

## 🗄 2. Database Schema (Supabase SQL)
*โครงสร้างฐานข้อมูลที่รองรับระบบสมาชิก เครดิต และสต็อกสินค้า*

```sql
-- 1. Profiles & Wallet
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  line_id TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  credits_balance INTEGER DEFAULT 0, -- 1 Credit = 1 THB
  membership_status TEXT DEFAULT 'free', -- 'free', 'premium_monthly'
  shipping_address TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Products (Books & Courses)
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  type TEXT, -- 'public_domain', 'premium_ebook', 'video_course', 'physical_book'
  price_credits INTEGER DEFAULT 0,
  stock_count INTEGER DEFAULT 0, -- สำหรับหนังสือเล่มจริง
  is_active BOOLEAN DEFAULT TRUE
);

-- 3. Content Chapters
CREATE TABLE chapters (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id),
  chapter_order INTEGER,
  title TEXT,
  content_mdx TEXT, -- เนื้อหาบทความในรูปแบบ Markdown
  is_free BOOLEAN DEFAULT FALSE
);

-- 4. User Reading Progress
CREATE TABLE user_progress (
  user_id UUID REFERENCES profiles(id),
  product_id INTEGER REFERENCES products(id),
  last_chapter_id INTEGER,
  progress_percent INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, product_id)
);

-- 5. Orders & Logistics
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  product_id INTEGER REFERENCES products(id),
  status TEXT DEFAULT 'pending', -- 'paid', 'shipped'
  tracking_number TEXT,
  shippop_order_id TEXT,
  payment_method TEXT, -- 'credits', 'qr_code'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

3. UX/UI & Sitemap (LINE LIFF Interface)
Sidebar Menu (เมนูหลัก):

📖 หอสมุดอ่านฟรี (Public Domain)

💎 พรีเมียมคอนเทนต์ (ใช้เครดิต)

📦 สั่งซื้อเล่มจริง (Physical Shop)

💳 กระเป๋าเงิน & เครดิต (1 เครดิต = 1 บาท)

🚚 ติดตามพัสดุ (Order Tracking)

Modern Reader Mode:

มีแถบ Reading Progress ด้านบน

ปรับขนาด Font และโหมดมืด/สว่างได้

Dynamic CTA: เมื่ออ่านจบเล่ม/บท จะมีปุ่ม "สนับสนุนเล่มจริง" หรือ "ให้ทิปผู้แปล" ปรากฏขึ้น

Admin Dashboard:

สรุปยอดขายรายวัน (Membership vs Credits vs Physical)

ระบบจัดการสต็อก (Inventory Management)

ปุ่มสร้างใบจ่าหน้า ShipPop และตัดสต็อกอัตโนมัติ

🤖 4. Claude Code Master Prompts
ใช้ชุดคำสั่งนี้กับ Claude Code เพื่อสร้างระบบทีละส่วน

Step 1: โครงสร้างพื้นฐานและ LINE Auth
"Create a Next.js 14 project using Tailwind CSS. Integrate LINE LIFF for authentication. Use Supabase for the backend. After LINE Login, synchronize user profile and store 'line_id' in the Supabase 'profiles' table. Design a mobile-first sidebar navigation."

Step 2: ระบบ Reader และ Progress Tracking
"Develop a Reader component that renders MDX content from Supabase. Include a scroll listener that saves reading progress to 'user_progress' table every 5 seconds. Add font-size adjustment (14px-22px) and a progress bar at the top."

Step 3: ระบบ Credit & Wallet (Omise)
"Implement a Credit Wallet system (1 Credit = 1 THB). Create a Top-up page integrated with Omise (Opn) for PromptPay. When payment is confirmed, update 'credits_balance' in Supabase and send a LINE notification to the user."

Step 4: ระบบสั่งซื้อเล่มจริงและสต็อก
"Create a 'Physical Store' module. When a user buys a book, deduct 1 from 'stock_count' in 'products' table. Create an Admin page to view paid orders and integrate ShipPop API to generate shipping labels and update tracking numbers."

📈 5. Business & Marketing Logic
Value First: ใช้หนังสือ Public Domain ที่แปลอย่างดีเป็นตัวดึง Traffic และสร้างชื่อเสียง

Frictionless: เน้นการ Login และจ่ายเงินผ่าน LINE (LIFF) เพื่อลดขั้นตอนที่ยุ่งยาก

Hybrid Revenue: * รายเดือน (Subscription) สำหรับขาประจำ

ซื้อรายเล่ม (Credits) สำหรับคนอ่านเฉพาะเรื่อง

เล่มจริง (Physical) สำหรับแฟนพันธุ์แท้