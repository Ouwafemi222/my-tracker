export type TransactionType =
  | 'earned_income'
  | 'other_income'
  | 'expense'
  | 'internal_transfer'

export interface Transaction {
  id: string
  type: TransactionType
  /** Positive amount in kobo (1 ₦ = 100 kobo) */
  amountKobo: number
  /** ISO 8601 date-time */
  occurredAt: string
  category: string
  account: string
  counterparty: string
  description: string
}

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  earned_income: 'Earned income',
  other_income: 'Other money received',
  expense: 'Expense',
  internal_transfer: 'Internal transfer',
}

export interface PeriodTotals {
  earnedIncomeKobo: number
  otherReceivedKobo: number
  totalMoneyInKobo: number
  totalMoneyOutKobo: number
  netCashFlowKobo: number
}
