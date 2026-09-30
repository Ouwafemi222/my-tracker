import { describe, expect, it } from 'vitest'
import {
  normalizeTransactionType,
  parseImportBatch,
  parseNairaToKobo,
  parseOccurredAt,
} from './importExpensesCore'

describe('parseNairaToKobo', () => {
  it('parses numbers and strings', () => {
    expect(parseNairaToKobo(45.5)).toBe(4550)
    expect(parseNairaToKobo('4,500')).toBe(450000)
  })
})

describe('parseOccurredAt', () => {
  it('accepts ISO and date-only', () => {
    expect(parseOccurredAt('2026-09-01T09:30:00+01:00')).toContain('2026-09-01')
    expect(parseOccurredAt('2026-09-01')).toContain('2026-09-01')
  })
})

describe('normalizeTransactionType', () => {
  it('normalizes aliases', () => {
    expect(normalizeTransactionType('Expense')).toBe('expense')
    expect(normalizeTransactionType('earned income')).toBe('earned_income')
  })
})

describe('parseImportBatch', () => {
  it('rejects partial invalid batch (atomic validation)', () => {
    const result = parseImportBatch(
      [
        { type: 'expense', amount_naira: 100, occurred_at: '2026-09-01' },
        { type: 'bad', amount_naira: 50, occurred_at: '2026-09-02' },
      ],
      {},
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.length).toBeGreaterThan(0)
  })

  it('accepts valid batch', () => {
    const result = parseImportBatch(
      [{ type: 'expense', amount_naira: 4500, occurred_at: '2026-09-01T09:30:00+01:00' }],
      { source: 'test' },
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.rows).toHaveLength(1)
      expect(result.rows[0].amountKobo).toBe(450000)
    }
  })

  it('uses stable row keys for idempotency', () => {
    const result = parseImportBatch(
      [{ type: 'expense', amount_naira: 1, occurred_at: '2026-09-01', row_id: 'row-7' }],
      { idempotencyKey: 'sep-batch' },
    )
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.rows[0].importRowKey).toBe('row-7')
  })
})
