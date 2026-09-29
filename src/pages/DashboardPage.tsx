import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { SummaryCard } from '../components/SummaryCard'
import { useTransactions } from '../context/TransactionContext'
import { TRANSACTION_TYPE_LABELS, type Transaction } from '../types/transaction'
import { totalsForLagosRange } from '../utils/calculations'
import { formatLagosDateTime, todayLagosDateString, toLagosDateString } from '../utils/dates'
import { formatKoboAsNaira } from '../utils/money'

function buildDailySummary(
  date: string,
  txs: Transaction[],
  totals: ReturnType<typeof totalsForLagosRange>,
): string {
  if (txs.length === 0) {
    return `No transactions recorded for ${date} in Africa/Lagos. Add entries or load optional demo data from Data & backup.`
  }
  const parts: string[] = []
  parts.push(
    `On ${date} (Africa/Lagos), you recorded ${txs.length} transaction${txs.length === 1 ? '' : 's'}.`,
  )
  parts.push(
    `Money in: ${formatKoboAsNaira(totals.totalMoneyInKobo)} (earned ${formatKoboAsNaira(totals.earnedIncomeKobo)}, other received ${formatKoboAsNaira(totals.otherReceivedKobo)}).`,
  )
  parts.push(`Money out: ${formatKoboAsNaira(totals.totalMoneyOutKobo)} (expenses only; internal transfers excluded).`)
  parts.push(
    `Net cash flow for the day: ${formatKoboAsNaira(totals.netCashFlowKobo)} — this is inflows minus outflows, not an account balance.`,
  )
  const transfers = txs.filter((t) => t.type === 'internal_transfer')
  if (transfers.length) {
    parts.push(
      `${transfers.length} internal transfer${transfers.length === 1 ? '' : 's'} between your accounts did not change income or spending totals.`,
    )
  }
  return parts.join(' ')
}

export function DashboardPage() {
  const { transactions, loadDemoData } = useTransactions()
  const [selectedDate, setSelectedDate] = useState(todayLagosDateString)

  const dayTransactions = useMemo(
    () =>
      transactions
        .filter((t) => toLagosDateString(t.occurredAt) === selectedDate)
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
    [transactions, selectedDate],
  )

  const totals = useMemo(
    () => totalsForLagosRange(transactions, selectedDate, selectedDate),
    [transactions, selectedDate],
  )

  const summaryText = useMemo(
    () => buildDailySummary(selectedDate, dayTransactions, totals),
    [selectedDate, dayTransactions, totals],
  )

  const recent = useMemo(
    () =>
      [...transactions]
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
        .slice(0, 8),
    [transactions],
  )

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
          <p className="mt-1 text-sm text-slate-600">
            Summary for the selected calendar day (Africa/Lagos).
          </p>
        </div>
        <label className="text-sm font-medium text-slate-700">
          Date
          <input
            type="date"
            className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </label>
      </section>

      {transactions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
          <p className="text-slate-700">You have no transactions yet.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link
              to="/add"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Add your first transaction
            </Link>
            <button
              type="button"
              onClick={loadDemoData}
              className="rounded-lg border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              Load optional demo data
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard title="Earned income" amountKobo={totals.earnedIncomeKobo} highlight="in" />
        <SummaryCard
          title="Other money received"
          amountKobo={totals.otherReceivedKobo}
          highlight="in"
        />
        <SummaryCard
          title="Total money in"
          amountKobo={totals.totalMoneyInKobo}
          subtitle="Earned + other received (transfers excluded)"
          highlight="in"
        />
        <SummaryCard
          title="Total money out"
          amountKobo={totals.totalMoneyOutKobo}
          subtitle="Expenses only"
          highlight="out"
        />
        <SummaryCard
          title="Net cash flow"
          amountKobo={totals.netCashFlowKobo}
          subtitle="Total money in − total money out (not a balance)"
          highlight="net"
        />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-emerald-50/50 p-5">
        <h3 className="text-sm font-semibold text-emerald-900">Daily summary</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-800">{summaryText}</p>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Recent transactions</h3>
          <Link to="/history" className="text-sm font-medium text-emerald-700 hover:underline">
            View all
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-slate-500">No transactions to show.</p>
        ) : (
          <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {recent.map((t) => (
              <li
                key={t.id}
                className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-slate-900">
                    {TRANSACTION_TYPE_LABELS[t.type]}
                    {t.description ? ` · ${t.description}` : ''}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatLagosDateTime(t.occurredAt)} · {t.category} · {t.account}
                  </p>
                </div>
                <p
                  className={`text-sm font-semibold tabular-nums ${
                    t.type === 'expense'
                      ? 'text-rose-700'
                      : t.type === 'internal_transfer'
                        ? 'text-slate-600'
                        : 'text-emerald-700'
                  }`}
                >
                  {t.type === 'expense' ? '−' : t.type === 'internal_transfer' ? '' : '+'}
                  {formatKoboAsNaira(t.amountKobo)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
