'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { BookOpen, Library, Sparkles } from 'lucide-react'

export default function HomePage() {
  const { user, loading, login } = useAuth()
  const router = useRouter()
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!loading && user) router.push('/library')
  }, [user, loading, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    setError('')
    try {
      await login(name.trim())
      router.push('/library')
    } catch {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' }}>
        <div className="text-amber-400 animate-pulse text-sm">กำลังโหลด...</div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 py-12"
      style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}
    >
      {/* Logo */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-amber-500/15 border border-amber-500/25 mb-5 backdrop-blur">
          <Library className="w-10 h-10 text-amber-400" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
          พชร หอสมุดดิจิทัล
        </h1>
        <p className="text-slate-400 text-sm">
          อ่านหนังสือคุณภาพ · ฟรี · ทุกที่ทุกเวลา
        </p>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-sm">
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-7 shadow-2xl">
          <h2 className="text-white font-semibold mb-1">เริ่มต้นอ่านหนังสือ</h2>
          <p className="text-slate-400 text-xs mb-5">กรอกชื่อของคุณเพื่อเข้าใช้งาน</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="ชื่อของคุณ..."
                maxLength={50}
                className="w-full bg-white/8 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:bg-white/10 transition-all text-sm"
                disabled={submitting}
                autoFocus
              />
            </div>

            {error && (
              <p className="text-red-400 text-xs bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={!name.trim() || submitting}
              className="w-full bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
            >
              <BookOpen className="w-4 h-4" />
              {submitting ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ห้องสมุด'}
            </button>
          </form>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          {[
            { icon: '📖', label: 'อ่านฟรี', sub: 'ทุกเล่ม' },
            { icon: '🌙', label: 'Dark Mode', sub: 'สบายตา' },
            { icon: '📊', label: 'บันทึก', sub: 'ความคืบหน้า' },
          ].map(f => (
            <div key={f.label}
              className="text-center bg-white/5 border border-white/8 rounded-xl py-3 px-2">
              <div className="text-xl mb-1">{f.icon}</div>
              <div className="text-white text-xs font-medium">{f.label}</div>
              <div className="text-slate-500 text-xs">{f.sub}</div>
            </div>
          ))}
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          Phase 1 · Mock Auth · จะเชื่อมต่อ LINE ในอนาคต
        </p>
      </div>
    </div>
  )
}
