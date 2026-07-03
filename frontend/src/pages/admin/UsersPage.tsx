import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { activateUser, deactivateUser, listUsers } from '../../lib/adminApi'
import { ApiError } from '../../lib/apiClient'
import type { AdminUser } from '../../types/admin'
import { Alert } from '../../components/ui/Alert'
import { StatusBadge } from '../../components/ui/Badge'
import { ButtonLink } from '../../components/ui/Button'
import { PageHeader } from '../../components/ui/PageHeader'
import { LoadingState } from '../../components/ui/states'
import { TableCard, TableHead, Td, Th, Tr } from '../../components/ui/Table'

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
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <PageHeader
        title="Users"
        subtitle="Provision accounts, assign roles and departments."
        actions={<ButtonLink to="/admin/users/new">Create User</ButtonLink>}
      />

      {error && (
        <Alert tone="error" className="mb-4">
          {error}
        </Alert>
      )}

      {isLoading ? (
        <LoadingState />
      ) : (
        <TableCard>
          <TableHead>
            <Th>Name</Th>
            <Th>Email</Th>
            <Th>Role</Th>
            <Th>Status</Th>
            <Th>Department</Th>
            <Th>Actions</Th>
          </TableHead>
          <tbody>
            {users.map((user) => {
              const isSelf = user.id === currentUser?.id

              return (
                <Tr key={user.id}>
                  <Td className="font-medium text-ink">{user.name}</Td>
                  <Td className="text-muted">{user.email}</Td>
                  <Td className="text-muted">{user.role}</Td>
                  <Td>
                    <StatusBadge status={user.status} />
                  </Td>
                  <Td className="text-muted">{user.department?.name ?? '—'}</Td>
                  <Td className="space-x-3 whitespace-nowrap">
                    <Link
                      to={`/admin/users/${user.id}/edit`}
                      className="font-medium text-primary hover:underline"
                    >
                      Edit
                    </Link>
                    {user.status === 'active' ? (
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(user)}
                        disabled={isSelf}
                        title={isSelf ? 'You cannot deactivate your own account' : undefined}
                        className="font-medium text-red-600 hover:underline disabled:cursor-not-allowed disabled:text-slate-300 disabled:no-underline"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(user)}
                        className="font-medium text-emerald-700 hover:underline"
                      >
                        Activate
                      </button>
                    )}
                  </Td>
                </Tr>
              )
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  No users yet.
                </td>
              </tr>
            )}
          </tbody>
        </TableCard>
      )}
    </main>
  )
}
