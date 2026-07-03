import { useEffect, useState } from 'react'
import { ApiError } from '../lib/apiClient'
import { listMyAssignments } from '../lib/kpiApi'
import type { KpiAssignment } from '../types/kpi'
import { Alert } from '../components/ui/Alert'
import { PageHeader } from '../components/ui/PageHeader'
import { EmptyState, LoadingState } from '../components/ui/states'

export function MyKpisPage() {
  const [assignments, setAssignments] = useState<KpiAssignment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    setIsLoading(true)
    setError(null)
    try {
      setAssignments(await listMyAssignments())
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load your KPIs.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
        <LoadingState />
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
      <PageHeader title="My KPIs" subtitle="Progress credits when your timesheets are approved." />

      {error && (
        <Alert tone="error" className="mb-4">
          {error}
        </Alert>
      )}

      <ul className="space-y-3">
        {assignments.map((assignment) => {
          const target = assignment.kpi?.target_value
          const ratio =
            target != null && target > 0
              ? Math.min(assignment.progress_value / target, 1)
              : null

          return (
            <li key={assignment.id} className="rounded-2xl border border-line bg-white p-5 shadow-card">
              <p className="font-medium text-ink">
                {assignment.kpi?.name ?? '—'}
                {assignment.department ? ' (department goal)' : ''}
              </p>
              <p className="mt-1 text-sm text-muted">
                {assignment.progress_value}
                {assignment.kpi?.target_value != null ? ` / ${assignment.kpi.target_value}` : ''}
                {assignment.kpi?.unit ? ` ${assignment.kpi.unit}` : ''}
              </p>
              {ratio != null && (
                <div
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={target ?? 0}
                  aria-valuenow={assignment.progress_value}
                  className="mt-3 h-2 overflow-hidden rounded-full bg-field"
                >
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${ratio * 100}%` }}
                  />
                </div>
              )}
            </li>
          )
        })}
        {assignments.length === 0 && <EmptyState>No KPIs assigned yet.</EmptyState>}
      </ul>
    </main>
  )
}
