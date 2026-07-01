import { useEffect, useState } from 'react'
import { ApiError } from '../lib/apiClient'
import { listMyAssignments } from '../lib/kpiApi'
import type { KpiAssignment } from '../types/kpi'

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
    return <p className="mx-auto max-w-2xl px-4 py-8 text-slate-500">Loading…</p>
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-slate-900">My KPIs</h1>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <ul className="mt-6 space-y-3">
        {assignments.map((assignment) => (
          <li key={assignment.id} className="rounded-md border border-slate-200 p-4">
            <p className="font-medium text-slate-900">
              {assignment.kpi?.name ?? '—'}
              {assignment.department ? ' (department goal)' : ''}
            </p>
            <p className="text-sm text-slate-500">
              {assignment.progress_value}
              {assignment.kpi?.target_value != null ? ` / ${assignment.kpi.target_value}` : ''}
              {assignment.kpi?.unit ? ` ${assignment.kpi.unit}` : ''}
            </p>
          </li>
        ))}
        {assignments.length === 0 && <p className="text-slate-400">No KPIs assigned yet.</p>}
      </ul>
    </main>
  )
}
