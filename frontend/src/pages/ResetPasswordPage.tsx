import { useState, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ApiError, apiFetch } from '../lib/apiClient'
import type { ApiMessageResponse } from '../types/auth'
import {
  AuthLayout,
  BackToSignInLink,
  authButtonClass,
  authInputClass,
  authLabelClass,
} from '../components/AuthLayout'

export function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [email, setEmail] = useState(searchParams.get('email') ?? '')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      await apiFetch<ApiMessageResponse>('/reset-password', {
        method: 'POST',
        body: {
          token,
          email,
          password,
          password_confirmation: passwordConfirmation,
        },
      })
      navigate('/login', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to reset password.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Change Password" subtitle="Set a new password for your account.">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div>
          <label htmlFor="email" className={authLabelClass}>
            Email address
          </label>
          <input
            id="email"
            type="email"
            required
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={authInputClass}
          />
        </div>

        <div>
          <label htmlFor="password" className={authLabelClass}>
            New password
          </label>
          <input
            id="password"
            type="password"
            required
            placeholder="Password..."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={authInputClass}
          />
        </div>

        <div>
          <label htmlFor="password_confirmation" className={authLabelClass}>
            Confirm password
          </label>
          <input
            id="password_confirmation"
            type="password"
            required
            placeholder="Password..."
            value={passwordConfirmation}
            onChange={(e) => setPasswordConfirmation(e.target.value)}
            className={authInputClass}
          />
        </div>

        <button type="submit" disabled={isSubmitting} className={authButtonClass}>
          {isSubmitting ? 'Changing…' : 'Change Password'}
        </button>
      </form>

      <BackToSignInLink />
    </AuthLayout>
  )
}
