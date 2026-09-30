import { getAppBranding, isProApp } from '../config/appVariant'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { Logo } from './Logo'

export function AuthLayout({ children }: { children: React.ReactNode }) {
  useDocumentTitle()
  const brand = getAppBranding()

  return (
    <div className="app-shell-bg flex min-h-svh flex-col">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="mb-8 flex items-center gap-3">
          <Logo className="h-11 w-11" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              Personal finance
            </p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">
              {isProApp() ? brand.fullName : brand.shortName}
            </p>
          </div>
        </div>
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  )
}
