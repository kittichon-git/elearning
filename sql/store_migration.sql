-- ═══════════════════════════════════════════════════════════════
--  store migration — e-commerce layer สำหรับ elearning platform
--  รัน Supabase SQL Editor ได้เลย (idempotent)
--
--  หมายเหตุ: book_id ใช้ INTEGER (ตรงกับ elearning_books.id SERIAL)
-- ═══════════════════════════════════════════════════════════════

-- ── ENUM Types ───────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE order_status AS ENUM (
    'pending', 'paid', 'failed', 'refunded', 'cancelled', 'expired'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE outbox_status AS ENUM (
    'pending', 'processing', 'done', 'failed', 'dlq'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── store_coupons ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_coupons (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT UNIQUE NOT NULL,
  discount_satang INT NOT NULL DEFAULT 0,
  max_uses        INT,
  used_count      INT NOT NULL DEFAULT 0,
  expires_at      TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── store_orders ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id        UUID NOT NULL REFERENCES elearning_profiles(id) ON DELETE RESTRICT,
  book_id           INTEGER NOT NULL REFERENCES elearning_books(id) ON DELETE RESTRICT,
  status            order_status NOT NULL DEFAULT 'pending',
  amount_satang     INT NOT NULL,
  idempotency_key   TEXT UNIQUE NOT NULL,
  omise_charge_id   TEXT UNIQUE,
  payment_method    TEXT,
  coupon_id         UUID REFERENCES store_coupons(id),
  utm_source        TEXT,
  utm_medium        TEXT,
  utm_campaign      TEXT,
  utm_content       TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at           TIMESTAMPTZ,
  expires_at        TIMESTAMPTZ
);

-- ── store_payment_events ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_payment_events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       UUID NOT NULL REFERENCES store_orders(id) ON DELETE CASCADE,
  event_type     TEXT NOT NULL,
  omise_event_id TEXT UNIQUE,
  raw_payload    JSONB NOT NULL DEFAULT '{}',
  received_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── store_enrollments ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_enrollments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id       UUID NOT NULL REFERENCES elearning_profiles(id) ON DELETE RESTRICT,
  book_id          INTEGER NOT NULL REFERENCES elearning_books(id) ON DELETE RESTRICT,
  order_id         UUID REFERENCES store_orders(id),
  enrollment_token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  line_user_id     TEXT,
  granted_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at       TIMESTAMPTZ,
  UNIQUE (profile_id, book_id)
);

-- ── store_line_bindings ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_line_bindings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   UUID NOT NULL REFERENCES elearning_profiles(id) ON DELETE CASCADE,
  line_user_id TEXT UNIQUE NOT NULL,
  bound_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── store_outbox ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_outbox (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID REFERENCES store_orders(id) ON DELETE SET NULL,
  event_type   TEXT NOT NULL,
  payload      JSONB NOT NULL DEFAULT '{}',
  status       outbox_status NOT NULL DEFAULT 'pending',
  attempts     INT NOT NULL DEFAULT 0,
  last_error   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_store_orders_status         ON store_orders (status);
CREATE INDEX IF NOT EXISTS idx_store_orders_profile_id     ON store_orders (profile_id);
CREATE INDEX IF NOT EXISTS idx_store_orders_omise_charge   ON store_orders (omise_charge_id) WHERE omise_charge_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_store_orders_created_at     ON store_orders (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_store_payment_events_order  ON store_payment_events (order_id);

CREATE INDEX IF NOT EXISTS idx_store_enrollments_token     ON store_enrollments (enrollment_token);
CREATE INDEX IF NOT EXISTS idx_store_enrollments_line      ON store_enrollments (line_user_id) WHERE line_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_store_outbox_status_created ON store_outbox (status, created_at);

-- ── Row Level Security ───────────────────────────────────────
ALTER TABLE store_coupons         ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_orders          ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_payment_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_enrollments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_line_bindings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_outbox          ENABLE ROW LEVEL SECURITY;

-- store_orders: user เห็นเฉพาะ order ของตัวเอง
CREATE POLICY "orders_select_own" ON store_orders
  FOR SELECT USING (profile_id = auth.uid());

-- store_enrollments: user เห็นเฉพาะ enrollment ของตัวเองที่ยังไม่ถูก revoke
CREATE POLICY "enrollments_select_own" ON store_enrollments
  FOR SELECT USING (profile_id = auth.uid() AND revoked_at IS NULL);

-- store_coupons: อ่านได้ทุกคน (ต้องการแสดงส่วนลด)
CREATE POLICY "coupons_select_all" ON store_coupons
  FOR SELECT USING (is_active = TRUE);

-- service_role bypass ทุกตาราง (ใช้สำหรับ server-side mutations)
-- Supabase service_role bypass RLS โดยอัตโนมัติ ไม่ต้อง policy เพิ่ม

-- ── Seed Data ────────────────────────────────────────────────
INSERT INTO store_coupons (code, discount_satang, max_uses, expires_at)
VALUES ('COMEBACK100', 10000, 1000, NOW() + INTERVAL '90 days')
ON CONFLICT (code) DO NOTHING;
