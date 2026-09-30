import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useTransactions } from './TransactionContext'
import type { Transaction, TransactionType } from '../types/transaction'
import { TRANSACTION_TYPE_LABELS } from '../types/transaction'
import { bankFromAccount } from '../utils/banks'
import { toLagosDateString } from '../utils/dates'

export interface LedgerFilter {
  search: string
  bankId: string
  type: TransactionType | 'all'
  from: string
  to: string
}

const emptyFilter: LedgerFilter = {
  search: '',
  bankId: 'all',
  type: 'all',
  from: '',
  to: '',
}

interface LedgerFilterValue {
  filter: LedgerFilter
  setFilter: (patch: Partial<LedgerFilter>) => void
  clearFilter: () => void
  active: boolean
  visibleTransactions: Transaction[]
}

const LedgerFilterContext = createContext<LedgerFilterValue | null>(null)

export function LedgerFilterProvider({ children }: { children: ReactNode }) {
  const { transactions } = useTransactions()
  const [filter, setFilterState] = useState<LedgerFilter>(emptyFilter)

  const visibleTransactions = useMemo(() => {
    const q = filter.search.trim().toLowerCase()
    return transactions.filter((t) => {
      if (filter.bankId !== 'all' && bankFromAccount(t.account)?.id !== filter.bankId) return false
      if (filter.type !== 'all' && t.type !== filter.type) return false
      const day = toLagosDateString(t.occurredAt)
      if (filter.from && day < filter.from) return false
      if (filter.to && day > filter.to) return false
      if (!q) return true
      const hay = [
        t.description,
        t.category,
        t.account,
        t.counterparty,
        TRANSACTION_TYPE_LABELS[t.type],
      ]
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [transactions, filter])

  const value = useMemo<LedgerFilterValue>(
    () => ({
      filter,
      setFilter: (patch) => setFilterState((current) => ({ ...current, ...patch })),
      clearFilter: () => setFilterState(emptyFilter),
      active: Boolean(
        filter.search || filter.bankId !== 'all' || filter.type !== 'all' || filter.from || filter.to,
      ),
      visibleTransactions,
    }),
    [filter, visibleTransactions],
  )

  return <LedgerFilterContext.Provider value={value}>{children}</LedgerFilterContext.Provider>
}

export function useLedgerFilter() {
  const ctx = useContext(LedgerFilterContext)
  if (!ctx) throw new Error('useLedgerFilter must be used within LedgerFilterProvider')
  return ctx
}
