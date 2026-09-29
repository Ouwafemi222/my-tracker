import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Transaction } from '../types/transaction'
import { createDemoTransactions } from '../demo/demoData'
import {
  exportBackupJsonV1,
  loadTransactionsV1,
  parseBackupV1,
  saveTransactionsV1,
} from '../storage/persistence'

interface TransactionContextValue {
  transactions: Transaction[]
  addTransaction: (t: Omit<Transaction, 'id'>) => void
  updateTransaction: (t: Transaction) => void
  deleteTransaction: (id: string) => void
  loadDemoData: () => void
  clearAll: () => void
  exportBackup: () => string
  importBackup: (json: string) => { ok: true } | { ok: false; error: string }
}

const TransactionContext = createContext<TransactionContextValue | null>(null)

export function TransactionProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    loadTransactionsV1(),
  )

  const persist = useCallback((next: Transaction[]) => {
    setTransactions(next)
    saveTransactionsV1(next)
  }, [])

  const addTransaction = useCallback(
    (t: Omit<Transaction, 'id'>) => {
      const next = [...transactions, { ...t, id: crypto.randomUUID() }]
      persist(next)
    },
    [transactions, persist],
  )

  const updateTransaction = useCallback(
    (t: Transaction) => {
      persist(transactions.map((x) => (x.id === t.id ? t : x)))
    },
    [transactions, persist],
  )

  const deleteTransaction = useCallback(
    (id: string) => {
      persist(transactions.filter((x) => x.id !== id))
    },
    [transactions, persist],
  )

  const loadDemoData = useCallback(() => {
    persist(createDemoTransactions())
  }, [persist])

  const clearAll = useCallback(() => {
    persist([])
  }, [persist])

  const exportBackup = useCallback(
    () => exportBackupJsonV1(transactions),
    [transactions],
  )

  const importBackup = useCallback(
    (json: string) => {
      const result = parseBackupV1(json)
      if ('error' in result) return { ok: false as const, error: result.error }
      persist(result)
      return { ok: true as const }
    },
    [persist],
  )

  const value = useMemo(
    () => ({
      transactions,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      loadDemoData,
      clearAll,
      exportBackup,
      importBackup,
    }),
    [
      transactions,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      loadDemoData,
      clearAll,
      exportBackup,
      importBackup,
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
