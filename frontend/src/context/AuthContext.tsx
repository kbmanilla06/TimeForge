import { useEffect, useState, type ReactNode } from 'react'
import { apiFetch, getToken, setToken } from '../lib/apiClient'
import type { LoginResponse, MeResponse, User } from '../types/auth'
import { AuthContext } from './useAuth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!getToken()) {
      setIsLoading(false)
      return
    }

    apiFetch<MeResponse>('/me')
      .then((response) => setUser(response.user))
      .catch(() => setToken(null))
      .finally(() => setIsLoading(false))
  }, [])

  async function login(email: string, password: string) {
    const response = await apiFetch<LoginResponse>('/login', {
      method: 'POST',
      body: { email, password },
    })

    setToken(response.token)
    setUser(response.user)
  }

  async function logout() {
    try {
      await apiFetch('/logout', { method: 'POST' })
    } finally {
      setToken(null)
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
