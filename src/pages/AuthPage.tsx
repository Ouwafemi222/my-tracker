import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout'
import { useAuth } from '../context/AuthContext'

type Mode = 'signin' | 'signup'

export function AuthPage() {
  const { authRequired, loading, user, signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const [mode, setMode] = useState<Mode>('signin')
  const [displayName, setDisplayName] = useState('')
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

    const result =
      mode === 'signin'
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password, displayName)

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
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {mode === 'signin' ? 'Welcome back' : 'Create your account'}
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {mode === 'signin'
            ? 'Sign in to access your personal finance overview.'
            : 'Join free — start tracking income and spending in naira.'}
        </p>

        <div className="mt-6 flex rounded-full bg-slate-100 p-1 dark:bg-slate-800">
          <button
            type="button"
            className={`flex-1 rounded-full py-2 text-sm font-medium transition ${
              mode === 'signin'
                ? 'bg-white text-emerald-800 shadow dark:bg-slate-900 dark:text-emerald-300'
                : 'text-slate-600 dark:text-slate-400'
            }`}
            onClick={() => setMode('signin')}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`flex-1 rounded-full py-2 text-sm font-medium transition ${
              mode === 'signup'
                ? 'bg-white text-emerald-800 shadow dark:bg-slate-900 dark:text-emerald-300'
                : 'text-slate-600 dark:text-slate-400'
            }`}
            onClick={() => setMode('signup')}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error ? (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:bg-rose-950 dark:text-rose-200">
              {error}
            </p>
          ) : null}

          {mode === 'signup' ? (
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Your name
              <input
                className={field}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Ada Okonkwo"
                required
                autoComplete="name"
              />
            </label>
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
              placeholder="At least 6 characters"
              required
              minLength={6}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-emerald-600 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-700 disabled:opacity-60"
          >
            {submitting ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-500">
          Your data stays private to your account. No email confirmation required to sign in.
        </p>
      </div>
    </AuthLayout>
  )
}
