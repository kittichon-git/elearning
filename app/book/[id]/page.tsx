'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Book, Chapter, UserProgress } from '@/lib/types'
import {
  ArrowLeft, BookOpen, CheckCircle, Circle,
  PlayCircle, List, ShoppingCart, BookMarked,
} from 'lucide-react'

export default function BookPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const bookId = Number(params.id)

  const [book, setBook] = useState<Book | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [progress, setProgress] = useState<UserProgress | null>(null)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    if (!loading && !user) router.push('/')
  }, [user, loading, router])

  useEffect(() => {
    if (!user || !bookId) return
    Promise.all([
      supabase.from('elearning_books').select('*').eq('id', bookId).single(),
      supabase.from('elearning_chapters').select('id,book_id,chapter_order,title,content_md,content_html,created_at').eq('book_id', bookId).order('chapter_order'),
      supabase
        .from('elearning_user_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('book_id', bookId)
        .maybeSingle(),
    ]).then(([bookRes, chapRes, progRes]) => {
      if (bookRes.data) setBook(bookRes.data)
      if (chapRes.data) setChapters(chapRes.data)
      if (progRes.data) setProgress(progRes.data)
      setFetching(false)
    })
  }, [user, bookId])

  const startReading = () => {
    if (chapters.length === 0) return
    if (progress?.last_chapter_id) {
      router.push(`/read/${bookId}/${progress.last_chapter_id}`)
    } else {
      router.push(`/read/${bookId}/${chapters[0].id}`)
    }
  }

  const scrollToToc = () => {
    document.getElementById('toc')?.scrollIntoView({ behavior: 'smooth' })
  }

  const isChapterRead = (ch: Chapter) => {
    if (!progress?.last_chapter_id) return false
    return ch.id <= progress.last_chapter_id
  }

  if (loading || !user) return null

  return (
    <div className="min-h-screen" style={{ background: 'var(--reader-bg)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 border-b backdrop-blur-sm"
        style={{ background: 'var(--reader-bg)', borderColor: 'var(--reader-border)' }}
      >
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => router.push('/library')}
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-semibold text-sm truncate">
            {book?.title || 'หนังสือ'}
          </span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pb-12">
        {fetching ? (
          <div className="pt-8 space-y-4 animate-pulse">
            <div className="flex gap-5">
              <div className="w-32 aspect-[3/4] rounded-2xl flex-shrink-0" style={{ background: 'var(--reader-border)' }} />
              <div className="flex-1 space-y-3 pt-2">
                <div className="h-5 rounded-xl w-4/5" style={{ background: 'var(--reader-border)' }} />
                <div className="h-4 rounded-xl w-1/2" style={{ background: 'var(--reader-border)' }} />
                <div className="h-3 rounded-xl w-1/3" style={{ background: 'var(--reader-border)' }} />
              </div>
            </div>
          </div>
        ) : book ? (
          <>
            {/* ── Hero ───────────────────────────────── */}
            <div className="flex gap-5 pt-7 pb-6 border-b" style={{ borderColor: 'var(--reader-border)' }}>
              {/* Cover */}
              <div className="w-32 flex-shrink-0 aspect-[3/4] rounded-2xl overflow-hidden shadow-md">
                {book.cover_url ? (
                  <img
                    src={book.cover_url}
                    alt={book.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full flex flex-col items-center justify-center gap-2 p-3"
                    style={{ background: 'rgba(200,169,110,0.12)' }}
                  >
                    <BookMarked className="w-7 h-7 text-amber-500" />
                    <span
                      className="text-xs text-center font-semibold line-clamp-4 leading-snug"
                      style={{ color: 'var(--reader-text)' }}
                    >
                      {book.title}
                    </span>
                  </div>
                )}
              </div>

              {/* Meta */}
              <div className="flex-1 min-w-0 pt-1">
                <div className="inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium px-2.5 py-0.5 rounded-full mb-2.5">
                  <BookOpen className="w-2.5 h-2.5" />
                  อ่านฟรี · {chapters.length} บท
                </div>
                <h1 className="text-lg font-bold leading-snug mb-1.5">{book.title}</h1>
                {book.author && (
                  <p className="text-xs mb-0.5" style={{ color: 'var(--reader-secondary)' }}>
                    ผู้เขียน: {book.author}
                  </p>
                )}
                {book.translator && (
                  <p className="text-xs mb-3" style={{ color: 'var(--reader-secondary)' }}>
                    ผู้แปล: {book.translator}
                  </p>
                )}

                {/* Progress */}
                {progress && progress.progress_percent > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs" style={{ color: 'var(--reader-secondary)' }}>อ่านไปแล้ว</span>
                      <span className="text-xs font-bold text-amber-600">{progress.progress_percent}%</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--reader-border)' }}>
                      <div
                        className="h-full rounded-full bg-amber-500"
                        style={{ width: `${progress.progress_percent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Description ────────────────────────── */}
            {book.description && (
              <div className="py-6 border-b" style={{ borderColor: 'var(--reader-border)' }}>
                <h2 className="font-bold text-sm mb-3">เกี่ยวกับหนังสือเล่มนี้</h2>
                <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--reader-secondary)' }}>
                  {book.description}
                </p>
              </div>
            )}

            {/* ── CTA Buttons ────────────────────────── */}
            {chapters.length > 0 && (
              <div className="py-6 space-y-3 border-b" style={{ borderColor: 'var(--reader-border)' }}>
                {/* เริ่มอ่าน */}
                <button
                  onClick={startReading}
                  className="w-full bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white font-bold py-4 rounded-2xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                >
                  <PlayCircle className="w-5 h-5" />
                  {progress && progress.progress_percent > 0 ? 'อ่านต่อจากที่ค้างไว้' : 'เริ่มอ่านเลย'}
                </button>

                {/* ดูสารบัญ + ซื้อหนังสือ */}
                <div className="flex gap-3">
                  <button
                    onClick={scrollToToc}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border font-semibold text-sm hover:border-amber-300 dark:hover:border-amber-700 transition-colors"
                    style={{ borderColor: 'var(--reader-border)', background: 'var(--reader-surface)' }}
                  >
                    <List className="w-4 h-4 text-amber-600" />
                    ดูสารบัญ
                  </button>

                  {book.buy_url && (
                    <a
                      href={book.buy_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm transition-colors text-white"
                      style={{ background: '#2c3e50' }}
                    >
                      <ShoppingCart className="w-4 h-4" />
                      ซื้อหนังสือ
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* ── TOC ────────────────────────────────── */}
            <div id="toc" className="pt-6">
              <h2 className="font-bold text-sm mb-4 flex items-center gap-2">
                สารบัญ
                <span className="text-xs font-normal" style={{ color: 'var(--reader-secondary)' }}>
                  ({chapters.length} บท)
                </span>
              </h2>
              <div className="space-y-1.5">
                {chapters.map(ch => {
                  const read = isChapterRead(ch)
                  const isCurrent = ch.id === progress?.last_chapter_id
                  return (
                    <button
                      key={ch.id}
                      onClick={() => router.push(`/read/${bookId}/${ch.id}`)}
                      className={`w-full text-left border rounded-xl px-4 py-3 transition-all flex items-center gap-3 ${
                        isCurrent
                          ? 'border-amber-400 dark:border-amber-600'
                          : 'hover:border-amber-300 dark:hover:border-amber-700'
                      }`}
                      style={{
                        borderColor: isCurrent ? undefined : 'var(--reader-border)',
                        background: isCurrent ? 'rgba(200,169,110,0.06)' : 'var(--reader-surface)',
                      }}
                    >
                      {read ? (
                        <CheckCircle className="w-4 h-4 flex-shrink-0 text-amber-500" />
                      ) : (
                        <Circle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--reader-border)' }} />
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="text-xs mr-2" style={{ color: 'var(--reader-secondary)' }}>
                          {ch.chapter_order}.
                        </span>
                        <span className={`text-sm ${isCurrent ? 'font-semibold text-amber-600' : ''}`}>
                          {ch.title}
                        </span>
                      </div>
                      {isCurrent && (
                        <span className="text-xs text-amber-600 flex-shrink-0 font-medium">อ่านอยู่</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </>
        ) : (
          <p className="text-center py-20 text-sm" style={{ color: 'var(--reader-secondary)' }}>
            ไม่พบหนังสือนี้
          </p>
        )}
      </main>
    </div>
  )
}
