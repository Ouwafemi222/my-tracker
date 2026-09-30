export function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim()
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
  return Boolean(url && key)
}

export function getSupabaseConfig(): { url: string; anonKey: string } | null {
  if (!isSupabaseConfigured()) return null
  return {
    url: import.meta.env.VITE_SUPABASE_URL!.trim(),
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY!.trim(),
  }
}
