import { useEffect, useState, type FormEvent } from 'react'
import { createProject, deleteProject, listClients, listProjects, updateProject } from '../../lib/adminApi'
import { ApiError } from '../../lib/apiClient'
import type { Client, Project } from '../../types/admin'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Select, TextInput } from '../../components/ui/fields'
import { PageHeader } from '../../components/ui/PageHeader'
import { LoadingState } from '../../components/ui/states'
import { TableCard, TableHead, Td, Th, Tr } from '../../components/ui/Table'

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [newName, setNewName] = useState('')
  const [newClientId, setNewClientId] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [editingClientId, setEditingClientId] = useState('')

  useEffect(() => {
    void loadData()
  }, [])

  async function loadData() {
    setIsLoading(true)
    setError(null)
    try {
      const [projectList, clientList] = await Promise.all([listProjects(), listClients()])
      setProjects(projectList)
      setClients(clientList)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load projects.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsCreating(true)
    try {
      await createProject({
        name: newName,
        client_id: newClientId ? Number(newClientId) : null,
      })
      setNewName('')
      setNewClientId('')
      await loadData()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create project.')
    } finally {
      setIsCreating(false)
    }
  }

  function startEditing(project: Project) {
    setEditingId(project.id)
    setEditingName(project.name)
    setEditingClientId(project.client_id ? String(project.client_id) : '')
  }

  async function handleSaveEdit(id: number) {
    setError(null)
    try {
      await updateProject(id, {
        name: editingName,
        client_id: editingClientId ? Number(editingClientId) : null,
      })
      setEditingId(null)
      await loadData()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to update project.')
    }
  }

  async function handleDelete(project: Project) {
    const confirmed = window.confirm(`Delete "${project.name}"?`)
    if (!confirmed) return

    setError(null)
    try {
      await deleteProject(project.id)
      await loadData()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to delete project.')
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
      <PageHeader title="Projects" subtitle="Projects that time entries can be logged against." />

      {error && (
        <Alert tone="error" className="mb-4">
          {error}
        </Alert>
      )}

      <form onSubmit={handleCreate} className="mb-6 flex flex-wrap gap-2">
        <TextInput
          type="text"
          required
          placeholder="New project name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="max-w-xs flex-1"
        />
        <Select
          value={newClientId}
          onChange={(e) => setNewClientId(e.target.value)}
          className="w-auto"
        >
          <option value="">— No client —</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </Select>
        <Button type="submit" disabled={isCreating}>
          Add Project
        </Button>
      </form>

      {isLoading ? (
        <LoadingState />
      ) : (
        <TableCard>
          <TableHead>
            <Th>Name</Th>
            <Th>Client</Th>
            <Th>Actions</Th>
          </TableHead>
          <tbody>
            {projects.map((project) => (
              <Tr key={project.id}>
                <Td className="font-medium text-ink">
                  {editingId === project.id ? (
                    <TextInput
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="h-8 max-w-xs"
                    />
                  ) : (
                    project.name
                  )}
                </Td>
                <Td className="text-muted">
                  {editingId === project.id ? (
                    <Select
                      value={editingClientId}
                      onChange={(e) => setEditingClientId(e.target.value)}
                      className="h-8 w-auto"
                    >
                      <option value="">— No client —</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    (project.client?.name ?? '—')
                  )}
                </Td>
                <Td className="space-x-3 whitespace-nowrap">
                  {editingId === project.id ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(project.id)}
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
                        onClick={() => startEditing(project)}
                        className="font-medium text-primary hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(project)}
                        className="font-medium text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </Td>
              </Tr>
            ))}
            {projects.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-muted">
                  No projects yet.
                </td>
              </tr>
            )}
          </tbody>
        </TableCard>
      )}
    </main>
  )
}
