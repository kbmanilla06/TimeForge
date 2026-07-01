import { useEffect, useState, type FormEvent } from 'react'
import { createProject, deleteProject, listClients, listProjects, updateProject } from '../../lib/adminApi'
import { ApiError } from '../../lib/apiClient'
import type { Client, Project } from '../../types/admin'

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
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-slate-900">Projects</h1>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <form onSubmit={handleCreate} className="mt-6 flex gap-2">
        <input
          type="text"
          required
          placeholder="New project name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={newClientId}
          onChange={(e) => setNewClientId(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">— No client —</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={isCreating}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Add Project
        </button>
      </form>

      {isLoading ? (
        <p className="mt-6 text-slate-500">Loading…</p>
      ) : (
        <table className="mt-6 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2">Name</th>
              <th className="py-2">Client</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id} className="border-b border-slate-100">
                <td className="py-2">
                  {editingId === project.id ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                    />
                  ) : (
                    project.name
                  )}
                </td>
                <td className="py-2">
                  {editingId === project.id ? (
                    <select
                      value={editingClientId}
                      onChange={(e) => setEditingClientId(e.target.value)}
                      className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                    >
                      <option value="">— No client —</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    (project.client?.name ?? '—')
                  )}
                </td>
                <td className="space-x-2 py-2">
                  {editingId === project.id ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(project.id)}
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
                        onClick={() => startEditing(project)}
                        className="text-slate-900 underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(project)}
                        className="text-red-600 underline"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {projects.length === 0 && (
              <tr>
                <td colSpan={3} className="py-4 text-center text-slate-400">
                  No projects yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </main>
  )
}
