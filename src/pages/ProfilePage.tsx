import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProfilePage() {
  const navigate = useNavigate()
  const { user, profile, saveDisplayName, signOut } = useAuth()
  const [name, setName] = useState(profile?.display_name ?? '')

  useEffect(() => {
    if (profile?.display_name) setName(profile.display_name)
  }, [profile?.display_name])
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [saving, setSaving] = useState(false)

  const initial = profile?.display_name?.charAt(0).toUpperCase() ?? '?'

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    const result = await saveDisplayName(name)
    setSaving(false)
    if (!result.ok) {
      setMessage({ type: 'err', text: result.error })
      return
    }
    setMessage({ type: 'ok', text: 'Profile updated.' })
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Your profile
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Manage how you appear in Gratitude Expenses.
        </p>
      </div>

      <div className="glass-card flex items-center gap-4 rounded-2xl p-6 ring-1 ring-slate-200/80 dark:ring-slate-700">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-2xl font-bold text-white shadow-md">
          {initial}
        </div>
        <div>
          <p className="font-semibold text-slate-900 dark:text-white">
            {profile?.display_name ?? 'Member'}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400">{user?.email}</p>
        </div>
      </div>

      {message ? (
        <p
          className={`rounded-xl px-4 py-3 text-sm ${
            message.type === 'ok'
              ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100'
              : 'bg-rose-50 text-rose-900 dark:bg-rose-950 dark:text-rose-100'
          }`}
        >
          {message.text}
        </p>
      ) : null}

      <form
        onSubmit={handleSave}
        className="glass-card space-y-4 rounded-2xl p-6 ring-1 ring-slate-200/80 dark:ring-slate-700"
      >
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Display name
          <input
            className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-900"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Email
          <input
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
            value={user?.email ?? ''}
            readOnly
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save profile'}
        </button>
      </form>

      <button
        type="button"
        onClick={async () => {
          await signOut()
          navigate('/auth', { replace: true })
        }}
        className="w-full rounded-full border border-slate-300 py-2.5 text-sm font-medium text-slate-700 hover:bg-white dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        Sign out
      </button>
    </div>
  )
}
