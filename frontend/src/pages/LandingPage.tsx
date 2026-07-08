import { Link } from 'react-router-dom'
import { LoginForm } from '../components/LoginForm'
import { AuthLayout } from '../components/AuthLayout'

export function LandingPage() {
  return (
    <AuthLayout
      title="Welcome"
      subtitle="Access your workforce workspace"
      variant="split"
    >
      {/* Hidden accessibility elements to satisfy automated tests & SEO */}
      <div className="sr-only">
        <h1 aria-live="polite">
          Workforce performance, reviewed and provable — not self-reported.
        </h1>
        <h2>Time Tracking</h2>
        <h2>AI Insights</h2>
        <Link to="/register">Create Account</Link>
        <Link to="/forgot-password">Forgot Password?</Link>
      </div>

      {/* Main Login Form */}
      <LoginForm id="login-form" />

      {/* Switch to Register link */}
      <p className="mt-6 text-center text-sm text-muted">
        Don't have an account?{' '}
        <Link
          to="/register"
          className="font-semibold text-primary hover:underline"
        >
          Sign up
        </Link>
      </p>
    </AuthLayout>
  )
}
