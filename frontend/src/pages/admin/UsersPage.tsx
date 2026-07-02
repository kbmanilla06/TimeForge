import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { activateUser, deactivateUser, listUsers } from '../../lib/adminApi'
import { ApiError } from '../../lib/apiClient'
import type { AdminUser } from '../../types/admin'

export function UsersPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void loadUsers()
  }, [])

  async function loadUsers() {
    setIsLoading(true)
    setError(null)
    try {
      setUsers(await listUsers())
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load users.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleToggleStatus(user: AdminUser) {
    setError(null)
    try {
      if (user.status === 'active') {
        const confirmed = window.confirm(`Deactivate ${user.name}?`)
        if (!confirmed) return
        await deactivateUser(user.id)
      } else {
        await activateUser(user.id)
      }
      await loadUsers()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to update user status.')
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Users</h1>
        <Link to="/admin/users/new" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white">
          Create User
        </Link>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {isLoading ? (
        <p className="mt-6 text-slate-500">Loading…</p>
      ) : (
        <table className="mt-6 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2">Name</th>
              <th className="py-2">Email</th>
              <th className="py-2">Role</th>
              <th className="py-2">Status</th>
              <th className="py-2">Department</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isSelf = user.id === currentUser?.id

              return (
                <tr key={user.id} className="border-b border-slate-100">
                  <td className="py-2">{user.name}</td>
                  <td className="py-2">{user.email}</td>
                  <td className="py-2">{user.role}</td>
                  <td className="py-2">{user.status}</td>
                  <td className="py-2">{user.department?.name ?? '—'}</td>
                  <td className="space-x-2 py-2">
                    <Link to={`/admin/users/${user.id}/edit`} className="text-slate-900 underline">
                      Edit
                    </Link>
                    {user.status === 'active' ? (
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(user)}
                        disabled={isSelf}
                        title={isSelf ? 'You cannot deactivate your own account' : undefined}
                        className="text-red-600 underline disabled:cursor-not-allowed disabled:text-slate-300 disabled:no-underline"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button type="button" onClick={() => handleToggleStatus(user)} className="text-green-700 underline">
                        Activate
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="py-4 text-center text-slate-400">
                  No users yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </main>
  )
}
