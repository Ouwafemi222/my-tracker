import { useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { TransactionReceipt } from '../components/TransactionReceipt'
import { useLedgerFilter } from '../context/LedgerFilterContext'
import { useTransactions } from '../context/TransactionContext'
import { TRANSACTION_TYPE_LABELS, type Transaction, type TransactionType } from '../types/transaction'
import { readAlert } from '../utils/alertDetails'
import { BANKS, bankFromAccount, formatMinorAmount } from '../utils/banks'
import { filterTransactionsByLagosRange } from '../utils/calculations'
import { monthRangeLagos, todayLagosDateString, toLagosDateString } from '../utils/dates'

function personLabel(counterparty: string): string {
  const trimmed = counterparty.trim()
  const named = trimmed.match(/^([^<]+)</)
  if (named) {
    const name = named[1].replace(/["']/g, '').trim()
    if (name && !name.includes('@')) return name
  }
  if (trimmed.includes('@')) return ''
  return trimmed
}

const TYPES: Array<TransactionType | 'all'> = [
  'all',
  'expense',
  'earned_income',
  'other_income',
  'internal_transfer',
]

export function BankPage() {
  const { bankId = '' } = useParams()
  const { transactions: allTransactions } = useTransactions()
  const { visibleTransactions, active } = useLedgerFilter()
  const transactions = active ? visibleTransactions : allTransactions
  const bank = BANKS.find((item) => item.id === bankId) ?? null
  const isAll = bankId === 'all'
  const [month, setMonth] = useState(todayLagosDateString().slice(0, 7))
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<Transaction | null>(null)

  const monthLabel = new Intl.DateTimeFormat('en-NG', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${month}-01T12:00:00+01:00`))

  const rows = useMemo(() => {
    if (!isAll && !bank) return []
    const { start, end } = monthRangeLagos(month)
    const q = query.trim().toLowerCase()
    return filterTransactionsByLagosRange(transactions, start, end)
      .filter((t) => {
        const match = bankFromAccount(t.account)
        if (isAll) return match?.currency !== 'USD'
        return match?.id === bank?.id
      })
      .filter((t) => (typeFilter === 'all' ? true : t.type === typeFilter))
      .filter((t) => {
        if (!q) return true
        return [t.description, t.category, t.counterparty, t.account, TRANSACTION_TYPE_LABELS[t.type]]
          .join(' ')
          .toLowerCase()
          .includes(q)
      })
      .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
  }, [transactions, month, bank, isAll, typeFilter, query])

  const spent = rows
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amountKobo, 0)
  const received = rows
    .filter((t) => t.type === 'earned_income' || t.type === 'other_income')
    .reduce((sum, t) => sum + t.amountKobo, 0)
  const currency = bank?.currency ?? 'NGN'

  if (!isAll && !bank) return <Navigate to="/" replace />

  const title = isAll
    ? `Naira transactions for ${monthLabel}`
    : `${bank?.label} transactions for ${monthLabel}`

  return (
    <div className="space-y-5">
      {open ? <TransactionReceipt transaction={open} onClose={() => setOpen(null)} /> : null}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link to="/" className="text-sm font-medium text-emerald-800 hover:underline">
            Back to dashboard
          </Link>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#143028] sm:text-4xl dark:text-white">
            {title}
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {isAll ? 'Every naira account' : `${bank?.label} · ${currency === 'USD' ? 'US dollars' : 'Nigerian naira'}`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Bank', isAll ? 'All naira banks' : bank?.label],
          ['Currency', currency === 'USD' ? 'USD' : 'NGN'],
          ['Spent', formatMinorAmount(spent, currency)],
          ['Money in', formatMinorAmount(received, currency)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-white px-4 py-3 ring-1 ring-[#e2dbce] dark:bg-slate-950 dark:ring-slate-700">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 text-lg font-semibold text-[#143028] dark:text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Month
          <input
            type="month"
            className="mt-1 block rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </label>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Type
          <select
            className="mt-1 block rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TransactionType | 'all')}
          >
            {TYPES.map((type) => (
              <option key={type} value={type}>
                {type === 'all' ? 'All types' : TRANSACTION_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-[16rem] flex-1 text-sm font-medium text-slate-700 dark:text-slate-300">
          Search
          <input
            className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900"
            placeholder="Description, category, person"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>

      <div className="overflow-auto rounded-2xl bg-white shadow-sm ring-1 ring-[#e2dbce] dark:bg-slate-950 dark:ring-slate-700">
        <table className="min-w-[920px] w-full border-collapse text-left text-sm">
          <thead className="sticky top-0 bg-[#1a3a2f] text-[#f7f4ee]">
            <tr>
              {['Date', 'Type', 'Category', 'Description', 'Person', 'Account', 'Amount'].map(
                (heading) => (
                  <th key={heading} className="px-3 py-3 font-semibold">
                    {heading}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-slate-500">
                  Nothing in this sheet for {monthLabel}.
                </td>
              </tr>
            ) : (
              rows.map((t, index) => (
                <tr
                  key={t.id}
                  onClick={() => setOpen(t)}
                  className={`cursor-pointer ${index % 2 === 0 ? 'bg-[#f7f4ee] dark:bg-slate-900' : 'bg-white dark:bg-slate-950'} hover:bg-[#d6ee7a]/40`}
                >
                  <td className="whitespace-nowrap px-3 py-2">{toLagosDateString(t.occurredAt)}</td>
                  <td className="px-3 py-2">{TRANSACTION_TYPE_LABELS[t.type]}</td>
                  <td className="px-3 py-2">{t.category}</td>
                  <td className="px-3 py-2">{readAlert(t.description, t.counterparty).narration}</td>
                  <td className="px-3 py-2">
                    {readAlert(t.description, t.counterparty).sender ||
                      readAlert(t.description, t.counterparty).recipient ||
                      personLabel(t.counterparty)}
                  </td>
                  <td className="px-3 py-2 font-medium">{t.account}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums">
                    {t.type === 'expense' ? '−' : t.type === 'internal_transfer' ? '' : '+'}
                    {formatMinorAmount(t.amountKobo, bankFromAccount(t.account)?.currency ?? currency)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
