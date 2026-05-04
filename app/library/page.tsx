'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Book } from '@/lib/types'
import { Library, LogOut, BookOpen, BookMarked } from 'lucide-react'

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
            <span className="font-bold text-sm">พชร หอสมุดดิจิทัล</span>
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
            เลือกหนังสือที่อยากอ่าน
          </p>
        </div>

        {fetching ? (
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse">
                <div
                  className="aspect-[3/4] rounded-2xl mb-3"
                  style={{ background: 'var(--reader-border)' }}
                />
                <div className="h-3 rounded-full mb-2 w-3/4" style={{ background: 'var(--reader-border)' }} />
                <div className="h-3 rounded-full w-1/2" style={{ background: 'var(--reader-border)' }} />
              </div>
            ))}
          </div>
        ) : books.length === 0 ? (
          <div className="text-center py-20" style={{ color: 'var(--reader-secondary)' }}>
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">ยังไม่มีหนังสือในขณะนี้</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {books.map(book => (
              <button
                key={book.id}
                onClick={() => router.push(`/book/${book.id}`)}
                className="text-left group"
              >
                {/* Cover */}
                <div className="aspect-[3/4] rounded-2xl overflow-hidden mb-3 shadow-sm group-hover:shadow-md transition-shadow">
                  {book.cover_url ? (
                    <img
                      src={book.cover_url}
                      alt={book.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex flex-col items-center justify-center gap-3 p-4"
                      style={{ background: 'rgba(200,169,110,0.12)' }}
                    >
                      <BookMarked className="w-8 h-8 text-amber-500 flex-shrink-0" />
                      <span
                        className="text-xs text-center font-semibold line-clamp-4 leading-snug"
                        style={{ color: 'var(--reader-text)' }}
                      >
                        {book.title}
                      </span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="px-0.5">
                  <div className="inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium px-2 py-0.5 rounded-full mb-1.5">
                    <BookOpen className="w-2.5 h-2.5" />
                    อ่านฟรี
                  </div>
                  <h2 className="font-bold text-sm leading-snug mb-1 line-clamp-2">
                    {book.title}
                  </h2>
                  {book.author && (
                    <p className="text-xs mb-1.5" style={{ color: 'var(--reader-secondary)' }}>
                      {book.author}
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
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
