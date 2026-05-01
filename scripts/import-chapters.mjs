/**
 * import-chapters.mjs — นำเข้าบท .md เข้า Supabase
 *
 * วิธีใช้ (ระบุไฟล์โดยตรง):
 *   node scripts/import-chapters.mjs "Buyer Psy xxx.md" "บทที่2 xxx.md" ...
 *
 * หรือวางไฟล์ .md ในโฟลเดอร์ content/ แล้วรัน:
 *   node scripts/import-chapters.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync, existsSync } from 'fs'
import { join, extname } from 'path'
import { config } from 'dotenv'

config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const BOOK_ID = 1

// ── ทำความสะอาด Notion export ────────────────────────────
const STRIP_PREFIXES = [
  'คำอธิบายแต่ละบท:',
  'บทที่:',
  'ภาค:',
  'สถานะ:',
  'แหล่งข้อมูล/อ้างอิง:',
  'เพจในเวิร์กสเปซ:',
]

function preprocessMd(text) {
  return text
    .split('\n')
    .map(line => {
      const s = line.trim()
      if (s.startsWith('เนื้อหา (Draft):'))
        return s.replace('เนื้อหา (Draft):', '').trim()
      if (STRIP_PREFIXES.some(p => s.startsWith(p))) return null
      return line
    })
    .filter(l => l !== null)
    .join('\n')
    .trim()
}

// ── Extract H1 title ─────────────────────────────────────
function extractTitle(content) {
  const m = content.match(/^#\s+(.+)$/m)
  return m ? m[1].replace(/"/g, '"').replace(/"/g, '"').trim() : 'ไม่มีชื่อบท'
}

// ── Extract บทที่ จาก Notion metadata ────────────────────
function extractChapterOrder(rawText) {
  const m = rawText.match(/^บทที่:\s*(\d+)/m)
  return m ? parseInt(m[1], 10) : null
}

// ── Main ─────────────────────────────────────────────────
async function main() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error('❌ ไม่พบ NEXT_PUBLIC_SUPABASE_URL ใน .env.local')
    process.exit(1)
  }

  // รับ path จาก argument หรือสแกนโฟลเดอร์ content/
  let filePaths = process.argv.slice(2)

  if (filePaths.length === 0) {
    const contentDir = './content'
    if (!existsSync(contentDir)) {
      console.error('❌ ไม่มีไฟล์ที่ระบุ และไม่มีโฟลเดอร์ content/')
      console.error('\nวิธีใช้:')
      console.error('  node scripts/import-chapters.mjs "ชื่อไฟล์.md" ...')
      console.error('  หรือวางไฟล์ใน content/ แล้วรันโดยไม่ระบุไฟล์')
      process.exit(1)
    }
    filePaths = readdirSync(contentDir)
      .filter(f => extname(f) === '.md')
      .sort()
      .map(f => join(contentDir, f))
  }

  console.log(`📚 พบ ${filePaths.length} ไฟล์\n`)

  const chapters = []

  for (const filePath of filePaths) {
    if (!existsSync(filePath)) {
      console.warn(`  ⚠️  ไม่พบไฟล์: ${filePath}`)
      continue
    }

    const raw = readFileSync(filePath, 'utf-8')
    const content = preprocessMd(raw)
    const title = extractTitle(content)
    const order = extractChapterOrder(raw)

    if (!order) {
      console.warn(`  ⚠️  ไม่พบ "บทที่:" ในไฟล์ ${filePath} — ข้ามไฟล์นี้`)
      continue
    }

    chapters.push({ book_id: BOOK_ID, chapter_order: order, title, content_md: content })
    console.log(`  ✓ บทที่ ${order}: ${title}`)
  }

  if (chapters.length === 0) {
    console.error('\n❌ ไม่มีบทที่นำเข้าได้')
    process.exit(1)
  }

  console.log(`\nกำลังบันทึก ${chapters.length} บท ลง Supabase...`)

  const { error } = await supabase
    .from('elearning_chapters')
    .upsert(chapters, { onConflict: 'book_id,chapter_order' })

  if (error) {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  }

  console.log(`\n✅ นำเข้าสำเร็จ ${chapters.length} บท!`)
}

main()
