import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createUser, listDepartments, listUsers, updateUser } from '../../lib/adminApi'
import { ApiError } from '../../lib/apiClient'
import type { Department } from '../../types/admin'
import type { Role } from '../../types/auth'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Field, Select, TextInput } from '../../components/ui/fields'
import { PageHeader } from '../../components/ui/PageHeader'
import { LoadingState } from '../../components/ui/states'

const ROLES: Role[] = ['employee', 'supervisor', 'hr_finance', 'admin']

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages) return null
  return <p className="mt-1 text-sm text-red-600">{messages[0]}</p>
}

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
    return (
      <main className="mx-auto w-full max-w-lg px-4 py-6 sm:px-6">
        <LoadingState />
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-6 sm:px-6">
      <PageHeader title={isEditMode ? 'Edit User' : 'Create User'} />

      {formError && (
        <Alert tone="error" className="mb-4">
          {formError}
        </Alert>
      )}

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Field label="Name" htmlFor="name">
              <TextInput
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <FieldError messages={errors.name} />
          </div>

          <div>
            <Field label="Email" htmlFor="email">
              <TextInput
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <FieldError messages={errors.email} />
          </div>

          {!isEditMode && (
            <div>
              <Field label="Initial Password" htmlFor="password">
                <TextInput
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
              <FieldError messages={errors.password} />
            </div>
          )}

          <div>
            <Field label="Role" htmlFor="role">
              <Select id="role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
            </Field>
            <FieldError messages={errors.role} />
          </div>

          <div>
            <Field label="Department" htmlFor="department">
              <Select
                id="department"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
              >
                <option value="">— None —</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </Select>
            </Field>
            <FieldError messages={errors.department_id} />
          </div>

          {isEditMode && (
            <div>
              <Field label="Hourly Rate" htmlFor="hourlyRate">
                <TextInput
                  id="hourlyRate"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 20.00"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                />
              </Field>
              <FieldError messages={errors.hourly_rate} />
            </div>
          )}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Saving…' : isEditMode ? 'Save Changes' : 'Create User'}
          </Button>
        </form>
      </Card>
    </main>
  )
}
