import type { Transaction } from '../types/transaction'
import { V1_STORAGE_KEY } from './keys'

export interface StoredDataV1 {
  version: 1
  transactions: Transaction[]
}

export function loadTransactionsV1(): Transaction[] {
  try {
    const raw = localStorage.getItem(V1_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as StoredDataV1
    if (parsed?.version !== 1 || !Array.isArray(parsed.transactions)) return []
    return parsed.transactions
  } catch {
    return []
  }
}

export function saveTransactionsV1(transactions: Transaction[]): void {
  const payload: StoredDataV1 = { version: 1, transactions }
  localStorage.setItem(V1_STORAGE_KEY, JSON.stringify(payload))
}

export interface BackupPayloadV1 {
  app: 'Gratitude Expenses Tracking'
  exportVersion: 1
  exportedAt: string
  transactions: Transaction[]
}

export function exportBackupJsonV1(transactions: Transaction[]): string {
  const payload: BackupPayloadV1 = {
    app: 'Gratitude Expenses Tracking',
    exportVersion: 1,
    exportedAt: new Date().toISOString(),
    transactions,
  }
  return JSON.stringify(payload, null, 2)
}

export function parseBackupV1(json: string): Transaction[] | { error: string } {
  try {
    const data = JSON.parse(json) as BackupPayloadV1
    if (data?.exportVersion !== 1 || !Array.isArray(data.transactions)) {
      return { error: 'Invalid backup format. Expected Version 1 export.' }
    }
    for (const t of data.transactions) {
      if (
        !t.id ||
        !t.type ||
        typeof t.amountKobo !== 'number' ||
        t.amountKobo <= 0 ||
        !t.occurredAt
      ) {
        return { error: 'Backup contains invalid transaction records.' }
      }
    }
    return data.transactions
  } catch {
    return { error: 'Could not parse JSON file.' }
  }
}
