import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Transaction } from '../types/transaction'
import { createDemoTransactions } from '../demo/demoData'
import type { AppSettings } from '../storage/persistence'
import {
  exportBackupJsonV2,
  loadStoredV2,
  parseBackupV2,
  parseV1ImportForV2,
  saveStoredV2,
} from '../storage/persistence'

interface TransactionContextValue {
  transactions: Transaction[]
  settings: AppSettings
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

export function TransactionProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState(() => loadStoredV2())

  useEffect(() => {
    const root = document.documentElement
    if (stored.settings.theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [stored.settings.theme])

  const persist = useCallback(
    (transactions: Transaction[], settings: AppSettings = stored.settings) => {
      const next = { transactions, settings }
      setStored({ version: 2, ...next })
      saveStoredV2(next)
    },
    [stored.settings],
  )

  const addTransaction = useCallback(
    (t: Omit<Transaction, 'id'>) => {
      persist([...stored.transactions, { ...t, id: crypto.randomUUID() }])
    },
    [stored.transactions, persist],
  )

  const updateTransaction = useCallback(
    (t: Transaction) => {
      persist(stored.transactions.map((x) => (x.id === t.id ? t : x)))
    },
    [stored.transactions, persist],
  )

  const deleteTransaction = useCallback(
    (id: string) => {
      persist(stored.transactions.filter((x) => x.id !== id))
    },
    [stored.transactions, persist],
  )

  const loadDemoData = useCallback(() => {
    persist(createDemoTransactions())
  }, [persist])

  const clearAll = useCallback(() => {
    persist([])
  }, [persist])

  const setMonthlyBudgetKobo = useCallback(
    (monthlyBudgetKobo: number) => {
      persist(stored.transactions, { ...stored.settings, monthlyBudgetKobo })
    },
    [stored.transactions, stored.settings, persist],
  )

  const setTheme = useCallback(
    (theme: AppSettings['theme']) => {
      persist(stored.transactions, { ...stored.settings, theme })
    },
    [stored.transactions, stored.settings, persist],
  )

  const exportBackup = useCallback(
    () => exportBackupJsonV2(stored.transactions, stored.settings),
    [stored.transactions, stored.settings],
  )

  const importBackupV2 = useCallback(
    (json: string) => {
      const result = parseBackupV2(json)
      if ('error' in result) return { ok: false as const, error: result.error }
      persist(result.transactions, result.settings)
      return { ok: true as const }
    },
    [persist],
  )

  const importBackupV1 = useCallback(
    (json: string) => {
      const result = parseV1ImportForV2(json)
      if ('error' in result) return { ok: false as const, error: result.error }
      persist(result, stored.settings)
      return { ok: true as const }
    },
    [persist, stored.settings],
  )

  const value = useMemo(
    () => ({
      transactions: stored.transactions,
      settings: stored.settings,
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
