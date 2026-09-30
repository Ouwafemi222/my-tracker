import { Component, type ErrorInfo, type ReactNode } from 'react'

interface State {
  error: Error | null
}

export class RootErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App error:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-svh items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
          <div className="max-w-md rounded-2xl border border-rose-200 bg-white p-6 shadow-lg dark:border-rose-900 dark:bg-slate-900">
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
              Something went wrong
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              {this.state.error.message}
            </p>
            <p className="mt-4 text-xs text-slate-500">
              If you just deployed, check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your
              host settings (no quotes), then redeploy.
            </p>
            <button
              type="button"
              className="mt-4 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
