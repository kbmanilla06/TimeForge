import { useAuth } from '../context/AuthContext'

export function HomePage() {
  const { user, logout } = useAuth()

  return (
    <main className="flex min-h-screen items-center justify-center bg-white">
      <div className="text-center">
        <h1 className="text-3xl font-semibold text-slate-900">TimeForge</h1>
        <p className="mt-2 text-slate-500">
          Welcome, {user?.name} ({user?.role})
        </p>
        <button
          type="button"
          onClick={() => logout()}
          className="mt-6 rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700"
        >
          Log out
        </button>
      </div>
    </main>
  )
}
