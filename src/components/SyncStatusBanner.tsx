import { isSupabaseConfigured } from '../lib/supabaseEnv'

export type CloudSyncState = 'off' | 'loading' | 'ready' | 'error'

export function SyncStatusBanner({
  state,
  error,
}: {
  state: CloudSyncState
  error: string | null
}) {
  if (!isSupabaseConfigured()) return null

  if (state === 'loading') {
    return (
      <p className="mb-4 rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-900 dark:bg-sky-950 dark:text-sky-100">
        Connecting to Supabase and loading your records…
      </p>
    )
  }

  if (state === 'error') {
    return (
      <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-900 dark:bg-rose-950 dark:text-rose-100">
        Cloud sync error: {error ?? 'Unknown error'}. Local data still works; check
        anonymous sign-in and database tables in Supabase.
      </p>
    )
  }

  if (state === 'ready') {
    return (
      <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
        Synced with Supabase (anonymous session). Data is also cached in this browser.
      </p>
    )
  }

  return null
}
