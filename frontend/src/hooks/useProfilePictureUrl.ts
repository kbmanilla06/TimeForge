import { useCallback, useEffect, useRef, useState } from 'react'
import { getProfilePictureBlob } from '../lib/profileApi'

/**
 * The picture is served through an authenticated endpoint (Sprint 24 —
 * private disk, same as attachments), so it can't be a plain <img src>.
 * This fetches it as a blob and exposes an object URL instead, revoking
 * the previous one whenever it's replaced or the component unmounts.
 */
export function useProfilePictureUrl(): { url: string | null; refresh: () => void } {
  const [url, setUrl] = useState<string | null>(null)
  const currentUrl = useRef<string | null>(null)
  const [refreshToken, setRefreshToken] = useState(0)

  useEffect(() => {
    let cancelled = false

    void getProfilePictureBlob().then((blob) => {
      if (cancelled) return

      if (currentUrl.current) {
        URL.revokeObjectURL(currentUrl.current)
        currentUrl.current = null
      }

      if (blob) {
        const objectUrl = URL.createObjectURL(blob)
        currentUrl.current = objectUrl
        setUrl(objectUrl)
      } else {
        setUrl(null)
      }
    })

    return () => {
      cancelled = true
    }
  }, [refreshToken])

  useEffect(() => {
    return () => {
      if (currentUrl.current) URL.revokeObjectURL(currentUrl.current)
    }
  }, [])

  const refresh = useCallback(() => setRefreshToken((n) => n + 1), [])

  return { url, refresh }
}
