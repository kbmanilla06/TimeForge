import { useAuth } from '../context/AuthContext'

export function HomePage() {
  const { user } = useAuth()

  return (
    <main className="flex min-h-[calc(100vh-57px)] items-center justify-center bg-white">
      <div className="text-center">
        <h1 className="text-3xl font-semibold text-slate-900">TimeForge</h1>
        <p className="mt-2 text-slate-500">
          Welcome, {user?.name} ({user?.role})
        </p>
      </div>
    </main>
  )
}
