import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAuth } from '../context/useAuth'
import { ApiError } from '../lib/apiClient'
import { createAssignment, deleteAssignment, listKpis, listTeamAssignments, listTeamMembers } from '../lib/kpiApi'
import { assignmentLabel, completionRate, groupByCategory, type KpiCategory } from '../lib/kpiInsights'
import type { Kpi, KpiAssignment, TeamMember } from '../types/kpi'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, SectionCard } from '../components/ui/Card'
import { Select } from '../components/ui/fields'
import { PageHeader } from '../components/ui/PageHeader'
import { EmptyState, LoadingState } from '../components/ui/states'
import { TableCard, TableHead, Td, Th, Tr } from '../components/ui/Table'

type TargetType = 'user' | 'department'

const CHART_COLOR = '#4f46e5'

const CATEGORY_META: Record<KpiCategory, { label: string; tone: 'green' | 'violet' | 'amber' }> = {
  completed: { label: 'Completed', tone: 'green' },
  current: { label: 'Current', tone: 'violet' },
  pending: { label: 'Pending', tone: 'amber' },
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold text-ink">{value}</p>
    </Card>
  )
}

function AssignmentRow({ assignment, onDelete }: { assignment: KpiAssignment; onDelete: (assignment: KpiAssignment) => void }) {
  return (
    <Tr>
      <Td className="font-medium text-ink">{assignment.kpi?.name ?? '—'}</Td>
      <Td className="text-muted">
        {assignment.user?.name ?? (assignment.department ? `${assignment.department.name} (dept.)` : '—')}
      </Td>
      <Td>
        {assignment.progress_value}
        {assignment.kpi?.target_value != null ? ` / ${assignment.kpi.target_value}` : ''}
        {assignment.kpi?.unit ? ` ${assignment.kpi.unit}` : ''}
      </Td>
      <Td className="text-muted">{new Date(assignment.created_at).toLocaleDateString()}</Td>
      <Td>
        <button
          type="button"
          onClick={() => onDelete(assignment)}
          className="font-medium text-red-600 hover:underline"
        >
          Remove
        </button>
      </Td>
    </Tr>
  )
}

function CategoryTable({
  category,
  assignments,
  onDelete,
}: {
  category: KpiCategory
  assignments: KpiAssignment[]
  onDelete: (assignment: KpiAssignment) => void
}) {
  const meta = CATEGORY_META[category]

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-base font-semibold text-ink">{meta.label}</h2>
        <Badge tone={meta.tone}>{assignments.length}</Badge>
      </div>
      {assignments.length === 0 ? (
        <EmptyState>No {meta.label.toLowerCase()} assignments.</EmptyState>
      ) : (
        <TableCard>
          <TableHead>
            <Th>KPI</Th>
            <Th>Assigned To</Th>
            <Th>Progress</Th>
            <Th>Assigned</Th>
            <Th>Actions</Th>
          </TableHead>
          <tbody>
            {assignments.map((assignment) => (
              <AssignmentRow key={assignment.id} assignment={assignment} onDelete={onDelete} />
            ))}
          </tbody>
        </TableCard>
      )}
    </section>
  )
}

export function TeamKpisPage() {
  const { user } = useAuth()
  const [assignments, setAssignments] = useState<KpiAssignment[]>([])
  const [kpis, setKpis] = useState<Kpi[]>([])
  const [members, setMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [kpiId, setKpiId] = useState('')
  const [targetType, setTargetType] = useState<TargetType>('user')
  const [userId, setUserId] = useState('')
  const [isAssigning, setIsAssigning] = useState(false)

  useEffect(() => {
    void loadAll()
  }, [])

  async function loadAll() {
    setIsLoading(true)
    setError(null)
    try {
      const [assignmentList, kpiList, memberList] = await Promise.all([
        listTeamAssignments(),
        listKpis(),
        listTeamMembers(),
      ])
      setAssignments(assignmentList)
      setKpis(kpiList)
      setMembers(memberList)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load team KPIs.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleAssign(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsAssigning(true)
    try {
      if (targetType === 'user') {
        await createAssignment({ kpi_id: Number(kpiId), user_id: Number(userId) })
      } else {
        await createAssignment({ kpi_id: Number(kpiId), department_id: user?.department_id ?? null })
      }
      setKpiId('')
      setUserId('')
      await loadAll()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create assignment.')
    } finally {
      setIsAssigning(false)
    }
  }

  async function handleDelete(assignment: KpiAssignment) {
    const confirmed = window.confirm(`Remove this KPI assignment?`)
    if (!confirmed) return

    setError(null)
    try {
      await deleteAssignment(assignment.id)
      await loadAll()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to remove assignment.')
    }
  }

  const groups = useMemo(() => groupByCategory(assignments), [assignments])

  const chartData = useMemo(
    () =>
      assignments
        .map((assignment) => ({ name: assignmentLabel(assignment), rate: completionRate(assignment) }))
        .filter((entry): entry is { name: string; rate: number } => entry.rate != null),
    [assignments]
  )

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
        <LoadingState />
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <PageHeader title="Team KPIs" subtitle="Assign KPIs and track your team's reviewed progress." />

      {error && (
        <Alert tone="error" className="mb-4">
          {error}
        </Alert>
      )}

      <Card className="mb-6 p-5">
        <form onSubmit={handleAssign} className="grid gap-3 sm:grid-cols-3">
          <Select required value={kpiId} onChange={(e) => setKpiId(e.target.value)}>
            <option value="">— Select KPI —</option>
            {kpis.map((kpi) => (
              <option key={kpi.id} value={kpi.id}>
                {kpi.name}
              </option>
            ))}
          </Select>
          <Select value={targetType} onChange={(e) => setTargetType(e.target.value as TargetType)}>
            <option value="user">Assign to a person</option>
            <option value="department">Assign to my department</option>
          </Select>
          {targetType === 'user' ? (
            <Select required value={userId} onChange={(e) => setUserId(e.target.value)}>
              <option value="">— Select person —</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </Select>
          ) : (
            <div className="hidden sm:block" />
          )}
          <Button type="submit" disabled={isAssigning} className="sm:col-span-3">
            Assign KPI
          </Button>
        </form>
      </Card>

      {assignments.length === 0 ? (
        <EmptyState>No KPI assignments yet.</EmptyState>
      ) : (
        <>
          <section className="grid grid-cols-3 gap-4">
            <StatTile label="Completed" value={groups.completed.length} />
            <StatTile label="Current" value={groups.current.length} />
            <StatTile label="Pending" value={groups.pending.length} />
          </section>

          {chartData.length > 0 && (
            <SectionCard title="Completion Rates" className="mt-6">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ left: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#dae0e7" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={160} />
                    <Tooltip />
                    <Bar dataKey="rate" fill={CHART_COLOR} name="Completion %" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          )}

          <div className="mt-6 space-y-8">
            <CategoryTable category="current" assignments={groups.current} onDelete={handleDelete} />
            <CategoryTable category="pending" assignments={groups.pending} onDelete={handleDelete} />
            <CategoryTable category="completed" assignments={groups.completed} onDelete={handleDelete} />
          </div>
        </>
      )}
    </main>
  )
}
