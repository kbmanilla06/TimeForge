import { useEffect, useState } from 'react'
import { getSidebarBadgeCounts } from '../lib/sidebarBadgeApi'
import type { SidebarBadgeCounts } from '../types/sidebarBadges'

export const POLL_INTERVAL_MS = 20000

/**
 * Polls the aggregated sidebar-counts endpoint on an interval (Sprint 23
 * decision: polling, not WebSocket broadcasting). One shared timer powers
 * every sidebar module badge and the notification bell's count.
 */
export function useSidebarBadges(): SidebarBadgeCounts | undefined {
  const [counts, setCounts] = useState<SidebarBadgeCounts | undefined>(undefined)

  useEffect(() => {
    let cancelled = false

    const poll = async () => {
      try {
        const result = await getSidebarBadgeCounts()
        if (!cancelled) setCounts(result)
      } catch {
        // Badges are non-critical — a failed poll just keeps the last
        // known counts until the next successful one.
      }
    }

    void poll()
    const interval = setInterval(poll, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  return counts
}
