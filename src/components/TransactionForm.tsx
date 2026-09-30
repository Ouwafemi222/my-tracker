import { useEffect, useState, type FormEvent } from 'react'
import type { Transaction, TransactionType } from '../types/transaction'
import { TRANSACTION_TYPE_LABELS } from '../types/transaction'
import { categoriesForType, ACCOUNTS } from '../utils/categories'
import { bankFromAccount } from '../utils/banks'
import { nairaInputFromKobo, parseNairaToKobo } from '../utils/money'

export interface TransactionFormValues {
  type: TransactionType
  amountNaira: string
  date: string
  time: string
  category: string
  account: string
  counterparty: string
  description: string
}

function defaultFormValues(): TransactionFormValues {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    type: 'expense',
    amountNaira: '',
    date: now.toISOString().slice(0, 10),
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    category: categoriesForType('expense')[0],
    account: ACCOUNTS[0],
    counterparty: '',
    description: '',
  }
}

function valuesFromTransaction(t: Transaction): TransactionFormValues {
  const d = new Date(t.occurredAt)
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    type: t.type,
    amountNaira: nairaInputFromKobo(t.amountKobo),
    date: d.toISOString().slice(0, 10),
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    category: t.category,
    account: t.account,
    counterparty: t.counterparty,
    description: t.description,
  }
}

interface TransactionFormProps {
  initial?: Transaction
  submitLabel: string
  onSubmit: (payload: Omit<Transaction, 'id'>) => void
  onCancel?: () => void
}

export function TransactionForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: TransactionFormProps) {
  const [values, setValues] = useState<TransactionFormValues>(() =>
    initial ? valuesFromTransaction(initial) : defaultFormValues(),
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initial) setValues(valuesFromTransaction(initial))
  }, [initial])

  const categories = categoriesForType(values.type)

  useEffect(() => {
    if (!categories.includes(values.category)) {
      setValues((v) => ({ ...v, category: categories[0] ?? '' }))
    }
  }, [values.type, values.category, categories])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const kobo = parseNairaToKobo(values.amountNaira)
    if (kobo === null) {
      setError('Enter a positive amount in naira (e.g. 1500 or 1500.50).')
      return
    }
    if (!values.category.trim()) {
      setError('Choose a category.')
      return
    }
    if (!values.account.trim()) {
      setError('Choose an account or payment method.')
      return
    }
    const occurredAt = new Date(`${values.date}T${values.time}:00`).toISOString()
    if (Number.isNaN(Date.parse(occurredAt))) {
      setError('Invalid date or time.')
      return
    }
    onSubmit({
      type: values.type,
      amountKobo: kobo,
      occurredAt,
      category: values.category,
      account: values.account,
      counterparty: values.counterparty.trim(),
      description: values.description.trim(),
    })
  }

  const fieldClass =
    'mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-600 dark:bg-slate-900 dark:text-white'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Type
          <select
            className={fieldClass}
            value={values.type}
            onChange={(e) =>
              setValues((v) => ({ ...v, type: e.target.value as TransactionType }))
            }
          >
            {(Object.keys(TRANSACTION_TYPE_LABELS) as TransactionType[]).map((t) => (
              <option key={t} value={t}>
                {TRANSACTION_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          {bankFromAccount(values.account)?.currency === 'USD' ? 'Amount (USD)' : 'Amount (₦)'}
          <input
            className={fieldClass}
            inputMode="decimal"
            placeholder={
              bankFromAccount(values.account)?.currency === 'USD' ? 'e.g. 25.00' : 'e.g. 5000'
            }
            value={values.amountNaira}
            onChange={(e) => setValues((v) => ({ ...v, amountNaira: e.target.value }))}
            required
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Date
          <input
            type="date"
            className={fieldClass}
            value={values.date}
            onChange={(e) => setValues((v) => ({ ...v, date: e.target.value }))}
            required
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Time
          <input
            type="time"
            className={fieldClass}
            value={values.time}
            onChange={(e) => setValues((v) => ({ ...v, time: e.target.value }))}
            required
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Category
          <select
            className={fieldClass}
            value={values.category}
            onChange={(e) => setValues((v) => ({ ...v, category: e.target.value }))}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Account / payment method
          <select
            className={fieldClass}
            value={values.account}
            onChange={(e) => setValues((v) => ({ ...v, account: e.target.value }))}
          >
            {(ACCOUNTS as readonly string[]).includes(values.account)
              ? null
              : values.account ? (
                  <option value={values.account}>{values.account}</option>
                ) : null}
            {ACCOUNTS.map((a) => (
              <option key={a} value={a}>
                {a === 'Grey' ? 'Grey (USD)' : a}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block text-sm font-medium text-slate-700">
        Sender or recipient
        <input
          className={fieldClass}
          value={values.counterparty}
          onChange={(e) => setValues((v) => ({ ...v, counterparty: e.target.value }))}
          placeholder="Who paid or received"
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Description
        <textarea
          className={`${fieldClass} min-h-[80px]`}
          value={values.description}
          onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
          placeholder="Optional notes"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/25 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        >
          {submitLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  )
}
