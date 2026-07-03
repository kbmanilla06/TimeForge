import { useEffect, useState, type FormEvent } from 'react'
import { createDepartment, deleteDepartment, listDepartments, updateDepartment } from '../../lib/adminApi'
import { ApiError } from '../../lib/apiClient'
import type { Department } from '../../types/admin'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { TextInput } from '../../components/ui/fields'
import { PageHeader } from '../../components/ui/PageHeader'
import { LoadingState } from '../../components/ui/states'
import { TableCard, TableHead, Td, Th, Tr } from '../../components/ui/Table'

export function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [newName, setNewName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')

  useEffect(() => {
    void loadDepartments()
  }, [])

  async function loadDepartments() {
    setIsLoading(true)
    setError(null)
    try {
      setDepartments(await listDepartments())
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load departments.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsCreating(true)
    try {
      await createDepartment({ name: newName })
      setNewName('')
      await loadDepartments()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create department.')
    } finally {
      setIsCreating(false)
    }
  }

  function startEditing(department: Department) {
    setEditingId(department.id)
    setEditingName(department.name)
  }

  async function handleRename(id: number) {
    setError(null)
    try {
      await updateDepartment(id, { name: editingName })
      setEditingId(null)
      await loadDepartments()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to rename department.')
    }
  }

  async function handleDelete(department: Department) {
    const count = department.users_count ?? 0
    const confirmed = window.confirm(
      count > 0
        ? `Delete "${department.name}"? ${count} user(s) will become unassigned.`
        : `Delete "${department.name}"?`,
    )
    if (!confirmed) return

    setError(null)
    try {
      await deleteDepartment(department.id)
      await loadDepartments()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to delete department.')
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
      <PageHeader title="Departments" subtitle="Organize users into departments." />

      {error && (
        <Alert tone="error" className="mb-4">
          {error}
        </Alert>
      )}

      <form onSubmit={handleCreate} className="mb-6 flex flex-wrap gap-2">
        <TextInput
          type="text"
          required
          placeholder="New department name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="max-w-xs flex-1"
        />
        <Button type="submit" disabled={isCreating}>
          Add Department
        </Button>
      </form>

      {isLoading ? (
        <LoadingState />
      ) : (
        <TableCard>
          <TableHead>
            <Th>Name</Th>
            <Th>Users</Th>
            <Th>Actions</Th>
          </TableHead>
          <tbody>
            {departments.map((department) => (
              <Tr key={department.id}>
                <Td className="font-medium text-ink">
                  {editingId === department.id ? (
                    <TextInput
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="h-8 max-w-xs"
                    />
                  ) : (
                    department.name
                  )}
                </Td>
                <Td className="text-muted">{department.users_count ?? 0}</Td>
                <Td className="space-x-3 whitespace-nowrap">
                  {editingId === department.id ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleRename(department.id)}
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
                        onClick={() => startEditing(department)}
                        className="font-medium text-primary hover:underline"
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(department)}
                        className="font-medium text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </Td>
              </Tr>
            ))}
            {departments.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-muted">
                  No departments yet.
                </td>
              </tr>
            )}
          </tbody>
        </TableCard>
      )}
    </main>
  )
}
