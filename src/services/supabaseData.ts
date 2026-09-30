import type { Transaction, TransactionType } from '../types/transaction'
import type { AppSettings } from '../storage/persistence'
import { getAuthenticatedUserId, getSupabase } from '../lib/supabaseClient'

interface TransactionRow {
  id: string
  user_id: string
  type: TransactionType
  amount_kobo: number
  occurred_at: string
  category: string
  account: string
  counterparty: string
  description: string
}

interface SettingsRow {
  user_id: string
  monthly_budget_kobo: number
  theme: AppSettings['theme']
}

function rowToTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    type: row.type,
    amountKobo: row.amount_kobo,
    occurredAt: row.occurred_at,
    category: row.category,
    account: row.account,
    counterparty: row.counterparty,
    description: row.description,
  }
}

function transactionToRow(t: Transaction, userId: string): TransactionRow {
  return {
    id: t.id,
    user_id: userId,
    type: t.type,
    amount_kobo: t.amountKobo,
    occurred_at: t.occurredAt,
    category: t.category,
    account: t.account,
    counterparty: t.counterparty,
    description: t.description,
  }
}

export async function fetchSupabaseState(): Promise<{
  transactions: Transaction[]
  settings: AppSettings
} | null> {
  const supabase = getSupabase()
  const userId = await getAuthenticatedUserId()
  if (!supabase || !userId) return null

  const [txRes, settingsRes] = await Promise.all([
    supabase.from('transactions').select('*').eq('user_id', userId).order('occurred_at', {
      ascending: false,
    }),
    supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle(),
  ])

  if (txRes.error) throw new Error(txRes.error.message)
  if (settingsRes.error) throw new Error(settingsRes.error.message)

  const settings: AppSettings = {
    monthlyBudgetKobo: settingsRes.data?.monthly_budget_kobo ?? 0,
    theme: settingsRes.data?.theme ?? 'light',
  }

  return {
    transactions: ((txRes.data ?? []) as TransactionRow[]).map(rowToTransaction),
    settings,
  }
}

export async function upsertSupabaseTransaction(t: Transaction): Promise<void> {
  const supabase = getSupabase()
  const userId = await getAuthenticatedUserId()
  if (!supabase || !userId) return

  const { error } = await supabase
    .from('transactions')
    .upsert(transactionToRow(t, userId), { onConflict: 'id' })
  if (error) throw new Error(error.message)
}

export async function deleteSupabaseTransaction(id: string): Promise<void> {
  const supabase = getSupabase()
  const userId = await getAuthenticatedUserId()
  if (!supabase || !userId) return

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('user_id', userId)
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function replaceSupabaseTransactions(
  transactions: Transaction[],
): Promise<void> {
  const supabase = getSupabase()
  const userId = await getAuthenticatedUserId()
  if (!supabase || !userId) return

  const { error: delError } = await supabase
    .from('transactions')
    .delete()
    .eq('user_id', userId)
  if (delError) throw new Error(delError.message)

  if (transactions.length === 0) return

  const { error: insError } = await supabase
    .from('transactions')
    .insert(transactions.map((t) => transactionToRow(t, userId)))
  if (insError) throw new Error(insError.message)
}

export async function upsertSupabaseSettings(settings: AppSettings): Promise<void> {
  const supabase = getSupabase()
  const userId = await getAuthenticatedUserId()
  if (!supabase || !userId) return

  const row: SettingsRow = {
    user_id: userId,
    monthly_budget_kobo: settings.monthlyBudgetKobo,
    theme: settings.theme,
  }
  const { error } = await supabase.from('user_settings').upsert(row, {
    onConflict: 'user_id',
  })
  if (error) throw new Error(error.message)
}

export async function syncSupabaseState(
  transactions: Transaction[],
  settings: AppSettings,
): Promise<void> {
  await replaceSupabaseTransactions(transactions)
  await upsertSupabaseSettings(settings)
}
