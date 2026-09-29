import { NavLink, Outlet } from 'react-router-dom'
import { VersionBadge } from './VersionBadge'
import { StorageNotice } from './StorageNotice'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-emerald-600 text-white shadow-sm'
      : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-800',
  ].join(' ')

export function Layout() {
  return (
    <div className="min-h-svh bg-white text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                Gratitude Expenses Tracking
              </h1>
              <VersionBadge version={1} />
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Personal cash flow in Nigerian naira — not a bank balance.
            </p>
          </div>
          <nav className="flex flex-wrap gap-1" aria-label="Main">
            <NavLink to="/" end className={linkClass}>
              Dashboard
            </NavLink>
            <NavLink to="/add" className={linkClass}>
              Add transaction
            </NavLink>
            <NavLink to="/history" className={linkClass}>
              History
            </NavLink>
            <NavLink to="/data" className={linkClass}>
              Data & backup
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <StorageNotice />
        <Outlet />
      </main>
      <footer className="border-t border-slate-100 py-6 text-center text-xs text-slate-500">
        Dates reported in Africa/Lagos · Amounts stored as integer kobo
      </footer>
    </div>
  )
}
