'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Book } from '@/lib/types'
import { Library, LogOut, BookOpen, ChevronRight, BookMarked } from 'lucide-react'

export default function LibraryPage() {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const [books, setBooks] = useState<Book[]>([])
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    if (!loading && !user) router.push('/')
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return
    supabase
      .from('elearning_books')
      .select('*')
      .eq('is_active', true)
      .order('id')
      .then(({ data }) => {
        setBooks(data || [])
        setFetching(false)
      })
  }, [user])

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  if (loading || !user) return null

  return (
    <div className="min-h-screen" style={{ background: 'var(--reader-bg)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 border-b backdrop-blur-sm"
        style={{ background: 'var(--reader-bg)', borderColor: 'var(--reader-border)' }}
      >
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Library className="w-5 h-5 text-amber-600" />
            <span className="font-bold text-sm">หอสมุดดิจิทัล</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs" style={{ color: 'var(--reader-secondary)' }}>
              {user.display_name}
            </span>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              title="ออกจากระบบ"
            >
              <LogOut className="w-4 h-4" style={{ color: 'var(--reader-secondary)' }} />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold mb-1">ห้องสมุดของฉัน</h1>
          <p className="text-sm" style={{ color: 'var(--reader-secondary)' }}>
            หนังสือทั้งหมดที่เปิดให้อ่านฟรี
          </p>
        </div>

        {fetching ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="h-36 rounded-2xl animate-pulse"
                style={{ background: 'var(--reader-border)' }}
              />
            ))}
          </div>
        ) : books.length === 0 ? (
          <div className="text-center py-20" style={{ color: 'var(--reader-secondary)' }}>
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">ยังไม่มีหนังสือในขณะนี้</p>
          </div>
        ) : (
          <div className="space-y-3">
            {books.map(book => (
              <button
                key={book.id}
                onClick={() => router.push(`/book/${book.id}`)}
                className="w-full text-left border rounded-2xl p-5 hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700 transition-all group"
                style={{
                  borderColor: 'var(--reader-border)',
                  background: 'var(--reader-surface)',
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Book icon */}
                  <div
                    className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(200,169,110,0.12)' }}
                  >
                    <BookMarked className="w-6 h-6 text-amber-600" />
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium px-2 py-0.5 rounded-full mb-2">
                      <BookOpen className="w-2.5 h-2.5" />
                      อ่านฟรี
                    </div>

                    <h2 className="font-bold text-sm leading-snug mb-1 line-clamp-2">
                      {book.title}
                    </h2>

                    {book.author && (
                      <p className="text-xs mb-2" style={{ color: 'var(--reader-secondary)' }}>
                        โดย {book.author}
                      </p>
                    )}

                    {book.description && (
                      <p
                        className="text-xs line-clamp-2 leading-relaxed"
                        style={{ color: 'var(--reader-secondary)' }}
                      >
                        {book.description}
                      </p>
                    )}
                  </div>

                  <ChevronRight
                    className="w-4 h-4 flex-shrink-0 mt-1 group-hover:translate-x-0.5 transition-transform"
                    style={{ color: 'var(--reader-secondary)' }}
                  />
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
