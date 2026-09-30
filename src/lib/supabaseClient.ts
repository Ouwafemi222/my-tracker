import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from './supabaseEnv'

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  const cfg = getSupabaseConfig()
  if (!cfg) return null
  if (!client) {
    client = createClient(cfg.url, cfg.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }
  return client
}

/** Returns the signed-in user id, or null if not authenticated. */
export async function getAuthenticatedUserId(): Promise<string | null> {
  const supabase = getSupabase()
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}
