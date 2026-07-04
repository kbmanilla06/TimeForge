import { useEffect, useState } from 'react'
import { getTodaysAttendance, pauseBreak, resumeBreak, timeIn, timeOut } from '../lib/attendanceApi'
import { ApiError } from '../lib/apiClient'
import type { AttendanceSession } from '../types/attendance'
import { Alert } from './ui/Alert'
import { Button } from './ui/Button'
import { SectionCard } from './ui/Card'
import { LoadingState } from './ui/states'

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h ${mins}m`
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

/** Live-ticking minutes elapsed since `since`, updated once a minute. */
function useLiveMinutesSince(since: string | null): number {
  const [minutes, setMinutes] = useState(0)

  useEffect(() => {
    if (!since) {
      setMinutes(0)
      return undefined
    }

    const startMs = new Date(since).getTime()
    const tick = () => setMinutes(Math.max(0, Math.floor((Date.now() - startMs) / 60000)))
    tick()
    const interval = setInterval(tick, 15000)
    return () => clearInterval(interval)
  }, [since])

  return minutes
}

export function AttendanceWidget() {
  const [session, setSession] = useState<AttendanceSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isActing, setIsActing] = useState(false)

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    setError(null)
    setIsLoading(true)
    try {
      const { session } = await getTodaysAttendance()
      setSession(session)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load attendance.')
    } finally {
      setIsLoading(false)
    }
  }

  async function perform(action: () => Promise<AttendanceSession>) {
    setError(null)
    setIsActing(true)
    try {
      setSession(await action())
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to update attendance.')
    } finally {
      setIsActing(false)
    }
  }

  const activeSince = session && !session.is_timed_out ? (session.is_on_break ? session.break_started_at : session.time_in) : null
  const liveMinutes = useLiveMinutesSince(activeSince)

  return (
    <SectionCard title="Attendance" className="mt-6">
      {error && (
        <Alert tone="error" className="mb-4">
          {error}
        </Alert>
      )}

      {isLoading && <LoadingState label="Loading attendance…" />}

      {!isLoading && !session && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">You haven't clocked in today.</p>
          <Button disabled={isActing} onClick={() => perform(timeIn)}>
            Time In
          </Button>
        </div>
      )}

      {!isLoading && session && !session.is_timed_out && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                {session.is_on_break ? 'On break' : 'Clocked in'} since{' '}
                {formatTime(session.is_on_break ? (session.break_started_at ?? session.time_in) : session.time_in)}
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold text-ink">{formatMinutes(liveMinutes)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {session.is_on_break ? (
                <Button variant="secondary" disabled={isActing} onClick={() => perform(resumeBreak)}>
                  Resume Break
                </Button>
              ) : (
                !session.has_used_break && (
                  <Button variant="secondary" disabled={isActing} onClick={() => perform(pauseBreak)}>
                    Pause Break
                  </Button>
                )
              )}
              <Button variant="danger" disabled={isActing} onClick={() => perform(timeOut)}>
                Time Out
              </Button>
            </div>
          </div>
        </div>
      )}

      {session && session.is_timed_out && (
        <div>
          <p className="text-sm font-medium text-ink">Today's attendance</p>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">Time In</dt>
              <dd className="mt-0.5 font-medium text-ink">{formatTime(session.time_in)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">Break</dt>
              <dd className="mt-0.5 font-medium text-ink">
                {session.break_started_at && session.break_resumed_at
                  ? `${formatTime(session.break_started_at)} – ${formatTime(session.break_resumed_at)}`
                  : 'Not taken'}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">Time Out</dt>
              <dd className="mt-0.5 font-medium text-ink">
                {session.time_out ? formatTime(session.time_out) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">Working Hours</dt>
              <dd className="mt-0.5 font-medium text-ink">{formatMinutes(session.working_minutes)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">Break Duration</dt>
              <dd className="mt-0.5 font-medium text-ink">{formatMinutes(session.break_minutes)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">Total Rendered</dt>
              <dd className="mt-0.5 font-medium text-ink">{formatMinutes(session.total_minutes)}</dd>
            </div>
          </dl>
        </div>
      )}
    </SectionCard>
  )
}
