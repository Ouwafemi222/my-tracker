import type { Transaction } from '../types/transaction'
import { TRANSACTION_TYPE_LABELS } from '../types/transaction'
import { formatLagosDateTime, toLagosDateString } from './dates'
import { nairaInputFromKobo } from './money'

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

export function transactionsToCsv(transactions: Transaction[]): string {
  const header = [
    'Lagos date',
    'Date time (Lagos)',
    'Type',
    'Amount (NGN)',
    'Category',
    'Account',
    'Sender or recipient',
    'Description',
  ]
  const rows = transactions.map((t) =>
    [
      toLagosDateString(t.occurredAt),
      formatLagosDateTime(t.occurredAt),
      TRANSACTION_TYPE_LABELS[t.type],
      nairaInputFromKobo(t.amountKobo),
      t.category,
      t.account,
      t.counterparty,
      t.description,
    ].map(escapeCsv),
  )
  return [header.join(','), ...rows.map((r) => r.join(','))].join('\n')
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
