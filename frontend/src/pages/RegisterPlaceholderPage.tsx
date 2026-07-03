import { AuthLayout, BackToSignInLink } from '../components/AuthLayout'

export function RegisterPlaceholderPage() {
  return (
    <AuthLayout
      title="Create Account"
      subtitle="Self-service registration is coming soon. For now, ask your administrator to set up your account."
    >
      <BackToSignInLink />
    </AuthLayout>
  )
}
