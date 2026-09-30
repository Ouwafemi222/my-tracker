import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

const KEY = 'gratitude-bank-balances'

export interface MailedBalance {
  amountKobo: number
  at: string
}

export type BankBalanceMap = Record<string, MailedBalance>

function readBalances(): BankBalanceMap {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}') as Record<string, MailedBalance | number>
    if (!raw || typeof raw !== 'object') return {}
    const next: BankBalanceMap = {}
    for (const [bankId, value] of Object.entries(raw)) {
      if (typeof value === 'number') next[bankId] = { amountKobo: value, at: '' }
      else if (value && typeof value.amountKobo === 'number') next[bankId] = value
    }
    return next
  } catch {
    return {}
  }
}

interface BankBalanceValue {
  balances: BankBalanceMap
  setMailedBalance: (bankId: string, amountKobo: number, at: string) => void
}

const BankBalanceContext = createContext<BankBalanceValue | null>(null)

export function BankBalanceProvider({ children }: { children: ReactNode }) {
  const [balances, setBalances] = useState<BankBalanceMap>(readBalances)

  const setMailedBalance = useCallback((bankId: string, amountKobo: number, at: string) => {
    setBalances((current) => {
      const previous = current[bankId]
      if (previous?.at && previous.at > at) return current
      const next = { ...current, [bankId]: { amountKobo, at } }
      localStorage.setItem(KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const value = useMemo(() => ({ balances, setMailedBalance }), [balances, setMailedBalance])

  return <BankBalanceContext.Provider value={value}>{children}</BankBalanceContext.Provider>
}

export function useBankBalances() {
  const ctx = useContext(BankBalanceContext)
  if (!ctx) throw new Error('useBankBalances must be used within BankBalanceProvider')
  return ctx
}
