import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { ApiError } from '../lib/apiClient'
import { AuthLayout, authButtonClass, authInputClass, authLabelClass } from '../components/AuthLayout'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      await login(email, password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to log in.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Sign In" subtitle="Enter your credentials to access your account.">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div>
          <label htmlFor="email" className={authLabelClass}>
            Email Address
          </label>
          <input
            id="email"
            type="email"
            required
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={authInputClass}
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="password" className={authLabelClass}>
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-sm font-medium text-[#1876f2] hover:underline"
            >
              Forgot Password?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={authInputClass}
          />
        </div>

        <button type="submit" disabled={isSubmitting} className={authButtonClass}>
          {isSubmitting ? 'Signing in…' : 'Log In'}
        </button>
      </form>
    </AuthLayout>
  )
}
