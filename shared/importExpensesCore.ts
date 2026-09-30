export const VALID_TRANSACTION_TYPES = [
  'earned_income',
  'other_income',
  'expense',
  'internal_transfer',
] as const

export type ImportTransactionType = (typeof VALID_TRANSACTION_TYPES)[number]

const VALID_TYPE_SET = new Set<string>(VALID_TRANSACTION_TYPES)

export interface ParsedImportRow {
  rowIndex: number
  type: ImportTransactionType
  amountKobo: number
  occurredAtIso: string
  category: string
  account: string
  counterparty: string
  description: string
  importRowKey: string
}

export type ParseBatchResult =
  | { ok: true; rows: ParsedImportRow[] }
  | { ok: false; errors: string[] }

export function parseNairaToKobo(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.round(value * 100)
  }
  if (typeof value === 'string') {
    const trimmed = value.trim().replace(/,/g, '').replace(/₦/g, '')
    if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null
    const [whole, frac = ''] = trimmed.split('.')
    const kobo = Number(whole) * 100 + Number((frac + '00').slice(0, 2))
    return kobo > 0 ? kobo : null
  }
  return null
}

export function normalizeTransactionType(raw: unknown): ImportTransactionType | null {
  if (typeof raw !== 'string') return null
  const key = raw.trim().toLowerCase().replace(/\s+/g, '_')
  const aliases: Record<string, ImportTransactionType> = {
    expense: 'expense',
    expenses: 'expense',
    earned_income: 'earned_income',
    income: 'earned_income',
    salary: 'earned_income',
    other_income: 'other_income',
    internal_transfer: 'internal_transfer',
    transfer: 'internal_transfer',
  }
  const mapped = aliases[key] ?? (VALID_TYPE_SET.has(key) ? (key as ImportTransactionType) : null)
  return mapped
}

/** Accept ISO date-time or YYYY-MM-DD (defaults to noon Africa/Lagos). */
export function parseOccurredAt(raw: unknown): string | null {
  if (raw == null) return null
  const s = String(raw).trim()
  if (!s) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(`${s}T12:00:00+01:00`)
    return Number.isNaN(d.getTime()) ? null : d.toISOString()
  }
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

const IMPORT_BANKS: { label: string; aliases: string[] }[] = [
  { label: 'OPay', aliases: ['opay', 'o pay'] },
  { label: 'PalmPay', aliases: ['palmpay', 'palm pay'] },
  { label: 'GTBank', aliases: ['gtbank', 'gt bank', 'guaranty trust'] },
  { label: 'Wema', aliases: ['wema'] },
  { label: 'Premium Bank', aliases: ['premiumtrust', 'premium bank', 'premium'] },
  { label: 'Kuda', aliases: ['kuda'] },
  { label: 'Grey', aliases: ['grey usd', 'grey', 'gray'] },
]

function matchBankLabel(text: string): string | null {
  const blob = text.trim().toLowerCase().replace(/[_-]+/g, ' ')
  if (!blob) return null
  const hit = IMPORT_BANKS.find(
    (bank) => bank.label.toLowerCase() === blob || bank.aliases.some((alias) => blob.includes(alias)),
  )
  return hit?.label ?? null
}

function canonicalImportAccount(t: Record<string, unknown>): string {
  const explicit = String(t.account ?? t.bank ?? '').trim()
  const fromExplicit = matchBankLabel(explicit)
  if (fromExplicit) return fromExplicit
  const hint = [t.description, t.counterparty, t.sender, t.recipient]
    .map((part) => String(part ?? ''))
    .join(' ')
  return matchBankLabel(hint) ?? (explicit.slice(0, 120) || 'Unassigned')
}

export function buildImportRowKey(
  t: Record<string, unknown>,
  rowIndex: number,
  idempotencyKey: string | null,
): string {
  const explicit = t.row_id ?? t.client_ref ?? t.idempotency_row_key
  if (typeof explicit === 'string' && explicit.trim()) {
    return explicit.trim().slice(0, 120)
  }
  return `${idempotencyKey ?? 'batch'}:${rowIndex + 1}`
}

export function parseImportBatch(
  transactions: unknown[],
  options: {
    source?: string
    idempotencyKey?: string | null
    maxRows?: number
  },
): ParseBatchResult {
  const maxRows = options.maxRows ?? 200
  const errors: string[] = []

  if (!Array.isArray(transactions) || transactions.length === 0) {
    return { ok: false, errors: ['transactions array is required'] }
  }
  if (transactions.length > maxRows) {
    return { ok: false, errors: [`Max ${maxRows} transactions per request`] }
  }

  const rows: ParsedImportRow[] = []

  for (let i = 0; i < transactions.length; i++) {
    const t = transactions[i] as Record<string, unknown>
    const type = normalizeTransactionType(t.type)
    if (!type) {
      errors.push(`Row ${i + 1}: invalid type`)
      continue
    }

    let kobo: number | null = null
    if (typeof t.amount_kobo === 'number' && t.amount_kobo > 0) {
      kobo = Math.round(t.amount_kobo)
    } else {
      kobo = parseNairaToKobo(t.amount_naira) ?? parseNairaToKobo(t.amount)
    }
    if (kobo === null) {
      errors.push(`Row ${i + 1}: invalid amount`)
      continue
    }

    const occurredAtIso = parseOccurredAt(t.occurred_at ?? t.date)
    if (!occurredAtIso) {
      errors.push(`Row ${i + 1}: invalid occurred_at (use ISO date-time or YYYY-MM-DD)`)
      continue
    }

    rows.push({
      rowIndex: i,
      type,
      amountKobo: kobo,
      occurredAtIso,
      category: String(t.category ?? 'Other expense').trim().slice(0, 120) || 'Other expense',
      account: canonicalImportAccount(t),
      counterparty: String(t.counterparty ?? t.sender ?? t.recipient ?? '')
        .trim()
        .slice(0, 200),
      description:
        String(t.description ?? options.source ?? 'Import').trim().slice(0, 500) || 'Import',
      importRowKey: buildImportRowKey(t, i, options.idempotencyKey ?? null),
    })
  }

  if (errors.length > 0) {
    return { ok: false, errors }
  }

  return { ok: true, rows }
}

export function sanitizeErrorMessage(code: string, requestId: string): string {
  return `${code} (request_id=${requestId})`
}
