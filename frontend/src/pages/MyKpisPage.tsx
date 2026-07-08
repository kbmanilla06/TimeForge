import { useEffect, useMemo, useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { ApiError } from '../lib/apiClient'
import { listMyAssignments } from '../lib/kpiApi'
import { completionRate, groupByCategory, type KpiCategory } from '../lib/kpiInsights'
import type { KpiAssignment } from '../types/kpi'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Card, SectionCard } from '../components/ui/Card'
import { PageHeader } from '../components/ui/PageHeader'
import { EmptyState, LoadingState } from '../components/ui/states'

const CATEGORY_META: Record<KpiCategory, { label: string; tone: 'green' | 'violet' | 'amber'; color: string }> = {
  completed: { label: 'Completed', tone: 'green', color: '#10b981' },
  current: { label: 'Current', tone: 'violet', color: '#4f46e5' },
  pending: { label: 'Pending', tone: 'amber', color: '#f59e0b' },
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold text-ink">{value}</p>
    </Card>
  )
}

function AssignmentCard({ assignment }: { assignment: KpiAssignment }) {
  const target = assignment.kpi?.target_value
  const rate = completionRate(assignment)

  return (
    <li className="rounded-2xl border border-line bg-white p-5 shadow-card">
      <p className="font-medium text-ink">
        {assignment.kpi?.name ?? '—'}
        {assignment.department ? ' (department goal)' : ''}
      </p>
      <p className="mt-1 text-sm text-muted">
        {assignment.progress_value}
        {target != null ? ` / ${target}` : ''}
        {assignment.kpi?.unit ? ` ${assignment.kpi.unit}` : ''}
      </p>
      {rate != null && (
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={target ?? 0}
          aria-valuenow={assignment.progress_value}
          className="mt-3 h-2 overflow-hidden rounded-full bg-field"
        >
          <div className="h-full rounded-full bg-primary" style={{ width: `${rate}%` }} />
        </div>
      )}
      <p className="mt-3 text-xs text-muted">
        Assigned on {new Date(assignment.created_at).toLocaleDateString()}
      </p>
    </li>
  )
}

function CategorySection({
  category,
  assignments,
}: {
  category: KpiCategory
  assignments: KpiAssignment[]
}) {
  const meta = CATEGORY_META[category]

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-base font-semibold text-ink">{meta.label}</h2>
        <Badge tone={meta.tone}>{assignments.length}</Badge>
      </div>
      {assignments.length === 0 ? (
        <EmptyState>No {meta.label.toLowerCase()} KPIs.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {assignments.map((assignment) => (
            <AssignmentCard key={assignment.id} assignment={assignment} />
          ))}
        </ul>
      )}
    </section>
  )
}

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

  const groups = useMemo(() => groupByCategory(assignments), [assignments])

  const chartData = useMemo(
    () =>
      (['completed', 'current', 'pending'] as const)
        .map((category) => ({
          name: CATEGORY_META[category].label,
          value: groups[category].length,
          color: CATEGORY_META[category].color,
        }))
        .filter((entry) => entry.value > 0),
    [groups]
  )

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
        <LoadingState />
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <PageHeader title="My KPIs" subtitle="Progress credits when your timesheets are approved." />

      {error && (
        <Alert tone="error" className="mb-4">
          {error}
        </Alert>
      )}

      {assignments.length === 0 ? (
        <EmptyState>No KPIs assigned yet.</EmptyState>
      ) : (
        <>
          <section className="grid grid-cols-3 gap-4">
            <StatTile label="Completed" value={groups.completed.length} />
            <StatTile label="Current" value={groups.current.length} />
            <StatTile label="Pending" value={groups.pending.length} />
          </section>

          {chartData.length > 0 && (
            <SectionCard title="Breakdown" className="mt-6">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                      {chartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          )}

          <div className="mt-6 space-y-8">
            <CategorySection category="current" assignments={groups.current} />
            <CategorySection category="pending" assignments={groups.pending} />
            <CategorySection category="completed" assignments={groups.completed} />
          </div>
        </>
      )}
    </main>
  )
}
