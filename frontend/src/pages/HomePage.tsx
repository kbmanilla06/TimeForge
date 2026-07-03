import { useAuth } from '../context/useAuth'
import { Card } from '../components/ui/Card'

export function HomePage() {
  const { user } = useAuth()

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
      <Card className="p-8">
        <h1 className="text-2xl font-bold tracking-tight text-ink">TimeForge</h1>
        <p className="mt-2 text-sm text-muted">
          Welcome, {user?.name} ({user?.role})
        </p>
      </Card>
    </main>
  )
}
