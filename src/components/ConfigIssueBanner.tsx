import { getSupabaseConfigIssue } from '../lib/supabaseEnv'

export function ConfigIssueBanner() {
  const issue = getSupabaseConfigIssue()
  if (!issue) return null

  return (
    <div
      className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-center text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100"
      role="alert"
    >
      <strong>Configuration:</strong> {issue}
    </div>
  )
}
