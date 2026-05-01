'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Book, Chapter, UserProgress } from '@/lib/types'
import { ArrowLeft, BookOpen, CheckCircle, Circle, PlayCircle } from 'lucide-react'

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
      supabase.from('elearning_chapters').select('*').eq('book_id', bookId).order('chapter_order'),
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
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-semibold text-sm truncate">
            {book?.title || 'หนังสือ'}
          </span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {fetching ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-6 rounded-xl w-3/4" style={{ background: 'var(--reader-border)' }} />
            <div className="h-4 rounded-xl w-1/3" style={{ background: 'var(--reader-border)' }} />
            <div className="h-16 rounded-xl" style={{ background: 'var(--reader-border)' }} />
          </div>
        ) : book ? (
          <>
            {/* Book Info */}
            <div className="mb-7">
              <div className="inline-flex items-center gap-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium px-2.5 py-1 rounded-full mb-3">
                <BookOpen className="w-3 h-3" />
                อ่านฟรี · {chapters.length} บท
              </div>
              <h1 className="text-xl font-bold leading-snug mb-2">{book.title}</h1>
              {book.author && (
                <p className="text-sm mb-1" style={{ color: 'var(--reader-secondary)' }}>
                  ผู้เขียน: {book.author}
                </p>
              )}
              {book.translator && (
                <p className="text-sm mb-3" style={{ color: 'var(--reader-secondary)' }}>
                  ผู้แปล: {book.translator}
                </p>
              )}
              {book.description && (
                <p className="text-sm leading-relaxed" style={{ color: 'var(--reader-secondary)' }}>
                  {book.description}
                </p>
              )}
            </div>

            {/* Progress */}
            {progress && progress.progress_percent > 0 && (
              <div
                className="border rounded-2xl p-4 mb-5"
                style={{ borderColor: 'var(--reader-border)', background: 'var(--reader-surface)' }}
              >
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-medium">ความคืบหน้า</span>
                  <span className="text-xs font-bold text-amber-600">
                    {progress.progress_percent}%
                  </span>
                </div>
                <div
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{ background: 'var(--reader-border)' }}
                >
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all"
                    style={{ width: `${progress.progress_percent}%` }}
                  />
                </div>
              </div>
            )}

            {/* CTA */}
            {chapters.length > 0 && (
              <button
                onClick={startReading}
                className="w-full bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white font-bold py-4 rounded-2xl transition-colors flex items-center justify-center gap-2 mb-8 shadow-lg shadow-amber-500/20"
              >
                <PlayCircle className="w-5 h-5" />
                {progress && progress.progress_percent > 0 ? 'อ่านต่อ' : 'เริ่มอ่าน'}
              </button>
            )}

            {/* Chapter List */}
            <div>
              <h2 className="font-bold text-sm mb-3 flex items-center gap-2">
                สารบัญ
                <span
                  className="text-xs font-normal"
                  style={{ color: 'var(--reader-secondary)' }}
                >
                  ({chapters.length} บท)
                </span>
              </h2>
              <div className="space-y-2">
                {chapters.map(ch => {
                  const read = isChapterRead(ch)
                  const isCurrent = ch.id === progress?.last_chapter_id
                  return (
                    <button
                      key={ch.id}
                      onClick={() => router.push(`/read/${bookId}/${ch.id}`)}
                      className={`w-full text-left border rounded-xl px-4 py-3 transition-all flex items-center gap-3 group ${
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
                        <span
                          className="text-xs mr-2"
                          style={{ color: 'var(--reader-secondary)' }}
                        >
                          {ch.chapter_order}.
                        </span>
                        <span className={`text-sm ${isCurrent ? 'font-semibold text-amber-600' : ''}`}>
                          {ch.title}
                        </span>
                      </div>
                      {isCurrent && (
                        <span className="text-xs text-amber-600 flex-shrink-0 font-medium">
                          อ่านอยู่
                        </span>
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
