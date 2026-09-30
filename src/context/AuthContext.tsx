import type { Session, User } from '@supabase/supabase-js'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { getSupabase } from '../lib/supabaseClient'
import { getSupabaseConfigIssue } from '../lib/supabaseEnv'
import { ensureProfileForUser, fetchProfile, updateDisplayName } from '../services/profileService'
import type { UserProfile } from '../types/profile'

interface AuthContextValue {
  authRequired: boolean
  loading: boolean
  user: User | null
  session: Session | null
  profile: UserProfile | null
  signIn: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>
  signUp: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  saveDisplayName: (name: string) => Promise<{ ok: true } | { ok: false; error: string }>
}

const AuthContext = createContext<AuthContextValue | null>(null)
const AWAY_MS = 5 * 60 * 1000
const LEFT_AT_KEY = 'gratitude-left-at'

export function AuthProvider({ children }: { children: ReactNode }) {
  const authRequired = true
  const [loading, setLoading] = useState(authRequired)
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)

  const loadProfile = useCallback(async (u: User) => {
    try {
      const p = await ensureProfileForUser(u)
      setProfile(p)
    } catch {
      setProfile({
        id: u.id,
        email: u.email ?? null,
        display_name: u.email?.split('@')[0] ?? 'Member',
      })
    }
  }, [])

  useEffect(() => {
    const supabase = getSupabase()
    if (!supabase) {
      setLoading(false)
      return
    }

    let mounted = true
    ;(async () => {
      try {
        const { data } = await supabase.auth.getSession()
        if (!mounted) return
        setSession(data.session)
        setUser(data.session?.user ?? null)
        if (data.session?.user) await loadProfile(data.session.user)
      } catch (e) {
        console.error('Auth session error:', e)
      } finally {
        if (mounted) setLoading(false)
      }
    })()

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      if (nextSession?.user) {
        await loadProfile(nextSession.user)
      } else {
        setProfile(null)
      }
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [loadProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = getSupabase()
    if (!supabase) {
      return {
        ok: false as const,
        error:
          getSupabaseConfigIssue() ??
          'Cloud sign-in is not configured.',
      }
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { ok: false as const, error: error.message }
    if (data.user) await loadProfile(data.user)
    return { ok: true as const }
  }, [loadProfile])

  const signUp = useCallback(
    async (email: string, password: string, displayName: string) => {
      const supabase = getSupabase()
      if (!supabase) return { ok: false as const, error: 'Cloud sign-up is not configured.' }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName.trim() },
        },
      })
      if (error) return { ok: false as const, error: error.message }
      if (data.user) await loadProfile(data.user)
      return { ok: true as const }
    },
    [loadProfile],
  )

  const signOut = useCallback(async () => {
    const supabase = getSupabase()
    if (supabase) await supabase.auth.signOut()
    setSession(null)
    setUser(null)
    setProfile(null)
    sessionStorage.removeItem(LEFT_AT_KEY)
  }, [])

  useEffect(() => {
    if (!user) return

    let timer = 0

    const clearTimer = () => {
      if (timer) window.clearTimeout(timer)
      timer = 0
    }

    const signOutIfAwayTooLong = () => {
      const leftAt = Number(sessionStorage.getItem(LEFT_AT_KEY) || 0)
      if (leftAt && Date.now() - leftAt >= AWAY_MS) {
        sessionStorage.removeItem(LEFT_AT_KEY)
        void signOut()
        return true
      }
      return false
    }

    const markAway = () => {
      if (!sessionStorage.getItem(LEFT_AT_KEY)) {
        sessionStorage.setItem(LEFT_AT_KEY, String(Date.now()))
      }
      clearTimer()
      timer = window.setTimeout(() => {
        void signOut()
      }, AWAY_MS)
    }

    const markBack = () => {
      if (signOutIfAwayTooLong()) return
      sessionStorage.removeItem(LEFT_AT_KEY)
      clearTimer()
    }

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') markAway()
      else markBack()
    }

    if (document.visibilityState === 'hidden') markAway()
    else signOutIfAwayTooLong()

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', markAway)

    return () => {
      clearTimer()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', markAway)
    }
  }, [user, signOut])

  const refreshProfile = useCallback(async () => {
    if (!user) return
    const p = await fetchProfile(user.id)
    if (p) setProfile(p)
  }, [user])

  const saveDisplayName = useCallback(async (name: string) => {
    try {
      const updated = await updateDisplayName(name)
      setProfile(updated)
      return { ok: true as const }
    } catch (e) {
      return {
        ok: false as const,
        error: e instanceof Error ? e.message : 'Could not update profile',
      }
    }
  }, [])

  const value = useMemo(
    () => ({
      authRequired,
      loading,
      user,
      session,
      profile,
      signIn,
      signUp,
      signOut,
      refreshProfile,
      saveDisplayName,
    }),
    [
      authRequired,
      loading,
      user,
      session,
      profile,
      signIn,
      signUp,
      signOut,
      refreshProfile,
      saveDisplayName,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
