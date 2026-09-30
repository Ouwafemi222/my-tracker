import { NavLink, Outlet } from 'react-router-dom'
import { getAppBranding, isProApp } from '../config/appVariant'
import { useAuth } from '../context/AuthContext'
import { useTransactions } from '../context/TransactionContext'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { isSupabaseConfigured } from '../lib/supabaseEnv'
import { LiveIndicator } from './LiveIndicator'
import { Logo } from './Logo'
import { UpgradeToProButton } from './UpgradeToProButton'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded-full px-4 py-2 text-sm font-medium transition-all duration-200',
    isActive
      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
      : 'text-slate-600 hover:bg-white/80 hover:text-emerald-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-emerald-300',
  ].join(' ')

export function Layout() {
  useDocumentTitle()
  const brand = getAppBranding()
  const { profile } = useAuth()
  const { settings, setTheme, cloudSyncState, cloudSyncError } = useTransactions()

  const initial = profile?.display_name?.charAt(0).toUpperCase() ?? '?'

  return (
    <div className="app-shell-bg min-h-svh text-slate-900 dark:text-slate-100">
      <header className="sticky top-0 z-50 border-b border-[#e2dbce]/80 bg-[#f7f4ee]/80 backdrop-blur-xl dark:border-slate-800/80 dark:bg-[#0c1612]/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <Logo />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800 dark:text-[#d6ee7a]">
                Private ledger
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white sm:text-xl">
                  {isProApp() ? brand.shortName : brand.shortName}
                </h1>
                {isProApp() ? (
                  <span className="rounded-full bg-[#1a3a2f] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#d6ee7a]">
                    Mine
                  </span>
                ) : null}
              </div>
              {isProApp() ? (
                <p className="text-[11px] leading-snug text-slate-500 dark:text-slate-400 sm:max-w-xs">
                  {brand.fullName}
                </p>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">{brand.tagline}</p>
              )}
              {profile ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Hi, {profile.display_name}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 lg:justify-end">
            <UpgradeToProButton compact />
            {isSupabaseConfigured() ? (
              <LiveIndicator state={cloudSyncState} error={cloudSyncError} />
            ) : null}
            <button
              type="button"
              onClick={() => setTheme(settings.theme === 'dark' ? 'light' : 'dark')}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              aria-label={settings.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              {settings.theme === 'dark' ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>
              )}
            </button>
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition ${
                  isActive
                    ? 'bg-emerald-600 text-white ring-2 ring-emerald-300'
                    : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                }`
              }
              title="Profile"
            >
              {initial}
            </NavLink>
            <nav
              className="flex flex-wrap gap-1 rounded-full border border-slate-200/80 bg-slate-100/80 p-1 dark:border-slate-700 dark:bg-slate-900/80"
              aria-label="Main"
            >
              <NavLink to="/" end className={linkClass}>
                Overview
              </NavLink>
              <NavLink to="/add" className={linkClass}>
                Record
              </NavLink>
              <NavLink to="/history" className={linkClass}>
                Activity
              </NavLink>
              <NavLink to="/data" className={linkClass}>
                Settings
              </NavLink>
            </nav>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="animate-fade-up">
          <Outlet />
        </div>
      </main>

      <footer className="border-t border-slate-200/80 py-8 text-center dark:border-slate-800">
        <p className="text-sm text-slate-500 dark:text-slate-500">
          My ledger · Nigerian naira
        </p>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-600">
          Net figures show money in and out — not your bank balance.
        </p>
      </footer>
    </div>
  )
}
