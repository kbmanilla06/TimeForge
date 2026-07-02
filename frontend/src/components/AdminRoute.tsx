import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

/**
 * Assumes it is only ever rendered inside ProtectedRoute, which already
 * guarantees an authenticated, non-loading user before this mounts.
 */
export function AdminRoute() {
  const { user } = useAuth()

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
