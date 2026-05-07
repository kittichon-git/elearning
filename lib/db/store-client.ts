/**
 * store-client.ts — Server-side typed helpers สำหรับ store tables
 *
 * ใช้ service_role key เท่านั้น (bypass RLS)
 * อย่า import ไฟล์นี้ใน client component เด็ดขาด
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

// ── Types ─────────────────────────────────────────────────────

export type OrderStatus =
  | 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled' | 'expired'

export type OutboxStatus =
  | 'pending' | 'processing' | 'done' | 'failed' | 'dlq'

export interface StoreOrder {
  id: string
  profile_id: string
  book_id: number
  status: OrderStatus
  amount_satang: number
  idempotency_key: string
  omise_charge_id: string | null
  payment_method: string | null
  coupon_id: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  metadata: Record<string, unknown>
  created_at: string
  paid_at: string | null
  expires_at: string | null
}

export interface StoreEnrollment {
  id: string
  profile_id: string
  book_id: number
  order_id: string | null
  enrollment_token: string
  line_user_id: string | null
  granted_at: string
  revoked_at: string | null
}

export interface StoreLineBinding {
  id: string
  profile_id: string
  line_user_id: string
  bound_at: string
}

export interface CreateOrderInput {
  profile_id: string
  book_id: number
  amount_satang: number
  idempotency_key: string
  payment_method?: string
  coupon_id?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  expires_at?: string
  metadata?: Record<string, unknown>
}

// ── Service Role Client ───────────────────────────────────────

function getServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(url, key, {
    auth: { persistSession: false },
  })
}

// ── Orders ────────────────────────────────────────────────────

export async function createOrder(input: CreateOrderInput): Promise<StoreOrder> {
  const sb = getServiceClient()
  const { data, error } = await sb
    .from('store_orders')
    .insert({
      profile_id:       input.profile_id,
      book_id:          input.book_id,
      amount_satang:    input.amount_satang,
      idempotency_key:  input.idempotency_key,
      payment_method:   input.payment_method ?? null,
      coupon_id:        input.coupon_id ?? null,
      utm_source:       input.utm_source ?? null,
      utm_medium:       input.utm_medium ?? null,
      utm_campaign:     input.utm_campaign ?? null,
      utm_content:      input.utm_content ?? null,
      expires_at:       input.expires_at ?? null,
      metadata:         input.metadata ?? {},
    })
    .select()
    .single()

  if (error) throw new Error(`createOrder: ${error.message}`)
  return data as StoreOrder
}

export async function getOrderById(orderId: string): Promise<StoreOrder | null> {
  const sb = getServiceClient()
  const { data, error } = await sb
    .from('store_orders')
    .select('*')
    .eq('id', orderId)
    .maybeSingle()

  if (error) throw new Error(`getOrderById: ${error.message}`)
  return data as StoreOrder | null
}

export async function getOrderByIdempotencyKey(key: string): Promise<StoreOrder | null> {
  const sb = getServiceClient()
  const { data, error } = await sb
    .from('store_orders')
    .select('*')
    .eq('idempotency_key', key)
    .maybeSingle()

  if (error) throw new Error(`getOrderByIdempotencyKey: ${error.message}`)
  return data as StoreOrder | null
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  extra?: { omise_charge_id?: string; paid_at?: string }
): Promise<StoreOrder> {
  const sb = getServiceClient()
  const { data, error } = await sb
    .from('store_orders')
    .update({
      status,
      ...(extra?.omise_charge_id ? { omise_charge_id: extra.omise_charge_id } : {}),
      ...(extra?.paid_at ? { paid_at: extra.paid_at } : {}),
    })
    .eq('id', orderId)
    .select()
    .single()

  if (error) throw new Error(`updateOrderStatus: ${error.message}`)
  return data as StoreOrder
}

// ── Enrollments ───────────────────────────────────────────────

export async function createEnrollment(input: {
  profile_id: string
  book_id: number
  order_id?: string
  line_user_id?: string
}): Promise<StoreEnrollment> {
  const sb = getServiceClient()
  const { data, error } = await sb
    .from('store_enrollments')
    .insert({
      profile_id:   input.profile_id,
      book_id:      input.book_id,
      order_id:     input.order_id ?? null,
      line_user_id: input.line_user_id ?? null,
    })
    .select()
    .single()

  if (error) throw new Error(`createEnrollment: ${error.message}`)
  return data as StoreEnrollment
}

export async function getEnrollmentByToken(token: string): Promise<StoreEnrollment | null> {
  const sb = getServiceClient()
  const { data, error } = await sb
    .from('store_enrollments')
    .select('*')
    .eq('enrollment_token', token)
    .is('revoked_at', null)
    .maybeSingle()

  if (error) throw new Error(`getEnrollmentByToken: ${error.message}`)
  return data as StoreEnrollment | null
}

// ── LINE Bindings ─────────────────────────────────────────────

export async function bindLineUser(input: {
  profile_id: string
  line_user_id: string
}): Promise<StoreLineBinding> {
  const sb = getServiceClient()
  const { data, error } = await sb
    .from('store_line_bindings')
    .upsert(
      { profile_id: input.profile_id, line_user_id: input.line_user_id },
      { onConflict: 'line_user_id' }
    )
    .select()
    .single()

  if (error) throw new Error(`bindLineUser: ${error.message}`)
  return data as StoreLineBinding
}

export async function getLineBinding(lineUserId: string): Promise<StoreLineBinding | null> {
  const sb = getServiceClient()
  const { data, error } = await sb
    .from('store_line_bindings')
    .select('*')
    .eq('line_user_id', lineUserId)
    .maybeSingle()

  if (error) throw new Error(`getLineBinding: ${error.message}`)
  return data as StoreLineBinding | null
}

// ── Outbox ────────────────────────────────────────────────────

export async function addOutboxEvent(input: {
  order_id?: string
  event_type: string
  payload: Record<string, unknown>
}): Promise<void> {
  const sb = getServiceClient()
  const { error } = await sb
    .from('store_outbox')
    .insert({
      order_id:   input.order_id ?? null,
      event_type: input.event_type,
      payload:    input.payload,
    })

  if (error) throw new Error(`addOutboxEvent: ${error.message}`)
}
