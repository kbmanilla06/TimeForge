import { useEffect, useState, type FormEvent } from 'react'
import { createHoliday, deleteHoliday, listHolidays, updateHoliday } from '../../lib/holidayApi'
import { ApiError } from '../../lib/apiClient'
import type { Holiday } from '../../types/holiday'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { TextInput } from '../../components/ui/fields'
import { PageHeader } from '../../components/ui/PageHeader'
import { LoadingState } from '../../components/ui/states'
import { TableCard, TableHead, Td, Th, Tr } from '../../components/ui/Table'

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString()
}

export function HolidaysPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [newDate, setNewDate] = useState('')
  const [newName, setNewName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingDate, setEditingDate] = useState('')
  const [editingName, setEditingName] = useState('')

  useEffect(() => {
    void loadHolidays()
  }, [])

  async function loadHolidays() {
    setIsLoading(true)
    setError(null)
    try {
      setHolidays(await listHolidays())
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load holidays.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsCreating(true)
    try {
      await createHoliday({ date: newDate, name: newName })
      setNewDate('')
      setNewName('')
      await loadHolidays()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create holiday.')
    } finally {
      setIsCreating(false)
    }
  }

  function startEditing(holiday: Holiday) {
    setEditingId(holiday.id)
    setEditingDate(holiday.date)
    setEditingName(holiday.name)
  }

  async function handleSave(id: number) {
    setError(null)
    try {
      await updateHoliday(id, { date: editingDate, name: editingName })
      setEditingId(null)
      await loadHolidays()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to save holiday.')
    }
  }

  async function handleDelete(holiday: Holiday) {
    const confirmed = window.confirm(`Delete "${holiday.name}"?`)
    if (!confirmed) return

    setError(null)
    try {
      await deleteHoliday(holiday.id)
      await loadHolidays()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to delete holiday.')
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <PageHeader
        title="Holidays"
        subtitle="Manage company holidays shown as context in attendance and reporting."
      />

      {error && (
        <Alert tone="error" className="mb-4">
          {error}
        </Alert>
      )}

      <form onSubmit={handleCreate} className="mb-6 flex flex-wrap items-start gap-2">
        <TextInput
          type="date"
          required
          value={newDate}
          onChange={(e) => setNewDate(e.target.value)}
          aria-label="Holiday date"
        />
        <TextInput
          type="text"
          required
          placeholder="Holiday name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="max-w-xs flex-1"
        />
        <Button type="submit" disabled={isCreating}>
          Add Holiday
        </Button>
      </form>

      {isLoading ? (
        <LoadingState />
      ) : (
        <TableCard>
          <TableHead>
            <Th>Date</Th>
            <Th>Name</Th>
            <Th>Actions</Th>
          </TableHead>
          <tbody>
            {holidays.map((holiday) => {
              const isEditing = editingId === holiday.id

              return (
                <Tr key={holiday.id}>
                  <Td className="text-muted">
                    {isEditing ? (
                      <TextInput
                        type="date"
                        value={editingDate}
                        onChange={(e) => setEditingDate(e.target.value)}
                        className="h-8"
                      />
                    ) : (
                      formatDate(holiday.date)
                    )}
                  </Td>
                  <Td className="font-medium text-ink">
                    {isEditing ? (
                      <TextInput
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="h-8 max-w-xs"
                      />
                    ) : (
                      holiday.name
                    )}
                  </Td>
                  <Td className="space-x-3 whitespace-nowrap align-top">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSave(holiday.id)}
                          className="font-medium text-primary hover:underline"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="font-medium text-muted hover:underline"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => startEditing(holiday)}
                          className="font-medium text-primary hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(holiday)}
                          className="font-medium text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </Td>
                </Tr>
              )
            })}
            {holidays.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-muted">
                  No holidays yet.
                </td>
              </tr>
            )}
          </tbody>
        </TableCard>
      )}
    </main>
  )
}
