import type { Transaction } from '../types/transaction'
import { todayLagosDateString } from '../utils/dates'

export function createDemoTransactions(): Transaction[] {
  const day = todayLagosDateString()
  const at = (hours: number, minutes: number) =>
    new Date(`${day}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00+01:00`).toISOString()

  return [
    {
      id: crypto.randomUUID(),
      type: 'earned_income',
      amountKobo: 5_000_000,
      occurredAt: at(9, 0),
      category: 'Salary',
      account: 'GTBank',
      counterparty: 'Employer Ltd',
      description: 'Monthly salary (demo)',
    },
    {
      id: crypto.randomUUID(),
      type: 'other_income',
      amountKobo: 500_000,
      occurredAt: at(10, 30),
      category: 'Gift',
      account: 'Cash',
      counterparty: 'Friend',
      description: 'Birthday gift (demo)',
    },
    {
      id: crypto.randomUUID(),
      type: 'expense',
      amountKobo: 1_200_000,
      occurredAt: at(14, 0),
      category: 'Food & groceries',
      account: 'Opay',
      counterparty: 'Supermarket',
      description: 'Weekly shopping (demo)',
    },
    {
      id: crypto.randomUUID(),
      type: 'internal_transfer',
      amountKobo: 2_000_000,
      occurredAt: at(16, 0),
      category: 'Between my accounts',
      account: 'GTBank',
      counterparty: 'Kuda savings',
      description: 'Move to savings (demo — not income or spending)',
    },
  ]
}
