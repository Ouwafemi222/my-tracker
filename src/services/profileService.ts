import type { User } from '@supabase/supabase-js'
import type { UserProfile } from '../types/profile'
import { getAuthenticatedUserId, getSupabase } from '../lib/supabaseClient'

export async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const supabase = getSupabase()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, display_name, created_at, updated_at')
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
