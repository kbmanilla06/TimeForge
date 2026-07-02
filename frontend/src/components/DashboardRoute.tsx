import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

/**
 * Assumes it is only ever rendered inside ProtectedRoute, which already
 * guarantees an authenticated, non-loading user before this mounts.
 */
export function DashboardRoute() {
  const { user } = useAuth()

  if (user?.role !== 'supervisor' && user?.role !== 'admin' && user?.role !== 'hr_finance') {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
