import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../lib/apiClient'
import { createAssignment, deleteAssignment, listKpis, listTeamAssignments, listTeamMembers } from '../lib/kpiApi'
import type { Kpi, KpiAssignment, TeamMember } from '../types/kpi'

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
    return <p className="mx-auto max-w-4xl px-4 py-8 text-slate-500">Loading…</p>
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-slate-900">Team KPIs</h1>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <form onSubmit={handleAssign} className="mt-6 grid grid-cols-3 gap-2 rounded-md border border-slate-200 p-4">
        <select
          required
          value={kpiId}
          onChange={(e) => setKpiId(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">— Select KPI —</option>
          {kpis.map((kpi) => (
            <option key={kpi.id} value={kpi.id}>
              {kpi.name}
            </option>
          ))}
        </select>
        <select
          value={targetType}
          onChange={(e) => setTargetType(e.target.value as TargetType)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="user">Assign to a person</option>
          <option value="department">Assign to my department</option>
        </select>
        {targetType === 'user' ? (
          <select
            required
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">— Select person —</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        ) : (
          <div />
        )}
        <button
          type="submit"
          disabled={isAssigning}
          className="col-span-3 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Assign KPI
        </button>
      </form>

      <table className="mt-6 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-slate-500">
            <th className="py-2">KPI</th>
            <th className="py-2">Assigned To</th>
            <th className="py-2">Progress</th>
            <th className="py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {assignments.map((assignment) => (
            <tr key={assignment.id} className="border-b border-slate-100">
              <td className="py-2">{assignment.kpi?.name ?? '—'}</td>
              <td className="py-2">
                {assignment.user?.name ?? (assignment.department ? `${assignment.department.name} (dept.)` : '—')}
              </td>
              <td className="py-2">
                {assignment.progress_value}
                {assignment.kpi?.target_value != null ? ` / ${assignment.kpi.target_value}` : ''}
                {assignment.kpi?.unit ? ` ${assignment.kpi.unit}` : ''}
              </td>
              <td className="py-2">
                <button
                  type="button"
                  onClick={() => handleDelete(assignment)}
                  className="text-red-600 underline"
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
          {assignments.length === 0 && (
            <tr>
              <td colSpan={4} className="py-4 text-center text-slate-400">
                No KPI assignments yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  )
}
