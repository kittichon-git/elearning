/**
 * sync-notion.mjs — ดึงเนื้อหาจาก Notion แล้ว sync เข้า Supabase
 *
 * วิธีใช้:
 *   node scripts/sync-notion.mjs           ← sync ทุกเล่ม
 *   node scripts/sync-notion.mjs --dry-run  ← ดูผลลัพธ์โดยไม่บันทึก
 *
 * ต้องมีใน .env.local:
 *   NOTION_TOKEN=secret_xxx
 *   NOTION_DATABASE_ID=xxx
 */

import { Client } from '@notionhq/client'
import { NotionToMarkdown } from 'notion-to-md'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// ── โหลด .env.local ─────────────────────────────────────
function loadEnv() {
  try {
    const text = readFileSync('.env.local', 'utf-8')
    for (const line of text.split('\n')) {
      const s = line.trim()
      if (!s || s.startsWith('#')) continue
      const idx = s.indexOf('=')
      if (idx === -1) continue
      process.env[s.slice(0, idx).trim()] = s.slice(idx + 1).trim()
    }
  } catch {
    console.error('❌ ไม่พบไฟล์ .env.local')
    process.exit(1)
  }
}
loadEnv()

const DRY_RUN = process.argv.includes('--dry-run')

// ── Clients ──────────────────────────────────────────────
const notion = new Client({ auth: process.env.NOTION_TOKEN })
const n2m = new NotionToMarkdown({ notionClient: notion })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// ── ดึง properties จาก Notion page ──────────────────────
function getProp(page, name, type) {
  const prop = page.properties[name]
  if (!prop) return null
  if (type === 'title') return prop.title?.map(t => t.plain_text).join('') || null
  if (type === 'number') return prop.number ?? null
  if (type === 'rich_text') return prop.rich_text?.map(t => t.plain_text).join('') || null
  if (type === 'select') return prop.select?.name || null
  return null
}

// ── แปลง page เป็น Markdown ─────────────────────────────
async function pageToMarkdown(pageId) {
  const blocks = await n2m.pageToMarkdown(pageId)
  return n2m.toMarkdownString(blocks)?.parent ?? ''
}

// ── Upsert book ──────────────────────────────────────────
async function upsertBook(title, author, description) {
  const { data: existing } = await supabase
    .from('elearning_books')
    .select('id')
    .eq('title', title)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('elearning_books')
      .update({ author, description, is_active: true })
      .eq('id', existing.id)
    return existing.id
  }

  const { data } = await supabase
    .from('elearning_books')
    .insert({ title, author, description, is_active: true })
    .select('id')
    .single()
  return data.id
}

// ── Main ─────────────────────────────────────────────────
async function main() {
  console.log(`🔄 Sync Notion → Supabase${DRY_RUN ? ' (dry-run)' : ''}\n${'─'.repeat(40)}`)

  // ตรวจสอบว่าเป็น Database หรือ Page
  const targetId = process.env.NOTION_DATABASE_ID
  let pages = []

  const obj = await notion.pages.retrieve({ page_id: targetId }).catch(() => null)
    || await notion.databases.retrieve({ database_id: targetId }).catch(() => null)

  if (!obj) {
    console.error('❌ ไม่พบ Page หรือ Database ด้วย ID นี้ กรุณาตรวจสอบ NOTION_DATABASE_ID')
    process.exit(1)
  }

  if (obj.object === 'database') {
    // กรณีเป็น Database → query ได้เลย
    let cursor
    do {
      const res = await notion.databases.query({
        database_id: targetId,
        start_cursor: cursor,
        page_size: 100,
      })
      pages.push(...res.results)
      cursor = res.has_more ? res.next_cursor : undefined
    } while (cursor)
  } else {
    // กรณีเป็น Page → ดึง child pages
    const res = await notion.blocks.children.list({ block_id: targetId, page_size: 100 })
    const childPageIds = res.results
      .filter(b => b.type === 'child_page')
      .map(b => b.id)

    for (const id of childPageIds) {
      const page = await notion.pages.retrieve({ page_id: id })
      pages.push(page)
    }
  }

  console.log(`🔍 ประเภท: ${obj.object === 'database' ? 'Database' : 'Page (child pages)'}`)

  console.log(`📄 พบ ${pages.length} หน้าใน Notion\n`)

  const bookTitle = process.env.NOTION_BOOK_TITLE || 'หนังสือ'
  const bookAuthor = process.env.NOTION_BOOK_AUTHOR || null
  const chapters = []

  for (const page of pages) {
    const chapterTitle = getProp(page, 'ชื่อบท', 'title') || 'ไม่มีชื่อ'
    const chapterOrder = getProp(page, 'บทที่', 'number')

    if (chapterOrder === null) {
      console.warn(`⚠️  ข้าม "${chapterTitle}" — ไม่พบ property บทที่`)
      continue
    }

    chapters.push({ page, chapterTitle, chapterOrder })
  }

  chapters.sort((a, b) => a.chapterOrder - b.chapterOrder)

  const books = new Map()
  books.set(bookTitle, { title: bookTitle, author: bookAuthor, chapters })

  console.log(`📚 ${bookTitle} — ${chapters.length} บท`)

  // Sync แต่ละเล่ม
  for (const [bookTitle, book] of books) {
    console.log(`\n📖 ${bookTitle}`)

    const sortedChapters = book.chapters.sort((a, b) => a.chapterOrder - b.chapterOrder)

    if (DRY_RUN) {
      for (const ch of sortedChapters) {
        console.log(`   บทที่ ${String(ch.chapterOrder).padStart(2, '0')}: ${ch.chapterTitle}`)
      }
      continue
    }

    // Upsert book
    const bookId = await upsertBook(bookTitle, book.author, null)
    console.log(`   book_id: ${bookId}`)

    // Sync chapters
    let success = 0
    for (const ch of sortedChapters) {
      process.stdout.write(`   ⏳ บทที่ ${String(ch.chapterOrder).padStart(2, '0')}: ${ch.chapterTitle} ... `)
      try {
        const content_md = await pageToMarkdown(ch.page.id)

        const { error } = await supabase
          .from('elearning_chapters')
          .upsert(
            {
              book_id: bookId,
              chapter_order: ch.chapterOrder,
              title: ch.chapterTitle,
              content_md,
            },
            { onConflict: 'book_id,chapter_order' }
          )

        if (error) throw new Error(error.message)
        console.log('✓')
        success++
      } catch (e) {
        console.log(`❌ ${e.message}`)
      }

      // หน่วงเล็กน้อยป้องกัน rate limit
      await new Promise(r => setTimeout(r, 300))
    }

    console.log(`   ✅ sync สำเร็จ ${success}/${sortedChapters.length} บท`)
  }

  console.log(`\n${'─'.repeat(40)}\n✅ เสร็จสิ้น`)
}

main().catch(e => {
  console.error('❌ Error:', e.message)
  process.exit(1)
})
