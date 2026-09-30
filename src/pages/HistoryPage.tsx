import { useMemo, useState } from 'react'
import { TransactionForm } from '../components/TransactionForm'
import { TransactionReceipt } from '../components/TransactionReceipt'
import { useLedgerFilter } from '../context/LedgerFilterContext'
import { useTransactions } from '../context/TransactionContext'
import {
  TRANSACTION_TYPE_LABELS,
  type Transaction,
  type TransactionType,
} from '../types/transaction'
import { Link } from 'react-router-dom'
import { formatLagosDateTime, toLagosDateString } from '../utils/dates'
import { formatKoboAsNaira } from '../utils/money'
import { cleanParty, readAlert } from '../utils/alertDetails'
import { bankFromAccount, formatMinorAmount } from '../utils/banks'
import { categoriesForType } from '../utils/categories'
import { isProApp } from '../config/appVariant'
import { UpgradeToProButton } from '../components/UpgradeToProButton'
import { downloadCsv, transactionsToCsv } from '../utils/csv'

const ALL_TYPES: TransactionType[] = [
  'earned_income',
  'other_income',
  'expense',
  'internal_transfer',
]

export function HistoryPage() {
  const { updateTransaction, deleteTransaction } = useTransactions()
  const { visibleTransactions: transactions } = useLedgerFilter()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [open, setOpen] = useState<Transaction | null>(null)

  const allCategories = useMemo(() => {
    const set = new Set<string>()
    for (const t of ALL_TYPES) {
      for (const c of categoriesForType(t)) set.add(c)
    }
    for (const t of transactions) set.add(t.category)
    return [...set].sort()
  }, [transactions])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return transactions
      .filter((t) => {
        if (typeFilter !== 'all' && t.type !== typeFilter) return false
        if (categoryFilter !== 'all' && t.category !== categoryFilter) return false
        const d = toLagosDateString(t.occurredAt)
        if (dateFrom && d < dateFrom) return false
        if (dateTo && d > dateTo) return false
        if (!q) return true
        const hay = [
          t.description,
          t.category,
          t.account,
          t.counterparty,
          TRANSACTION_TYPE_LABELS[t.type],
        ]
          .join(' ')
          .toLowerCase()
        return hay.includes(q)
      })
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
  }, [transactions, search, typeFilter, categoryFilter, dateFrom, dateTo])

  function confirmDelete(t: Transaction) {
    const ok = window.confirm(
      `Delete this ${TRANSACTION_TYPE_LABELS[t.type].toLowerCase()} of ${formatKoboAsNaira(t.amountKobo)}? This cannot be undone.`,
    )
    if (ok) deleteTransaction(t.id)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          History
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Search, filter, edit, or export your transactions.
        </p>
      </div>

      <div className="glass-card grid gap-3 rounded-2xl p-4 sm:grid-cols-2 lg:grid-cols-3 ring-1 ring-slate-200/80 dark:ring-slate-700">
        <label className="text-xs font-medium text-slate-600 sm:col-span-2 lg:col-span-3">
          Search
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Description, category, account, person…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label className="text-xs font-medium text-slate-600">
          Type
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TransactionType | 'all')}
          >
            <option value="all">All types</option>
            {ALL_TYPES.map((t) => (
              <option key={t} value={t}>
                {TRANSACTION_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-600">
          Category
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All categories</option>
            {allCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-600">
          From (Lagos date)
          <input
            type="date"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </label>
        <label className="text-xs font-medium text-slate-600">
          To (Lagos date)
          <input
            type="date"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </label>
      </div>

      {open ? <TransactionReceipt transaction={open} onClose={() => setOpen(null)} /> : null}

      {editing ? (
        <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold text-slate-900">Edit transaction</h3>
          <TransactionForm
            initial={editing}
            submitLabel="Save changes"
            onSubmit={(payload) => {
              updateTransaction({ ...payload, id: editing.id })
              setEditing(null)
            }}
            onCancel={() => setEditing(null)}
          />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Showing {filtered.length} of {transactions.length} transactions
        </p>
        {isProApp() ? (
          <button
            type="button"
            disabled={filtered.length === 0}
            onClick={() =>
              downloadCsv(
                `gratitude-expenses-export-${new Date().toISOString().slice(0, 10)}.csv`,
                transactionsToCsv(filtered),
              )
            }
            className="rounded-lg border border-emerald-600 px-3 py-1.5 text-sm font-semibold text-emerald-700 enabled:hover:bg-emerald-50 disabled:opacity-50 dark:text-emerald-400 dark:enabled:hover:bg-emerald-950"
          >
            Export CSV
          </button>
        ) : (
          <UpgradeToProButton compact />
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          No transactions match your filters.
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((t) => {
            const bank = bankFromAccount(t.account)
            const alert = readAlert(t.description, t.counterparty)
            const person = cleanParty(alert.sender || alert.recipient)
            return (
            <li
              key={t.id}
              role="button"
              tabIndex={0}
              onClick={() => setOpen(t)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  setOpen(t)
                }
              }}
              className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-950"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {bank ? (
                    <Link
                      to={`/bank/${bank.id}`}
                      onClick={(event) => event.stopPropagation()}
                      className="text-xs font-bold uppercase tracking-wide text-emerald-800 hover:underline dark:text-[#d6ee7a]"
                    >
                      {bank.label}
                    </Link>
                  ) : (
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{t.account}</p>
                  )}
                  <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900 dark:text-white">
                    {formatMinorAmount(t.amountKobo, bank?.currency ?? 'NGN')}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {TRANSACTION_TYPE_LABELS[t.type]} · {t.category}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    setEditing(t)
                  }}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    confirmDelete(t)
                  }}
                  className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50"
                >
                  Delete
                </button>
              </div>
              </div>
              {alert.narration ? (
                <p className="mt-3 text-sm text-slate-800 dark:text-slate-200">{alert.narration}</p>
              ) : null}
              <p className="mt-1 text-xs text-slate-500">
                {formatLagosDateTime(t.occurredAt)}
                {person ? ` · ${person}` : ''}
              </p>
            </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
