import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  generateImportToken,
  getImportApiUrl,
  revokeImportToken,
} from '../services/profileService'
import { getSupabaseEnvRaw } from '../lib/supabaseEnv'

export function ChatGptImportSection() {
  const { profile, refreshProfile } = useAuth()
  const [revealedToken, setRevealedToken] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  const apiUrl = getImportApiUrl()
  const hasToken = Boolean(profile?.import_token)
  const { anonKey } = getSupabaseEnvRaw()

  async function createKey() {
    setBusy(true)
    setNote(null)
    try {
      const token = await generateImportToken()
      setRevealedToken(token)
      await refreshProfile()
      setNote('Copy this key now. You can regenerate it anytime in Settings.')
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Could not create key')
    } finally {
      setBusy(false)
    }
  }

  async function revokeKey() {
    if (!window.confirm('Revoke your ChatGPT upload key? Automations will stop until you create a new one.')) {
      return
    }
    setBusy(true)
    try {
      await revokeImportToken()
      setRevealedToken(null)
      await refreshProfile()
      setNote('Upload key revoked.')
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Could not revoke key')
    } finally {
      setBusy(false)
    }
  }

  function copy(text: string) {
    void navigator.clipboard.writeText(text)
    setNote('Copied to clipboard.')
  }

  return (
    <section className="glass-card space-y-4 rounded-2xl p-6 ring-1 ring-indigo-200/80 dark:ring-indigo-900">
      <div>
        <h3 className="font-semibold text-slate-900 dark:text-white">ChatGPT auto-upload</h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Let your Custom GPT send parsed email expenses directly into this account. Setup guide:{' '}
          <code className="rounded bg-slate-100 px-1 text-xs dark:bg-slate-800">docs/CHATGPT_SETUP.md</code>{' '}
          in the GitHub repo.
        </p>
      </div>

      {note ? <p className="text-sm text-emerald-800 dark:text-emerald-300">{note}</p> : null}

      {apiUrl ? (
        <div className="rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-900">
          <p className="font-medium text-slate-700 dark:text-slate-300">API endpoint</p>
          <p className="mt-1 break-all font-mono text-slate-600 dark:text-slate-400">{apiUrl}</p>
        </div>
      ) : (
        <p className="text-sm text-amber-800 dark:text-amber-200">
          Set a valid VITE_SUPABASE_URL on your host to show the API endpoint.
        </p>
      )}

      {revealedToken ? (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-800 dark:bg-indigo-950/40">
          <p className="text-xs font-semibold uppercase text-indigo-800 dark:text-indigo-300">
            Your upload key (shown once)
          </p>
          <p className="mt-2 break-all font-mono text-sm text-indigo-950 dark:text-indigo-100">
            {revealedToken}
          </p>
          <button
            type="button"
            onClick={() => copy(revealedToken)}
            className="mt-3 rounded-full bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white"
          >
            Copy upload key
          </button>
        </div>
      ) : hasToken ? (
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Upload key is active. Regenerate if you need a new copy for ChatGPT.
        </p>
      ) : null}

      {anonKey ? (
        <p className="text-xs text-slate-500">
          ChatGPT Action also needs header{' '}
          <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">Authorization: Bearer &lt;anon key&gt;</code>{' '}
          (Supabase → API → anon public).
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={createKey}
          className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {hasToken ? 'Regenerate upload key' : 'Create upload key'}
        </button>
        {hasToken ? (
          <button
            type="button"
            disabled={busy}
            onClick={revokeKey}
            className="rounded-full border border-slate-300 px-5 py-2 text-sm font-medium dark:border-slate-600"
          >
            Revoke key
          </button>
        ) : null}
      </div>
    </section>
  )
}
