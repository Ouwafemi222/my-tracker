import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Transaction } from '../types/transaction'
import { createDemoTransactions } from '../demo/demoData'
import { useAuth } from './AuthContext'
import { isSupabaseConfigured } from '../lib/supabaseEnv'
import type { AppSettings } from '../storage/persistence'
import {
  exportBackupJsonV2,
  loadStoredV2,
  parseBackupV2,
  parseV1ImportForV2,
  saveStoredV2,
} from '../storage/persistence'
import {
  deleteSupabaseTransaction,
  fetchSupabaseState,
  syncSupabaseState,
  upsertSupabaseSettings,
  upsertSupabaseTransaction,
} from '../services/supabaseData'
import type { CloudSyncState } from '../components/SyncStatusBanner'

interface TransactionContextValue {
  transactions: Transaction[]
  settings: AppSettings
  cloudSyncState: CloudSyncState
  cloudSyncError: string | null
  setMonthlyBudgetKobo: (kobo: number) => void
  setTheme: (theme: AppSettings['theme']) => void
  addTransaction: (t: Omit<Transaction, 'id'>) => void
  updateTransaction: (t: Transaction) => void
  deleteTransaction: (id: string) => void
  loadDemoData: () => void
  clearAll: () => void
  exportBackup: () => string
  importBackupV2: (json: string) => { ok: true } | { ok: false; error: string }
  importBackupV1: (json: string) => { ok: true } | { ok: false; error: string }
}

const TransactionContext = createContext<TransactionContextValue | null>(null)

const emptySettings: AppSettings = { monthlyBudgetKobo: 0, theme: 'light' }

