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
import { marked } from 'marked'

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
const notion = new Client({
  auth: process.env.NOTION_TOKEN,
  timeoutMs: 60000,
})
const n2m = new NotionToMarkdown({ notionClient: notion })

// ── Helper: แปลง toggle children เป็น HTML ───────────────────────
async function toggleChildrenToHtml(blockId) {
  const childBlocks = await withRetry(() => n2m.pageToMarkdown(blockId))
  const childrenMd = n2m.toMarkdownString(childBlocks)?.parent || ''
  const cleaned = childrenMd.split('\n').map(l => l.replace(/^    /, '')).join('\n')
  return marked.parse(cleaned)
}

// ── Custom transformer: toggle block ─────────────────────────────
n2m.setCustomTransformer('toggle', async (block) => {
  const { toggle } = block
  const title = toggle.rich_text?.map(t => t.plain_text).join('') || 'ดูเพิ่มเติม'
  const childrenHtml = block.has_children ? await toggleChildrenToHtml(block.id) : ''
  return `\n\n<details>\n<summary>${title}</summary>\n<div class="toggle-body">\n${childrenHtml}\n</div>\n</details>\n\n`
})

// ── Custom transformer: toggleable headings (h1/h2/h3) ───────────
async function toggleableHeading(block, type) {
  const data = block[type]
  if (!data?.is_toggleable) return false // ใช้ default renderer ถ้าไม่ใช่ toggle
  const level = type.replace('heading_', '')
  const title = data.rich_text?.map(t => t.plain_text).join('') || ''
  const childrenHtml = block.has_children ? await toggleChildrenToHtml(block.id) : ''
  return `\n\n<details>\n<summary><h${level} style="display:inline">${title}</h${level}></summary>\n<div class="toggle-body">\n${childrenHtml}\n</div>\n</details>\n\n`
}

n2m.setCustomTransformer('heading_1', async (block) => toggleableHeading(block, 'heading_1'))
n2m.setCustomTransformer('heading_2', async (block) => toggleableHeading(block, 'heading_2'))
n2m.setCustomTransformer('heading_3', async (block) => toggleableHeading(block, 'heading_3'))

// ── Custom transformer: callout → <aside class="callout-COLOR"> ──
n2m.setCustomTransformer('callout', async (block) => {
  const { callout } = block
  const color = (callout.color || 'default').replace('_background', '')
  const emoji = callout.icon?.type === 'emoji' ? callout.icon.emoji : ''
  const headerText = callout.rich_text?.map(t => {
    let s = t.plain_text
    if (t.annotations?.bold) s = `**${s}**`
    if (t.annotations?.italic) s = `*${s}*`
    return s
  }).join('') || ''

  // ดึง children blocks (bullet points ฯลฯ ข้างใน callout)
  let childrenMd = ''
  if (block.has_children) {
    const childBlocks = await withRetry(() => n2m.pageToMarkdown(block.id))
    childrenMd = n2m.toMarkdownString(childBlocks)?.parent || ''
  }

  const iconHtml = emoji ? `<span class="callout-icon">${emoji}</span>` : ''
  const headerHtml = headerText ? `<strong>${headerText}</strong>` : ''
  const childrenHtml = childrenMd ? marked.parse(childrenMd) : ''
  const body = [headerHtml, childrenHtml].filter(Boolean).join('\n')

  return `\n\n<aside class="callout callout-${color}">\n${iconHtml}\n<div class="callout-body">\n${body}\n</div>\n</aside>\n\n`
})

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

// ── Retry wrapper ────────────────────────────────────────
async function withRetry(fn, retries = 3, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (e) {
      if (i < retries - 1 && (e.code === 'notionhq_client_request_timeout' || e.status === 429)) {
        const wait = delay * (i + 1)
        process.stdout.write(` [retry ${i + 1} in ${wait/1000}s]`)
        await new Promise(r => setTimeout(r, wait))
      } else throw e
    }
  }
}

// ── แปลง page เป็น Markdown ─────────────────────────────
async function pageToMarkdown(pageId) {
  const blocks = await n2m.pageToMarkdown(pageId)
  const md = n2m.toMarkdownString(blocks)?.parent ?? ''
  return md
    .split('\n')
    .map(line => line.replace(/^    /, ''))  // ลบ 4-space indentation
    .join('\n')
    .replace(/(<\/(?:aside|details)>)([ \t]+)(#{1,6}\s)/g, '$1\n\n$3')  // heading หลัง closing tag
    .replace(/(<\/(?:aside|details)>)([ \t]+)(\S)/g, '$1\n\n$3')        // content อื่นหลัง closing tag
    .replace(/^• /gm, '- ')   // แปลง bullet • เป็น markdown -
    .replace(/\n• /g, '\n- ') // bullet ในบรรทัดถัดไป
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
        const content_md = await withRetry(() => pageToMarkdown(ch.page.id))
        const content_html = marked.parse(content_md)

        const { error } = await supabase
          .from('elearning_chapters')
          .upsert(
            {
              book_id: bookId,
              chapter_order: ch.chapterOrder,
              title: ch.chapterTitle,
              content_md,
              content_html,
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
