import type { Transaction } from '../types/transaction'
import { V1_STORAGE_KEY, V2_STORAGE_KEY } from './keys'

export interface StoredDataV1 {
  version: 1
  transactions: Transaction[]
}

export interface AppSettings {
  /** Monthly expense budget in kobo (Lagos calendar month) */
  monthlyBudgetKobo: number
  theme: 'light' | 'dark'
}

export interface StoredDataV2 {
  version: 2
  transactions: Transaction[]
  settings: AppSettings
}

const DEFAULT_SETTINGS: AppSettings = {
  monthlyBudgetKobo: 0,
  theme: 'light',
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

function v2StorageKey(userId?: string | null): string {
  return userId ? `${V2_STORAGE_KEY}:${userId}` : V2_STORAGE_KEY
}

export function loadStoredV2(userId?: string | null): StoredDataV2 {
  try {
    const raw = localStorage.getItem(v2StorageKey(userId))
    if (!raw) {
      return { version: 2, transactions: [], settings: { ...DEFAULT_SETTINGS } }
    }
    const parsed = JSON.parse(raw) as StoredDataV2
    if (parsed?.version !== 2 || !Array.isArray(parsed.transactions)) {
      return { version: 2, transactions: [], settings: { ...DEFAULT_SETTINGS } }
    }
    return {
      version: 2,
      transactions: parsed.transactions,
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
    }
  } catch {
    return { version: 2, transactions: [], settings: { ...DEFAULT_SETTINGS } }
  }
}

export function saveStoredV2(
  data: Omit<StoredDataV2, 'version'>,
  userId?: string | null,
): void {
  const payload: StoredDataV2 = { version: 2, ...data }
  localStorage.setItem(v2StorageKey(userId), JSON.stringify(payload))
}

export interface BackupPayloadV1 {
  app: 'Gratitude Expenses Tracking'
  exportVersion: 1
  exportedAt: string
  transactions: Transaction[]
}

export interface BackupPayloadV2 {
  app: 'Gratitude Expenses Tracking'
  exportVersion: 2
  exportedAt: string
  transactions: Transaction[]
  settings: AppSettings
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

export function exportBackupJsonV2(
  transactions: Transaction[],
  settings: AppSettings,
): string {
  const payload: BackupPayloadV2 = {
    app: 'Gratitude Expenses Tracking',
    exportVersion: 2,
    exportedAt: new Date().toISOString(),
    transactions,
    settings,
  }
  return JSON.stringify(payload, null, 2)
}

function validateTransactions(transactions: unknown): transactions is Transaction[] {
  if (!Array.isArray(transactions)) return false
  for (const t of transactions) {
    if (
      !t ||
      typeof t !== 'object' ||
      !('id' in t) ||
      !('type' in t) ||
      typeof (t as Transaction).amountKobo !== 'number' ||
      (t as Transaction).amountKobo <= 0 ||
      !('occurredAt' in t)
    ) {
      return false
    }
  }
  return true
}

export function parseBackupV1(json: string): Transaction[] | { error: string } {
  try {
    const data = JSON.parse(json) as BackupPayloadV1
    if (data?.exportVersion !== 1 || !validateTransactions(data.transactions)) {
      return { error: 'Invalid backup format. Expected Version 1 export.' }
    }
    return data.transactions
  } catch {
    return { error: 'Could not parse JSON file.' }
  }
}

export function parseBackupV2(
  json: string,
): { transactions: Transaction[]; settings: AppSettings } | { error: string } {
  try {
    const data = JSON.parse(json) as BackupPayloadV2
    if (data?.exportVersion !== 2 || !validateTransactions(data.transactions)) {
      return { error: 'Invalid backup format. Expected Version 2 export.' }
    }
    return {
      transactions: data.transactions,
      settings: { ...DEFAULT_SETTINGS, ...data.settings },
    }
  } catch {
    return { error: 'Could not parse JSON file.' }
  }
}

/** Accept deliberate Version 1 backup import into Version 2 storage */
export function parseV1ImportForV2(
  json: string,
): Transaction[] | { error: string } {
  return parseBackupV1(json)
}
