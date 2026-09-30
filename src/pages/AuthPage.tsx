import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout'
import { useAuth } from '../context/AuthContext'

export function AuthPage() {
  const { authRequired, loading, user, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!authRequired) {
    return <Navigate to="/" replace />
  }

  if (!loading && user) {
    return <Navigate to={from} replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const result = await signIn(email.trim(), password)
    setSubmitting(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    navigate(from, { replace: true })
  }

  const field =
    'mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white'

  return (
    <AuthLayout>
      <div className="glass-card rounded-3xl p-8 shadow-lg ring-1 ring-slate-200/80 dark:ring-slate-700">
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">Welcome back.</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          This ledger is private. Sign in with your account to open it.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error ? (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:bg-rose-950 dark:text-rose-200">
              {error}
            </p>
          ) : null}

          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Email
            <input
              type="email"
              className={field}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Password
            <input
              type="password"
              className={field}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              required
              minLength={6}
              autoComplete="current-password"
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl bg-[#1a3a2f] py-3 text-sm font-semibold text-[#f7f4ee] hover:bg-[#143028] disabled:opacity-60"
          >
            {submitting ? 'Please wait…' : 'Open my ledger'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-500">
          Built for one person. New accounts are not offered here.
        </p>
      </div>
    </AuthLayout>
  )
}
