import { useEffect, useState, type FormEvent } from 'react'
import { ApiError } from '../../lib/apiClient'
import { createKpi, listKpis } from '../../lib/kpiApi'
import type { Kpi } from '../../types/kpi'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Card, SectionCard } from '../../components/ui/Card'
import { Field, TextInput } from '../../components/ui/fields'
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
      <PageHeader
        title="Manage KPIs"
        subtitle="Define the measurable targets teams work toward."
        actions={
          !isLoading && (
            <Card className="px-4 py-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Total KPIs</p>
              <p className="text-lg font-semibold text-ink">{kpis.length}</p>
            </Card>
          )
        }
      />

      {error && (
        <Alert tone="error" className="mb-6">
          {error}
        </Alert>
      )}

      <SectionCard title="Add KPI" className="mb-8">
        <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-3">
          <Field label="Name" htmlFor="kpi-name">
            <TextInput
              id="kpi-name"
              type="text"
              required
              placeholder="e.g. Bugs Resolved"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label="Target" htmlFor="kpi-target" hint="Optional">
            <TextInput
              id="kpi-target"
              type="number"
              min="0"
              placeholder="Optional"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
            />
          </Field>
          <Field label="Unit" htmlFor="kpi-unit" hint="Optional">
            <TextInput
              id="kpi-unit"
              type="text"
              placeholder="e.g. bugs"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            />
          </Field>
          <Button type="submit" disabled={isCreating} className="sm:col-span-3">
            Add KPI
          </Button>
        </form>
      </SectionCard>

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
