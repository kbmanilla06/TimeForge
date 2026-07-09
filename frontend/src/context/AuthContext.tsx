import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ApiError, apiFetch, getToken, setToken } from '../lib/apiClient'
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
      .catch((err) => {
        // Sprint 38: only a genuine 401 means the token itself is
        // actually invalid. Any other failure (429 from the shared
        // per-user rate limiter, a transient 5xx, a network blip) must
        // not destroy a perfectly valid session — the token lives in
        // localStorage shared across every open tab, so wiping it here
        // would log the user out everywhere over a problem that has
        // nothing to do with their credentials.
        if (err instanceof ApiError && err.status === 401) {
          setToken(null)
        }
      })
      .finally(() => setIsLoading(false))
  }, [refreshPicture])

  useEffect(() => {
    return () => {
      if (currentPictureUrl.current) URL.revokeObjectURL(currentPictureUrl.current)
    }
  }, [])

  async function refreshUser() {
    if (!getToken()) return

    try {
      const response = await apiFetch<MeResponse>('/me')
      setUser(response.user)
    } catch (err) {
      // Same rule as the initial load: only a genuine 401 means the
      // session is actually gone. Anything else (rate limiting, a
      // transient error) leaves the current session untouched.
      if (err instanceof ApiError && err.status === 401) {
        setToken(null)
        setUser(null)
      }
    }
  }

  async function login(email: string, password: string): Promise<LoginResponse> {
    const response = await apiFetch<LoginResponse>('/login', {
      method: 'POST',
      body: { email, password },
    })

    if (response.two_factor_required) {
      return response
    }

    setToken(response.token || null)
    setUser(response.user || null)
    void refreshPicture()

    return response
  }

  async function verify2Fa(email: string, code: string): Promise<void> {
    const response = await apiFetch<LoginResponse>('/login/verify-2fa', {
      method: 'POST',
      body: { email, code },
    })

    setToken(response.token || null)
    setUser(response.user || null)
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
    <AuthContext.Provider value={{ user, isLoading, login, verify2Fa, logout, refreshUser, pictureUrl, refreshPicture }}>
      {children}
    </AuthContext.Provider>
  )
}
