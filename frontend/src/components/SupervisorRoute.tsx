import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Assumes it is only ever rendered inside ProtectedRoute, which already
 * guarantees an authenticated, non-loading user before this mounts.
 */
export function SupervisorRoute() {
  const { user } = useAuth()

  if (user?.role !== 'supervisor' && user?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
