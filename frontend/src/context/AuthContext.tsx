import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { apiFetch, getToken, setToken } from '../lib/apiClient'
import { getProfilePictureBlob } from '../lib/profileApi'
import type { LoginResponse, MeResponse, User } from '../types/auth'
import { AuthContext } from './useAuth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [pictureUrl, setPictureUrl] = useState<string | null>(null)
  const currentPictureUrl = useRef<string | null>(null)

  /**
   * Single shared fetch: the sidebar, Profile page, and Home page all read
   * pictureUrl from this one context instead of each fetching it
   * independently, so an upload's refreshPicture() call updates every
   * consumer at once (Sprint 31 — previously each had its own hook
   * instance and only the caller's own copy ever updated).
   */
  const refreshPicture = useCallback(async () => {
    const blob = await getProfilePictureBlob()

    if (currentPictureUrl.current) {
      URL.revokeObjectURL(currentPictureUrl.current)
      currentPictureUrl.current = null
    }

    if (blob) {
      const objectUrl = URL.createObjectURL(blob)
      currentPictureUrl.current = objectUrl
      setPictureUrl(objectUrl)
    } else {
      setPictureUrl(null)
    }
  }, [])

  useEffect(() => {
    if (!getToken()) {
      setIsLoading(false)
      return
    }

    apiFetch<MeResponse>('/me')
      .then((response) => {
        setUser(response.user)
        void refreshPicture()
      })
      .catch(() => setToken(null))
      .finally(() => setIsLoading(false))
  }, [refreshPicture])

  useEffect(() => {
    return () => {
      if (currentPictureUrl.current) URL.revokeObjectURL(currentPictureUrl.current)
    }
  }, [])

  async function refreshUser() {
    if (!getToken()) return
    const response = await apiFetch<MeResponse>('/me')
    setUser(response.user)
  }

  async function login(email: string, password: string) {
    const response = await apiFetch<LoginResponse>('/login', {
      method: 'POST',
      body: { email, password },
    })

    setToken(response.token)
    setUser(response.user)
    void refreshPicture()
  }

  async function logout() {
    try {
      await apiFetch('/logout', { method: 'POST' })
    } finally {
      setToken(null)
      setUser(null)
      if (currentPictureUrl.current) {
        URL.revokeObjectURL(currentPictureUrl.current)
        currentPictureUrl.current = null
      }
      setPictureUrl(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser, pictureUrl, refreshPicture }}>
      {children}
    </AuthContext.Provider>
  )
}
