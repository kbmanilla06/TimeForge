import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createUser, listDepartments, listUsers, updateUser } from '../../lib/adminApi'
import { ApiError } from '../../lib/apiClient'
import type { Department } from '../../types/admin'
import type { Role } from '../../types/auth'

const ROLES: Role[] = ['employee', 'supervisor', 'hr_finance', 'admin']

export function UserFormPage() {
  const { userId } = useParams<{ userId: string }>()
  const isEditMode = Boolean(userId)
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('employee')
  const [departmentId, setDepartmentId] = useState('')
  const [hourlyRate, setHourlyRate] = useState('')

  const [departments, setDepartments] = useState<Department[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    async function loadFormData() {
      setIsLoading(true)
      setFormError(null)
      try {
        setDepartments(await listDepartments())

        if (userId) {
          const users = await listUsers()
          const existing = users.find((u) => u.id === Number(userId))
          if (existing) {
            setName(existing.name)
            setEmail(existing.email)
            setRole(existing.role)
            setDepartmentId(existing.department_id ? String(existing.department_id) : '')
            setHourlyRate(existing.hourly_rate != null ? String(existing.hourly_rate) : '')
          }
        }
      } catch (err) {
        setFormError(err instanceof ApiError ? err.message : 'Unable to load form data.')
      } finally {
        setIsLoading(false)
      }
    }

    void loadFormData()
  }, [userId])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setErrors({})
    setFormError(null)
    setIsSubmitting(true)

    try {
      if (isEditMode) {
        await updateUser(Number(userId), {
          name,
          email,
          role,
          department_id: departmentId ? Number(departmentId) : null,
          hourly_rate: hourlyRate ? Number(hourlyRate) : null,
        })
      } else {
        await createUser({
          name,
          email,
          password,
          role,
          department_id: departmentId ? Number(departmentId) : null,
        })
      }
      navigate('/admin/users', { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        setErrors(err.errors)
      } else {
        setFormError(err instanceof ApiError ? err.message : 'Unable to save user.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return <p className="mx-auto max-w-lg px-4 py-8 text-slate-500">Loading…</p>
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-2xl font-semibold text-slate-900">{isEditMode ? 'Edit User' : 'Create User'}</h1>

      {formError && <p className="mt-4 text-sm text-red-600">{formError}</p>}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-700">
            Name
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name[0]}</p>}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email[0]}</p>}
        </div>

        {!isEditMode && (
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Initial Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password[0]}</p>}
          </div>
        )}

        <div>
          <label htmlFor="role" className="block text-sm font-medium text-slate-700">
            Role
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          {errors.role && <p className="mt-1 text-sm text-red-600">{errors.role[0]}</p>}
        </div>

        <div>
          <label htmlFor="department" className="block text-sm font-medium text-slate-700">
            Department
          </label>
          <select
            id="department"
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">— None —</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
          {errors.department_id && <p className="mt-1 text-sm text-red-600">{errors.department_id[0]}</p>}
        </div>

        {isEditMode && (
          <div>
            <label htmlFor="hourlyRate" className="block text-sm font-medium text-slate-700">
              Hourly Rate
            </label>
            <input
              id="hourlyRate"
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 20.00"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            {errors.hourly_rate && <p className="mt-1 text-sm text-red-600">{errors.hourly_rate[0]}</p>}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isSubmitting ? 'Saving…' : isEditMode ? 'Save Changes' : 'Create User'}
        </button>
      </form>
    </main>
  )
}
