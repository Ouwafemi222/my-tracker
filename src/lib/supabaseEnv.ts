function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value)
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}

/** Strip accidental surrounding quotes from Vercel/env copy-paste */
function cleanEnv(value: string | undefined): string {
  if (!value) return ''
  let v = value.trim()
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim()
  }
  return v
}

export function getSupabaseEnvRaw() {
  return {
    url: cleanEnv(import.meta.env.VITE_SUPABASE_URL),
    anonKey: cleanEnv(import.meta.env.VITE_SUPABASE_ANON_KEY),
  }
}

export function getSupabaseConfigIssue(): string | null {
  const { url, anonKey } = getSupabaseEnvRaw()
  if (!url && !anonKey) return null
  if (!url || !anonKey) {
    return 'Add both VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your host settings, then redeploy.'
  }
  if (!isValidHttpUrl(url)) {
    return 'VITE_SUPABASE_URL must be a full URL like https://YOUR_PROJECT.supabase.co (no quotes or spaces).'
  }
  if (anonKey.length < 20) {
    return 'VITE_SUPABASE_ANON_KEY looks invalid. Use the anon public key from Supabase → Project Settings → API.'
  }
  return null
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfigIssue() === null
}

export function getSupabaseConfig(): { url: string; anonKey: string } | null {
  if (!isSupabaseConfigured()) return null
  const { url, anonKey } = getSupabaseEnvRaw()
  return { url, anonKey }
}
