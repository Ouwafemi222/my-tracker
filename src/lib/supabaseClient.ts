import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from './supabaseEnv'

let client: SupabaseClient | null = null
let initFailed = false

export function getSupabase(): SupabaseClient | null {
  if (initFailed) return null
  const cfg = getSupabaseConfig()
  if (!cfg?.url || !cfg.anonKey) return null
  if (!client) {
    try {
      client = createClient(cfg.url, cfg.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    } catch (e) {
      console.error('Supabase client init failed:', e)
      initFailed = true
      return null
    }
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
