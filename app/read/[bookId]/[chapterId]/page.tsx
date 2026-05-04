'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Chapter } from '@/lib/types'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import rehypeRaw from 'rehype-raw'
import {
  ArrowLeft, Settings, Sun, Moon,
  ChevronLeft, ChevronRight, List, X,
} from 'lucide-react'

export default function ReaderPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const bookId = Number(params.bookId)
  const chapterId = Number(params.chapterId)

  const [chapter, setChapter] = useState<Chapter | null>(null)
  const [allChapters, setAllChapters] = useState<Chapter[]>([])
  const [fetching, setFetching] = useState(true)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [fontSize, setFontSize] = useState(17)
  const [darkMode, setDarkMode] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showToc, setShowToc] = useState(false)

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auth guard
  useEffect(() => {
    if (!loading && !user) router.push('/')
  }, [user, loading, router])

  // Load preferences
  useEffect(() => {
    const savedFont = localStorage.getItem('reader_fontSize')
    if (savedFont) setFontSize(Number(savedFont))

    const savedDark = localStorage.getItem('reader_dark') === 'true'
    setDarkMode(savedDark)
    document.documentElement.classList.toggle('dark', savedDark)
  }, [])

  // Fetch chapter data
  useEffect(() => {
    if (!user || !chapterId || !bookId) return
    setFetching(true)
    setShowSettings(false)
    setShowToc(false)

    Promise.all([
      supabase
        .from('elearning_chapters')
        .select('*')
        .eq('id', chapterId)
        .single(),
      supabase
        .from('elearning_chapters')
        .select('*')
        .eq('book_id', bookId)
        .order('chapter_order'),
    ]).then(([chRes, allRes]) => {
      if (chRes.data) setChapter(chRes.data)
      if (allRes.data) setAllChapters(allRes.data)
      setFetching(false)
      window.scrollTo({ top: 0 })
    })
  }, [user, chapterId, bookId])

  // Save progress
  const saveProgress = useCallback(
    async (percent: number) => {
      if (!user || !bookId || !chapterId) return
      await supabase.from('elearning_user_progress').upsert(
        {
          user_id: user.id,
          book_id: bookId,
          last_chapter_id: chapterId,
          progress_percent: Math.min(percent, 100),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,book_id' }
      )
    },
    [user, bookId, chapterId]
  )

  // Scroll tracking
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement
      const total = el.scrollHeight - el.clientHeight
      const pct = total > 0 ? Math.round((el.scrollTop / total) * 100) : 0
      setScrollProgress(pct)

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => saveProgress(pct), 5000)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [saveProgress])

  const toggleDark = () => {
    const next = !darkMode
    setDarkMode(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('reader_dark', String(next))
  }

  const changeFontSize = (size: number) => {
    setFontSize(size)
    localStorage.setItem('reader_fontSize', String(size))
  }

  const currentIndex = allChapters.findIndex(c => c.id === chapterId)
  const prevChapter = currentIndex > 0 ? allChapters[currentIndex - 1] : null
  const nextChapter =
    currentIndex < allChapters.length - 1 ? allChapters[currentIndex + 1] : null

  const goToChapter = async (ch: Chapter) => {
    await saveProgress(scrollProgress)
    router.push(`/read/${bookId}/${ch.id}`)
  }

  if (loading || !user) return null

  return (
    <div className="min-h-screen" style={{ background: 'var(--reader-bg)' }}>
      {/* Progress Bar */}
      <div
        className="reading-progress-bar"
        style={{ width: `${scrollProgress}%` }}
      />

      {/* Header */}
      <header
        className="sticky top-0 z-40 border-b"
        style={{
          background: 'var(--reader-bg)',
          borderColor: 'var(--reader-border)',
        }}
      >
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-2">
          <button
            onClick={() => {
              saveProgress(scrollProgress)
              router.push(`/book/${bookId}`)
            }}
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex-1 min-w-0 px-1">
            <p className="text-xs truncate" style={{ color: 'var(--reader-secondary)' }}>
              บทที่ {chapter?.chapter_order ?? '…'} / {allChapters.length}
            </p>
            <p className="text-sm font-semibold truncate leading-tight">
              {chapter?.title ?? '…'}
            </p>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => { setShowToc(!showToc); setShowSettings(false) }}
              className={`p-2 rounded-lg transition-colors ${showToc ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setShowSettings(!showSettings); setShowToc(false) }}
              className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div
            className="border-t px-4 py-4"
            style={{ borderColor: 'var(--reader-border)', background: 'var(--reader-surface)' }}
          >
            <div className="max-w-2xl mx-auto flex items-center gap-5">
              {/* Font Size */}
              <div className="flex-1">
                <div className="flex justify-between mb-2">
                  <span className="text-xs" style={{ color: 'var(--reader-secondary)' }}>
                    ขนาดตัวอักษร
                  </span>
                  <span className="text-xs font-semibold text-amber-600">{fontSize}px</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: 'var(--reader-secondary)' }}>ก</span>
                  <input
                    type="range"
                    min={14}
                    max={22}
                    step={1}
                    value={fontSize}
                    onChange={e => changeFontSize(Number(e.target.value))}
                    className="flex-1 accent-amber-500"
                  />
                  <span className="text-base font-bold" style={{ color: 'var(--reader-secondary)' }}>ก</span>
                </div>
              </div>

              {/* Dark Mode */}
              <button
                onClick={toggleDark}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors flex-shrink-0"
                style={{ borderColor: 'var(--reader-border)' }}
              >
                {darkMode ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
                <span className="text-xs font-medium">
                  {darkMode ? 'สว่าง' : 'มืด'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* TOC Panel */}
        {showToc && (
          <div
            className="border-t max-h-72 overflow-y-auto"
            style={{ borderColor: 'var(--reader-border)', background: 'var(--reader-surface)' }}
          >
            {allChapters.map(ch => (
              <button
                key={ch.id}
                onClick={() => { setShowToc(false); goToChapter(ch) }}
                className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors ${
                  ch.id === chapterId
                    ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 font-semibold'
                    : 'hover:bg-black/3 dark:hover:bg-white/3'
                }`}
              >
                <span
                  className="text-xs w-5 text-center flex-shrink-0"
                  style={{ color: 'var(--reader-secondary)' }}
                >
                  {ch.chapter_order}
                </span>
                <span className="truncate">{ch.title}</span>
                {ch.id === chapterId && (
                  <span className="ml-auto flex-shrink-0 text-xs text-amber-600">● อยู่ที่นี่</span>
                )}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-5 pt-10 pb-6">
        {fetching ? (
          <div className="space-y-3 animate-pulse">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="h-4 rounded-full"
                style={{
                  background: 'var(--reader-border)',
                  width: i % 4 === 3 ? '65%' : '100%',
                }}
              />
            ))}
          </div>
        ) : chapter ? (
          <>
            {/* Chapter Header */}
            <div className="mb-8 pb-6 border-b" style={{ borderColor: 'var(--reader-border)' }}>
              <p
                className="text-xs font-semibold uppercase tracking-widest text-amber-600 mb-2"
              >
                บทที่ {chapter.chapter_order}
              </p>
              <h1
                className="font-bold leading-snug"
                style={{ fontSize: `${Math.round(fontSize * 1.35)}px` }}
              >
                {chapter.title}
              </h1>
            </div>

            {/* Markdown */}
            <div className="reader-content" style={{ fontSize: `${fontSize}px` }}>
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} rehypePlugins={[rehypeRaw]}>
                {chapter.content_md}
              </ReactMarkdown>
            </div>

            {/* End of chapter indicator */}
            <div
              className="mt-12 pt-6 border-t text-center"
              style={{ borderColor: 'var(--reader-border)' }}
            >
              {scrollProgress >= 90 ? (
                <p className="text-sm text-amber-600 font-medium">✓ อ่านบทนี้จบแล้ว</p>
              ) : (
                <p className="text-xs" style={{ color: 'var(--reader-secondary)' }}>
                  อ่านไปแล้ว {scrollProgress}%
                </p>
              )}
            </div>
          </>
        ) : (
          <p className="text-center py-20 text-sm" style={{ color: 'var(--reader-secondary)' }}>
            ไม่พบบทนี้
          </p>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav
        className="sticky bottom-0 border-t"
        style={{ background: 'var(--reader-bg)', borderColor: 'var(--reader-border)' }}
      >
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          {/* Prev */}
          {prevChapter ? (
            <button
              onClick={() => goToChapter(prevChapter)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border hover:border-amber-300 dark:hover:border-amber-700 transition-all text-sm flex-1 min-w-0"
              style={{ borderColor: 'var(--reader-border)' }}
            >
              <ChevronLeft className="w-4 h-4 flex-shrink-0 text-amber-600" />
              <span className="truncate text-xs">{prevChapter.title}</span>
            </button>
          ) : (
            <div className="flex-1" />
          )}

          {/* Page indicator */}
          <div className="flex-shrink-0 text-center">
            <span className="text-xs" style={{ color: 'var(--reader-secondary)' }}>
              {currentIndex + 1}/{allChapters.length}
            </span>
          </div>

          {/* Next */}
          {nextChapter ? (
            <button
              onClick={() => goToChapter(nextChapter)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border hover:border-amber-300 dark:hover:border-amber-700 transition-all text-sm flex-1 min-w-0 justify-end"
              style={{ borderColor: 'var(--reader-border)' }}
            >
              <span className="truncate text-xs">{nextChapter.title}</span>
              <ChevronRight className="w-4 h-4 flex-shrink-0 text-amber-600" />
            </button>
          ) : (
            <button
              onClick={() => {
                saveProgress(100)
                router.push(`/book/${bookId}`)
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-white transition-all text-sm flex-1 justify-center"
            >
              <span className="text-xs font-medium">จบแล้ว · กลับสารบัญ</span>
            </button>
          )}
        </div>
      </nav>
    </div>
  )
}
