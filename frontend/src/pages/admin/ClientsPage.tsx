import { useEffect, useState, type FormEvent } from 'react'
import { createClient, deleteClient, listClients, updateClient } from '../../lib/adminApi'
import { ApiError } from '../../lib/apiClient'
import type { Client } from '../../types/admin'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { TextInput } from '../../components/ui/fields'
import { PageHeader } from '../../components/ui/PageHeader'
import { LoadingState } from '../../components/ui/states'
import { TableCard, TableHead, Td, Th, Tr } from '../../components/ui/Table'

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
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
      <PageHeader title="Clients" subtitle="Clients that projects can be billed against." />

      {error && (
        <Alert tone="error" className="mb-4">
          {error}
        </Alert>
      )}

      <form onSubmit={handleCreate} className="mb-6 flex flex-wrap gap-2">
        <TextInput
          type="text"
          required
          placeholder="New client name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="max-w-xs flex-1"
        />
        <Button type="submit" disabled={isCreating}>
          Add Client
        </Button>
      </form>

      {isLoading ? (
        <LoadingState />
      ) : (
        <TableCard>
          <TableHead>
            <Th>Name</Th>
            <Th>Projects</Th>
            <Th>Actions</Th>
          </TableHead>
          <tbody>
            {clients.map((client) => (
              <Tr key={client.id}>
                <Td className="font-medium text-ink">
                  {editingId === client.id ? (
                    <TextInput
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="h-8 max-w-xs"
                    />
                  ) : (
                    client.name
                  )}
                </Td>
                <Td className="text-muted">{client.projects_count ?? 0}</Td>
                <Td className="space-x-3 whitespace-nowrap">
                  {editingId === client.id ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleRename(client.id)}
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
                        onClick={() => startEditing(client)}
                        className="font-medium text-primary hover:underline"
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(client)}
                        className="font-medium text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </Td>
              </Tr>
            ))}
            {clients.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-muted">
                  No clients yet.
                </td>
              </tr>
            )}
          </tbody>
        </TableCard>
      )}
    </main>
  )
}