export function TransactionProvider({ children }: { children: ReactNode }) {
  const { authRequired, loading: authLoading, user } = useAuth()
  const userId = user?.id ?? null

  const [stored, setStored] = useState(() => ({
    version: 2 as const,
    transactions: [] as Transaction[],
    settings: { ...emptySettings },
  }))
  const storedRef = useRef(stored)
  storedRef.current = stored

  const [cloudSyncState, setCloudSyncState] = useState<CloudSyncState>(() => {
    if (!isSupabaseConfigured()) return 'off'
    if (authRequired) return 'loading'
    return 'loading'
  })
  const [cloudSyncError, setCloudSyncError] = useState<string | null>(null)
  const cloudReadyRef = useRef(false)

  const reportCloudError = useCallback((e: unknown) => {
    setCloudSyncError(e instanceof Error ? e.message : 'Sync failed')
    setCloudSyncState('error')
  }, [])

  const persistLocal = useCallback(
    (transactions: Transaction[], settings: AppSettings) => {
      const next = { transactions, settings }
      setStored({ version: 2, ...next })
      saveStoredV2(next, userId)
    },
    [userId],
  )

  const pushCloudFull = useCallback(
    async (transactions: Transaction[], settings: AppSettings) => {
      if (!isSupabaseConfigured() || !cloudReadyRef.current) return
      await syncSupabaseState(transactions, settings)
      setCloudSyncError(null)
      setCloudSyncState('ready')
    },
    [],
  )

  useEffect(() => {
    const root = document.documentElement
    if (stored.settings.theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [stored.settings.theme])

  useEffect(() => {
    if (authRequired && authLoading) return
    if (authRequired && !userId) {
      cloudReadyRef.current = false
      setStored({ version: 2, transactions: [], settings: { ...emptySettings } })
      setCloudSyncState('loading')
      return
    }

    let cancelled = false

    ;(async () => {
      try {
        setCloudSyncState(isSupabaseConfigured() ? 'loading' : 'off')
        cloudReadyRef.current = false

        const local = loadStoredV2(userId)

        if (!isSupabaseConfigured()) {
          if (!cancelled) {
            setStored({ version: 2, transactions: local.transactions, settings: local.settings })
            cloudReadyRef.current = true
            setCloudSyncState('off')
          }
          return
        }

        const remote = await fetchSupabaseState()
        if (cancelled) return

        if (!remote) {
          persistLocal(local.transactions, local.settings)
          cloudReadyRef.current = false
          setCloudSyncState('error')
          return
        }

        const useRemote =
          remote.transactions.length > 0 ||
          remote.settings.monthlyBudgetKobo > 0 ||
          remote.settings.theme === 'dark'

        if (useRemote) {
          persistLocal(remote.transactions, remote.settings)
        } else if (local.transactions.length > 0 || local.settings.monthlyBudgetKobo > 0) {
          await syncSupabaseState(local.transactions, local.settings)
          persistLocal(local.transactions, local.settings)
        } else {
          persistLocal([], local.settings)
        }

        cloudReadyRef.current = true
        setCloudSyncError(null)
        setCloudSyncState('ready')
      } catch (e) {
        if (!cancelled) {
          cloudReadyRef.current = false
          reportCloudError(e)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [authRequired, authLoading, userId, persistLocal, reportCloudError])

  const addTransaction = useCallback(
    (t: Omit<Transaction, 'id'>) => {
      const created = { ...t, id: crypto.randomUUID() }
      const transactions = [...storedRef.current.transactions, created]
      persistLocal(transactions, storedRef.current.settings)
      if (isSupabaseConfigured() && cloudReadyRef.current) {
        void upsertSupabaseTransaction(created).catch(reportCloudError)
      }
    },
    [persistLocal, reportCloudError],
  )

  const updateTransaction = useCallback(
    (t: Transaction) => {
      const transactions = storedRef.current.transactions.map((x) => (x.id === t.id ? t : x))
      persistLocal(transactions, storedRef.current.settings)
      if (isSupabaseConfigured() && cloudReadyRef.current) {
        void upsertSupabaseTransaction(t).catch(reportCloudError)
      }
    },
    [persistLocal, reportCloudError],
  )

  const deleteTransaction = useCallback(
    (id: string) => {
      const transactions = storedRef.current.transactions.filter((x) => x.id !== id)
      persistLocal(transactions, storedRef.current.settings)
      if (isSupabaseConfigured() && cloudReadyRef.current) {
        void deleteSupabaseTransaction(id).catch(reportCloudError)
      }
    },
    [persistLocal, reportCloudError],
  )

  const loadDemoData = useCallback(() => {
    const transactions = createDemoTransactions()
    persistLocal(transactions, storedRef.current.settings)
    void pushCloudFull(transactions, storedRef.current.settings).catch(reportCloudError)
  }, [persistLocal, pushCloudFull, reportCloudError])

  const clearAll = useCallback(() => {
    persistLocal([], storedRef.current.settings)
    void pushCloudFull([], storedRef.current.settings).catch(reportCloudError)
  }, [persistLocal, pushCloudFull, reportCloudError])

  const setMonthlyBudgetKobo = useCallback(
    (monthlyBudgetKobo: number) => {
      const settings = { ...storedRef.current.settings, monthlyBudgetKobo }
      persistLocal(storedRef.current.transactions, settings)
      if (isSupabaseConfigured() && cloudReadyRef.current) {
        void upsertSupabaseSettings(settings).catch(reportCloudError)
      }
    },
    [persistLocal, reportCloudError],
  )

  const setTheme = useCallback(
    (theme: AppSettings['theme']) => {
      const settings = { ...storedRef.current.settings, theme }
      persistLocal(storedRef.current.transactions, settings)
      if (isSupabaseConfigured() && cloudReadyRef.current) {
        void upsertSupabaseSettings(settings).catch(reportCloudError)
      }
    },
    [persistLocal, reportCloudError],
  )

  const exportBackup = useCallback(
    () => exportBackupJsonV2(storedRef.current.transactions, storedRef.current.settings),
    [],
  )

  const importBackupV2 = useCallback(
    (json: string) => {
      const result = parseBackupV2(json)
      if ('error' in result) return { ok: false as const, error: result.error }
      persistLocal(result.transactions, result.settings)
      void pushCloudFull(result.transactions, result.settings).catch(reportCloudError)
      return { ok: true as const }
    },
    [persistLocal, pushCloudFull, reportCloudError],
  )

  const importBackupV1 = useCallback(
    (json: string) => {
      const result = parseV1ImportForV2(json)
      if ('error' in result) return { ok: false as const, error: result.error }
      persistLocal(result, storedRef.current.settings)
      void pushCloudFull(result, storedRef.current.settings).catch(reportCloudError)
      return { ok: true as const }
    },
    [persistLocal, pushCloudFull, reportCloudError],
  )

  const value = useMemo(
    () => ({
      transactions: stored.transactions,
      settings: stored.settings,
      cloudSyncState,
      cloudSyncError,
      setMonthlyBudgetKobo,
      setTheme,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      loadDemoData,
      clearAll,
      exportBackup,
      importBackupV2,
      importBackupV1,
    }),
    [
      stored,
      cloudSyncState,
      cloudSyncError,
      setMonthlyBudgetKobo,
      setTheme,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      loadDemoData,
      clearAll,
      exportBackup,
      importBackupV2,
      importBackupV1,
    ],
  )

  return (
    <TransactionContext.Provider value={value}>
      {children}
    </TransactionContext.Provider>
  )
}

export function useTransactions() {
  const ctx = useContext(TransactionContext)
  if (!ctx) throw new Error('useTransactions must be used within TransactionProvider')
  return ctx
}
