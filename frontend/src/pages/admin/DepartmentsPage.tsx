import { useEffect, useState, type FormEvent } from 'react'
import { createDepartment, deleteDepartment, listDepartments, updateDepartment } from '../../lib/adminApi'
import { ApiError } from '../../lib/apiClient'
import type { Department } from '../../types/admin'

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
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-slate-900">Departments</h1>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <form onSubmit={handleCreate} className="mt-6 flex gap-2">
        <input
          type="text"
          required
          placeholder="New department name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={isCreating}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Add Department
        </button>
      </form>

      {isLoading ? (
        <p className="mt-6 text-slate-500">Loading…</p>
      ) : (
        <table className="mt-6 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2">Name</th>
              <th className="py-2">Users</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {departments.map((department) => (
              <tr key={department.id} className="border-b border-slate-100">
                <td className="py-2">
                  {editingId === department.id ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                    />
                  ) : (
                    department.name
                  )}
                </td>
                <td className="py-2">{department.users_count ?? 0}</td>
                <td className="space-x-2 py-2">
                  {editingId === department.id ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleRename(department.id)}
                        className="text-slate-900 underline"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="text-slate-500 underline"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => startEditing(department)}
                        className="text-slate-900 underline"
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(department)}
                        className="text-red-600 underline"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {departments.length === 0 && (
              <tr>
                <td colSpan={3} className="py-4 text-center text-slate-400">
                  No departments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </main>
  )
}
