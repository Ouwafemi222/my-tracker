export function StorageNotice() {
  return (
    <div
      className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100"
      role="status"
    >
      <strong className="font-semibold">Storage:</strong> Version 2 keeps a local cache (
      <code className="rounded bg-white/60 px-1 dark:bg-black/20">gratitude-expenses-v2</code>
      ). When Supabase is configured, records also sync to your cloud database using a
      private anonymous session. Export JSON backups before clearing browser data.
    </div>
  )
}
