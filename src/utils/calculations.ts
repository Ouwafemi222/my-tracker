import type { PeriodTotals, Transaction, TransactionType } from '../types/transaction'
import { isInLagosDateRange } from './dates'

export function filterTransactionsByLagosRange(
  transactions: Transaction[],
  startDate: string,
  endDate: string,
): Transaction[] {
  return transactions.filter((t) =>
    isInLagosDateRange(t.occurredAt, startDate, endDate),
  )
}

export function computePeriodTotals(transactions: Transaction[]): PeriodTotals {
  let earnedIncomeKobo = 0
  let otherReceivedKobo = 0
  let totalMoneyOutKobo = 0

  for (const t of transactions) {
    switch (t.type) {
      case 'earned_income':
        earnedIncomeKobo += t.amountKobo
        break
      case 'other_income':
        otherReceivedKobo += t.amountKobo
        break
      case 'expense':
        totalMoneyOutKobo += t.amountKobo
        break
      case 'internal_transfer':
        break
      default:
        break
    }
  }

  const totalMoneyInKobo = earnedIncomeKobo + otherReceivedKobo
  const netCashFlowKobo = totalMoneyInKobo - totalMoneyOutKobo

  return {
    earnedIncomeKobo,
    otherReceivedKobo,
    totalMoneyInKobo,
    totalMoneyOutKobo,
    netCashFlowKobo,
  }
}

export function totalsForLagosRange(
  all: Transaction[],
  startDate: string,
  endDate: string,
): PeriodTotals {
  const filtered = filterTransactionsByLagosRange(all, startDate, endDate)
  return computePeriodTotals(filtered)
}

export function isInflowType(type: TransactionType): boolean {
  return type === 'earned_income' || type === 'other_income'
}

export function spendingByCategory(
  transactions: Transaction[],
): { category: string; amountKobo: number }[] {
  const map = new Map<string, number>()
  for (const t of transactions) {
    if (t.type !== 'expense') continue
    map.set(t.category, (map.get(t.category) ?? 0) + t.amountKobo)
  }
  return [...map.entries()]
    .map(([category, amountKobo]) => ({ category, amountKobo }))
    .sort((a, b) => b.amountKobo - a.amountKobo)
}
