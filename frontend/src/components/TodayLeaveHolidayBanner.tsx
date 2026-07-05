import { useEffect, useState } from 'react'
import { listHolidays } from '../lib/holidayApi'
import { listMyLeaveRequests } from '../lib/leaveRequestApi'
import { Alert } from './ui/Alert'

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Purely informational (Sprint 49) — displays whether today is a company
 * holiday or falls within the current user's own approved leave, using
 * the exact same data the Holidays/My Leave pages already show. Never
 * affects attendance, timesheets, or payroll computation.
 */
export function TodayLeaveHolidayBanner() {
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const today = todayDateString()
        const [holidays, leaveRequests] = await Promise.all([listHolidays(), listMyLeaveRequests()])
        if (cancelled) return

        const holiday = holidays.find((h) => h.date === today)
        if (holiday) {
          setMessage(`Today is a company holiday: ${holiday.name}.`)
          return
        }

        const onLeave = leaveRequests.some(
          (leaveRequest) =>
            leaveRequest.status === 'approved' &&
            leaveRequest.start_date <= today &&
            leaveRequest.end_date >= today,
        )
        if (onLeave) {
          setMessage("You're on approved leave today.")
          return
        }

        setMessage(null)
      } catch {
        // Purely informational — a failed fetch just means no banner,
        // never an error shown to the user.
        if (!cancelled) setMessage(null)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  if (!message) return null

  return (
    <Alert tone="info" className="mb-4">
      {message}
    </Alert>
  )
}
