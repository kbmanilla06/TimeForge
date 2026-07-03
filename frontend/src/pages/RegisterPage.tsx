import { useEffect, useState, type FormEvent } from 'react'
import type { SVGProps } from 'react'
import { authButtonClass, authInputClass, authLabelClass, BackToSignInLink } from '../components/AuthLayout'
import { PasswordStrengthIndicator } from '../components/PasswordStrengthIndicator'
import { ApiError } from '../lib/apiClient'
import { listPublicDepartments, registerAccount } from '../lib/registrationApi'
import type { Department } from '../types/admin'

function EyeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      {...props}
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      {...props}
    >
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a20.3 20.3 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a20.3 20.3 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages) return null
  return (
    <p role="alert" className="mt-1 text-sm text-red-600">
      {messages[0]}
    </p>
  )
}

const EMPTY_FORM = {
  firstName: '',
  middleName: '',
  lastName: '',
  employeeId: '',
  departmentId: '',
  position: '',
  email: '',
  password: '',
  passwordConfirmation: '',
  contactNumber: '',
  termsAccepted: false,
}

export function RegisterPage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null)

  useEffect(() => {
    listPublicDepartments()
      .then(setDepartments)
      .catch(() => setDepartments([]))
  }, [])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setErrors({})
    setFormError(null)
    setIsSubmitting(true)

    try {
      const response = await registerAccount({
        first_name: form.firstName,
        middle_name: form.middleName || undefined,
        last_name: form.lastName,
        employee_id: form.employeeId || undefined,
        department_id: form.departmentId ? Number(form.departmentId) : '',
        position: form.position || undefined,
        email: form.email,
        password: form.password,
        password_confirmation: form.passwordConfirmation,
        contact_number: form.contactNumber || undefined,
        terms_accepted: form.termsAccepted,
      })
      setConfirmationMessage(response.message)
      setIsSubmitted(true)
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        setErrors(err.errors)
      } else {
        setFormError(err instanceof ApiError ? err.message : 'Unable to submit your registration.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-4 py-8">
        <div className="w-full max-w-md rounded-2xl border border-line bg-white p-8 shadow-card">
          <h1 className="text-2xl font-bold leading-8 tracking-[-0.6px] text-ink">Registration Received</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {confirmationMessage ??
              'Your registration has been received and is pending administrator approval.'}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            You&rsquo;ll be able to sign in once an administrator approves your account.
          </p>
          <BackToSignInLink />
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4 py-8">
      <div className="w-full max-w-2xl rounded-2xl border border-line bg-white p-8 shadow-card">
        <h1 className="text-2xl font-bold leading-8 tracking-[-0.6px] text-ink">Create Account</h1>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Submit your details for administrator review. You won&rsquo;t be able to sign in until your
          account is approved.
        </p>

        {formError && (
          <p role="alert" className="mt-4 text-sm text-red-600">
            {formError}
          </p>
        )}

        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="firstName" className={authLabelClass}>
                First Name
              </label>
              <input
                id="firstName"
                type="text"
                required
                autoComplete="given-name"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className={authInputClass}
              />
              <FieldError messages={errors.first_name} />
            </div>
            <div>
              <label htmlFor="lastName" className={authLabelClass}>
                Last Name
              </label>
              <input
                id="lastName"
                type="text"
                required
                autoComplete="family-name"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className={authInputClass}
              />
              <FieldError messages={errors.last_name} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="middleName" className={authLabelClass}>
                Middle Name <span className="font-normal text-muted">(optional)</span>
              </label>
              <input
                id="middleName"
                type="text"
                autoComplete="additional-name"
                value={form.middleName}
                onChange={(e) => setForm({ ...form, middleName: e.target.value })}
                className={authInputClass}
              />
              <FieldError messages={errors.middle_name} />
            </div>
            <div>
              <label htmlFor="employeeId" className={authLabelClass}>
                Employee ID <span className="font-normal text-muted">(optional)</span>
              </label>
              <input
                id="employeeId"
                type="text"
                value={form.employeeId}
                onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                className={authInputClass}
              />
              <FieldError messages={errors.employee_id} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="departmentId" className={authLabelClass}>
                Department
              </label>
              <select
                id="departmentId"
                required
                value={form.departmentId}
                onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                className={authInputClass}
              >
                <option value="">Select a department</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
              <FieldError messages={errors.department_id} />
            </div>
            <div>
              <label htmlFor="position" className={authLabelClass}>
                Position <span className="font-normal text-muted">(optional)</span>
              </label>
              <input
                id="position"
                type="text"
                placeholder="e.g. Backend Engineer"
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
                className={authInputClass}
              />
              <FieldError messages={errors.position} />
            </div>
          </div>

          <div>
            <label htmlFor="email" className={authLabelClass}>
              Company Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              placeholder="name@company.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={authInputClass}
            />
            <FieldError messages={errors.email} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="password" className={authLabelClass}>
                Password
              </label>
              <div className="relative mt-2">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className={`${authInputClass} mt-0 pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                </button>
              </div>
              <PasswordStrengthIndicator password={form.password} />
              <FieldError messages={errors.password} />
            </div>
            <div>
              <label htmlFor="passwordConfirmation" className={authLabelClass}>
                Confirm Password
              </label>
              <div className="relative mt-2">
                <input
                  id="passwordConfirmation"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={form.passwordConfirmation}
                  onChange={(e) => setForm({ ...form, passwordConfirmation: e.target.value })}
                  className={`${authInputClass} mt-0 pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showConfirmPassword}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  {showConfirmPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                </button>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="contactNumber" className={authLabelClass}>
              Contact Number <span className="font-normal text-muted">(optional)</span>
            </label>
            <input
              id="contactNumber"
              type="tel"
              autoComplete="tel"
              value={form.contactNumber}
              onChange={(e) => setForm({ ...form, contactNumber: e.target.value })}
              className={authInputClass}
            />
            <FieldError messages={errors.contact_number} />
          </div>

          <div>
            <label className="flex items-start gap-2 text-sm text-ink">
              <input
                type="checkbox"
                required
                checked={form.termsAccepted}
                onChange={(e) => setForm({ ...form, termsAccepted: e.target.checked })}
                className="mt-0.5 size-4 rounded border-line text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              />
              I agree to the Terms and Conditions.
            </label>
            <FieldError messages={errors.terms_accepted} />
          </div>

          <button type="submit" disabled={isSubmitting} className={authButtonClass}>
            {isSubmitting ? 'Submitting…' : 'Create Account'}
          </button>
        </form>

        <BackToSignInLink />
      </div>
    </main>
  )
}
