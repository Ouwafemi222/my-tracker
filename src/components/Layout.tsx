import { NavLink, Outlet } from 'react-router-dom'
import { useTransactions } from '../context/TransactionContext'
import { VersionBadge } from './VersionBadge'
import { StorageNotice } from './StorageNotice'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-emerald-600 text-white shadow-sm'
      : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 dark:text-slate-200 dark:hover:bg-emerald-950 dark:hover:text-emerald-300',
  ].join(' ')

export function Layout() {
  const { settings, setTheme } = useTransactions()

  return (
    <div className="min-h-svh bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight sm:text-xl">
                Gratitude Expenses Tracking
              </h1>
              <VersionBadge version={2} />
            </div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Upgraded cash-flow dashboard · Nigerian naira (₦)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setTheme(settings.theme === 'dark' ? 'light' : 'dark')}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium dark:border-slate-600 dark:hover:bg-slate-800"
              aria-label="Toggle light and dark mode"
            >
              {settings.theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </button>
            <nav className="flex flex-wrap gap-1" aria-label="Main">
              <NavLink to="/" end className={linkClass}>
                Dashboard
              </NavLink>
              <NavLink to="/add" className={linkClass}>
                Add
              </NavLink>
              <NavLink to="/history" className={linkClass}>
                History
              </NavLink>
              <NavLink to="/data" className={linkClass}>
                Data
              </NavLink>
            </nav>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <StorageNotice />
        <Outlet />
      </main>
      <footer className="border-t border-slate-100 py-6 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-500">
        Africa/Lagos · Integer kobo storage · Version 2 namespace in localStorage
      </footer>
    </div>
  )
}
