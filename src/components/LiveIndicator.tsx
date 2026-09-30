import type { CloudSyncState } from './SyncStatusBanner'

export function LiveIndicator({
  state,
  error,
}: {
  state: CloudSyncState
  error: string | null
}) {
  if (state === 'loading') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-800 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200">
        <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-sky-500" />
        Syncing…
      </span>
    )
  }

  if (state === 'error') {
    return (
      <span
        className="inline-flex max-w-[12rem] items-center gap-1.5 truncate rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"
        title={error ?? 'Could not sync'}
      >
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
        Offline
      </span>
    )
  }

  if (state === 'ready') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
        </span>
        Live
      </span>
    )
  }

  return null
}
