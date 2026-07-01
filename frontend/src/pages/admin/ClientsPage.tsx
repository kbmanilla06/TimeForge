import { useEffect, useState, type FormEvent } from 'react'
import { createClient, deleteClient, listClients, updateClient } from '../../lib/adminApi'
import { ApiError } from '../../lib/apiClient'
import type { Client } from '../../types/admin'

export function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [newName, setNewName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')

  useEffect(() => {
    void loadClients()
  }, [])

  async function loadClients() {
    setIsLoading(true)
    setError(null)
    try {
      setClients(await listClients())
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load clients.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsCreating(true)
    try {
      await createClient({ name: newName })
      setNewName('')
      await loadClients()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create client.')
    } finally {
      setIsCreating(false)
    }
  }

  function startEditing(client: Client) {
    setEditingId(client.id)
    setEditingName(client.name)
  }

  async function handleRename(id: number) {
    setError(null)
    try {
      await updateClient(id, { name: editingName })
      setEditingId(null)
      await loadClients()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to rename client.')
    }
  }

  async function handleDelete(client: Client) {
    const count = client.projects_count ?? 0
    const confirmed = window.confirm(
      count > 0
        ? `Delete "${client.name}"? ${count} project(s) will become unlinked.`
        : `Delete "${client.name}"?`,
    )
    if (!confirmed) return

    setError(null)
    try {
      await deleteClient(client.id)
      await loadClients()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to delete client.')
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-slate-900">Clients</h1>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <form onSubmit={handleCreate} className="mt-6 flex gap-2">
        <input
          type="text"
          required
          placeholder="New client name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={isCreating}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Add Client
        </button>
      </form>

      {isLoading ? (
        <p className="mt-6 text-slate-500">Loading…</p>
      ) : (
        <table className="mt-6 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2">Name</th>
              <th className="py-2">Projects</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id} className="border-b border-slate-100">
                <td className="py-2">
                  {editingId === client.id ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                    />
                  ) : (
                    client.name
                  )}
                </td>
                <td className="py-2">{client.projects_count ?? 0}</td>
                <td className="space-x-2 py-2">
                  {editingId === client.id ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleRename(client.id)}
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
                        onClick={() => startEditing(client)}
                        className="text-slate-900 underline"
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(client)}
                        className="text-red-600 underline"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr>
                <td colSpan={3} className="py-4 text-center text-slate-400">
                  No clients yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </main>
  )
}
