import { useEffect, useState, type FormEvent } from 'react'
import { ApiError } from '../../lib/apiClient'
import { createKpi, listKpis } from '../../lib/kpiApi'
import type { Kpi } from '../../types/kpi'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { TextInput } from '../../components/ui/fields'
import { PageHeader } from '../../components/ui/PageHeader'
import { LoadingState } from '../../components/ui/states'
import { TableCard, TableHead, Td, Th, Tr } from '../../components/ui/Table'

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
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
      <PageHeader title="Manage KPIs" subtitle="Define the measurable targets teams work toward." />

      {error && (
        <Alert tone="error" className="mb-4">
          {error}
        </Alert>
      )}

      <form onSubmit={handleCreate} className="mb-6 grid gap-2 sm:grid-cols-3">
        <TextInput
          type="text"
          required
          placeholder="KPI name (e.g. Bugs Resolved)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <TextInput
          type="number"
          min="0"
          placeholder="Target (optional)"
          value={targetValue}
          onChange={(e) => setTargetValue(e.target.value)}
        />
        <TextInput
          type="text"
          placeholder="Unit (optional, e.g. bugs)"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
        />
        <Button type="submit" disabled={isCreating} className="sm:col-span-3">
          Add KPI
        </Button>
      </form>

      {isLoading ? (
        <LoadingState />
      ) : (
        <TableCard>
          <TableHead>
            <Th>Name</Th>
            <Th>Target</Th>
            <Th>Unit</Th>
          </TableHead>
          <tbody>
            {kpis.map((kpi) => (
              <Tr key={kpi.id}>
                <Td className="font-medium text-ink">{kpi.name}</Td>
                <Td className="text-muted">{kpi.target_value ?? '—'}</Td>
                <Td className="text-muted">{kpi.unit ?? '—'}</Td>
              </Tr>
            ))}
            {kpis.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-muted">
                  No KPIs yet.
                </td>
              </tr>
            )}
          </tbody>
        </TableCard>
      )}
    </main>
  )
}
