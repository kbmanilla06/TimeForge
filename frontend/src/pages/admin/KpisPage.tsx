import { useEffect, useState, type FormEvent } from 'react'
import { ApiError } from '../../lib/apiClient'
import { createKpi, listKpis } from '../../lib/kpiApi'
import type { Kpi } from '../../types/kpi'

export function KpisPage() {
  const [kpis, setKpis] = useState<Kpi[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [targetValue, setTargetValue] = useState('')
  const [unit, setUnit] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    void loadKpis()
  }, [])

  async function loadKpis() {
    setIsLoading(true)
    setError(null)
    try {
      setKpis(await listKpis())
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load KPIs.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsCreating(true)
    try {
      await createKpi({
        name,
        target_value: targetValue ? Number(targetValue) : null,
        unit: unit || null,
      })
      setName('')
      setTargetValue('')
      setUnit('')
      await loadKpis()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create KPI.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-slate-900">Manage KPIs</h1>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <form onSubmit={handleCreate} className="mt-6 grid grid-cols-3 gap-2">
        <input
          type="text"
          required
          placeholder="KPI name (e.g. Bugs Resolved)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="number"
          min="0"
          placeholder="Target (optional)"
          value={targetValue}
          onChange={(e) => setTargetValue(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="text"
          placeholder="Unit (optional, e.g. bugs)"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={isCreating}
          className="col-span-3 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Add KPI
        </button>
      </form>

      {isLoading ? (
        <p className="mt-6 text-slate-500">Loading…</p>
      ) : (
        <table className="mt-6 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2">Name</th>
              <th className="py-2">Target</th>
              <th className="py-2">Unit</th>
            </tr>
          </thead>
          <tbody>
            {kpis.map((kpi) => (
              <tr key={kpi.id} className="border-b border-slate-100">
                <td className="py-2">{kpi.name}</td>
                <td className="py-2">{kpi.target_value ?? '—'}</td>
                <td className="py-2">{kpi.unit ?? '—'}</td>
              </tr>
            ))}
            {kpis.length === 0 && (
              <tr>
                <td colSpan={3} className="py-4 text-center text-slate-400">
                  No KPIs yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </main>
  )
}
