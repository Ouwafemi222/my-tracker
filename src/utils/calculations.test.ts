import { describe, expect, it } from 'vitest'
import type { Transaction } from '../types/transaction'
import { computePeriodTotals } from './calculations'

function tx(
  partial: Pick<Transaction, 'type' | 'amountKobo'> & Partial<Transaction>,
): Transaction {
  return {
    id: '1',
    occurredAt: '2026-01-15T12:00:00.000Z',
    category: 'Test',
    account: 'Cash',
    counterparty: '',
    description: '',
    ...partial,
  }
}

describe('computePeriodTotals', () => {
  it('computes verification scenario: 50k earned + 5k other - 12k expense = 55k in, 43k net', () => {
    const transactions = [
      tx({ type: 'earned_income', amountKobo: 5_000_000 }),
      tx({ type: 'other_income', amountKobo: 500_000 }),
      tx({ type: 'expense', amountKobo: 1_200_000 }),
    ]
    const totals = computePeriodTotals(transactions)
    expect(totals.totalMoneyInKobo).toBe(5_500_000)
    expect(totals.earnedIncomeKobo).toBe(5_000_000)
    expect(totals.otherReceivedKobo).toBe(500_000)
    expect(totals.totalMoneyOutKobo).toBe(1_200_000)
    expect(totals.netCashFlowKobo).toBe(4_300_000)
  })

  it('excludes internal transfers from inflows and outflows', () => {
    const transactions = [
      tx({ type: 'earned_income', amountKobo: 5_000_000 }),
      tx({ type: 'other_income', amountKobo: 500_000 }),
      tx({ type: 'expense', amountKobo: 1_200_000 }),
      tx({ type: 'internal_transfer', amountKobo: 2_000_000 }),
    ]
    const totals = computePeriodTotals(transactions)
    expect(totals.totalMoneyInKobo).toBe(5_500_000)
    expect(totals.totalMoneyOutKobo).toBe(1_200_000)
    expect(totals.netCashFlowKobo).toBe(4_300_000)
  })

  it('does not double-count earned income in total money in', () => {
    const transactions = [tx({ type: 'earned_income', amountKobo: 100_000 })]
    const totals = computePeriodTotals(transactions)
    expect(totals.totalMoneyInKobo).toBe(totals.earnedIncomeKobo)
  })
})
