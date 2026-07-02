import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

/**
 * Assumes it is only ever rendered inside ProtectedRoute, which already
 * guarantees an authenticated, non-loading user before this mounts.
 */
export function PayrollRoute() {
  const { user } = useAuth()

  if (user?.role !== 'admin' && user?.role !== 'hr_finance') {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
