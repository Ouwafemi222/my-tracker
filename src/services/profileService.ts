import type { User } from '@supabase/supabase-js'
import type { UserProfile } from '../types/profile'
import { getAuthenticatedUserId, getSupabase } from '../lib/supabaseClient'

export async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const supabase = getSupabase()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, display_name, import_token, created_at, updated_at')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as UserProfile | null
}

export async function ensureProfileForUser(user: User): Promise<UserProfile> {
  const existing = await fetchProfile(user.id)
  if (existing) return existing

  const supabase = getSupabase()
  if (!supabase) {
    return {
      id: user.id,
      email: user.email ?? null,
      display_name:
        (user.user_metadata?.display_name as string | undefined) ??
        user.email?.split('@')[0] ??
        'Member',
    }
  }

  const row = {
    id: user.id,
    email: user.email ?? null,
    display_name:
      (user.user_metadata?.display_name as string | undefined) ??
      user.email?.split('@')[0] ??
      'Member',
  }

  const { data, error } = await supabase.from('profiles').upsert(row).select().single()
  if (error) throw new Error(error.message)
  return data as UserProfile
}

export async function updateDisplayName(displayName: string): Promise<UserProfile> {
  const supabase = getSupabase()
  const userId = await getAuthenticatedUserId()
  if (!supabase || !userId) throw new Error('Not signed in')

  const trimmed = displayName.trim()
  if (!trimmed) throw new Error('Name cannot be empty')

  const { data, error } = await supabase
    .from('profiles')
    .update({ display_name: trimmed })
    .eq('id', userId)
    .select()
    .single()

  if (error) throw new Error(error.message)

  await supabase.auth.updateUser({
    data: { display_name: trimmed },
  })

  return data as UserProfile
}

function randomImportToken(): string {
  const part = () => crypto.randomUUID().replace(/-/g, '')
  return `get_${part()}${part()}`
}

export async function generateImportToken(): Promise<string> {
  const supabase = getSupabase()
  const userId = await getAuthenticatedUserId()
  if (!supabase || !userId) throw new Error('Not signed in')

  const token = randomImportToken()
  const { error } = await supabase
    .from('profiles')
    .update({ import_token: token })
    .eq('id', userId)

  if (error) throw new Error(error.message)
  return token
}

export async function revokeImportToken(): Promise<void> {
  const supabase = getSupabase()
  const userId = await getAuthenticatedUserId()
  if (!supabase || !userId) throw new Error('Not signed in')

  const { error } = await supabase
    .from('profiles')
    .update({ import_token: null })
    .eq('id', userId)

  if (error) throw new Error(error.message)
}

export function getImportApiUrl(): string | null {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim()
  if (!url || !url.startsWith('https://')) return null
  return `${url.replace(/\/$/, '')}/functions/v1/import-expenses`
}
