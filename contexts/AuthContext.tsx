'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { MockUser } from '@/lib/types'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: MockUser | null
  loading: boolean
  login: (name: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('elearning_user')
    if (stored) {
      try {
        setUser(JSON.parse(stored))
      } catch {}
    }
    setLoading(false)
  }, [])

  const login = async (name: string) => {
    const mockId = `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const { data, error } = await supabase
      .from('elearning_profiles')
      .insert({ mock_user_id: mockId, display_name: name })
      .select()
      .single()

    if (error) throw error

    const mockUser: MockUser = {
      id: data.id,
      mock_user_id: mockId,
      display_name: name,
      avatar_url: null,
    }
    localStorage.setItem('elearning_user', JSON.stringify(mockUser))
    setUser(mockUser)
  }

  const logout = () => {
    localStorage.removeItem('elearning_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
