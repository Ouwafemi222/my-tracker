import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function RequireAuth() {
  const { authRequired, loading, user } = useAuth()
  const location = useLocation()

  if (!authRequired) {
    return <Outlet />
  }

  if (loading) {
    return (
      <div className="app-shell-bg flex min-h-svh items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">Loading your account…</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
