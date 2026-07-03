import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../context/useAuth'
import { ApiError } from '../lib/apiClient'
import { createAssignment, deleteAssignment, listKpis, listTeamAssignments, listTeamMembers } from '../lib/kpiApi'
import type { Kpi, KpiAssignment, TeamMember } from '../types/kpi'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Select } from '../components/ui/fields'
import { PageHeader } from '../components/ui/PageHeader'
import { LoadingState } from '../components/ui/states'
import { TableCard, TableHead, Td, Th, Tr } from '../components/ui/Table'

type TargetType = 'user' | 'department'

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

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
        <LoadingState />
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
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

      <TableCard>
        <TableHead>
          <Th>KPI</Th>
          <Th>Assigned To</Th>
          <Th>Progress</Th>
          <Th>Actions</Th>
        </TableHead>
        <tbody>
          {assignments.map((assignment) => (
            <Tr key={assignment.id}>
              <Td className="font-medium text-ink">{assignment.kpi?.name ?? '—'}</Td>
              <Td className="text-muted">
                {assignment.user?.name ?? (assignment.department ? `${assignment.department.name} (dept.)` : '—')}
              </Td>
              <Td>
                {assignment.progress_value}
                {assignment.kpi?.target_value != null ? ` / ${assignment.kpi.target_value}` : ''}
                {assignment.kpi?.unit ? ` ${assignment.kpi.unit}` : ''}
              </Td>
              <Td>
                <button
                  type="button"
                  onClick={() => handleDelete(assignment)}
                  className="font-medium text-red-600 hover:underline"
                >
                  Remove
                </button>
              </Td>
            </Tr>
          ))}
          {assignments.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-muted">
                No KPI assignments yet.
              </td>
            </tr>
          )}
        </tbody>
      </TableCard>
    </main>
  )
}
