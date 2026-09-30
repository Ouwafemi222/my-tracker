import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ProUpsellCard } from '../components/ProUpsellCard'
import { LedgerFilterBar } from '../components/LedgerFilterBar'
import { MonthWallet } from '../components/MonthWallet'
import { SummaryCard } from '../components/SummaryCard'
import { useLedgerFilter } from '../context/LedgerFilterContext'
import { useTransactions } from '../context/TransactionContext'
import { TRANSACTION_TYPE_LABELS } from '../types/transaction'
import { totalsForLagosRange } from '../utils/calculations'
import { formatLagosDateTime, todayLagosDateString, toLagosDateString } from '../utils/dates'
import { formatKoboAsNaira } from '../utils/money'
import { formatFriendlyPeriodLabel, lagosGreeting } from '../utils/greeting'

export function SimpleDashboardPage() {
  const { loadDemoData } = useTransactions()
  const { visibleTransactions: transactions } = useLedgerFilter()
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

  const periodTitle = formatFriendlyPeriodLabel('daily', selectedDate, selectedDate)

  const summaryText = useMemo(() => {
    if (dayTransactions.length === 0) {
      return `No entries for ${periodTitle}. Record income, spending, or transfers between your accounts.`
    }
    return [
      `${dayTransactions.length} ${dayTransactions.length === 1 ? 'entry' : 'entries'} on this day.`,
      `Money in ${formatKoboAsNaira(totals.totalMoneyInKobo)}, out ${formatKoboAsNaira(totals.totalMoneyOutKobo)}.`,
      `Net cash flow ${formatKoboAsNaira(totals.netCashFlowKobo)} — not your bank balance.`,
    ].join(' ')
  }, [dayTransactions.length, periodTitle, totals])

  const recent = useMemo(
    () =>
      [...transactions]
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
        .slice(0, 8),
    [transactions],
  )

  return (
    <div className="space-y-8">
      <MonthWallet />
      <LedgerFilterBar />
      <section className="glass-card overflow-hidden rounded-3xl p-6 shadow-sm ring-1 ring-emerald-500/20 sm:p-8">
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
          {lagosGreeting()}
        </p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          Today&apos;s overview
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{periodTitle}</p>
        <label className="mt-4 inline-block text-sm font-medium text-slate-700 dark:text-slate-300">
          Choose date
          <input
            type="date"
            className="mt-1 block rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </label>
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Net cash flow
          </p>
          <p
            className={`mt-1 text-4xl font-bold tabular-nums ${
              totals.netCashFlowKobo >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatKoboAsNaira(totals.netCashFlowKobo)}
          </p>
        </div>
      </section>

      {transactions.length === 0 ? (
        <div className="glass-card rounded-2xl border border-dashed border-emerald-200/80 p-10 text-center dark:border-emerald-900">
          <p className="text-lg font-medium text-slate-800 dark:text-slate-100">
            Start tracking your cash flow
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to="/add"
              className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Record transaction
            </Link>
            <button
              type="button"
              onClick={loadDemoData}
              className="rounded-full border border-slate-300 px-6 py-2.5 text-sm font-medium dark:border-slate-600"
            >
              See sample activity
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
          subtitle="Transfers excluded"
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
          subtitle="Not a bank balance"
          highlight="net"
        />
      </div>

      <section className="rounded-2xl bg-gradient-to-br from-emerald-50 to-white p-6 ring-1 ring-emerald-100 dark:from-emerald-950/40 dark:to-slate-900 dark:ring-emerald-900">
        <h3 className="text-sm font-semibold text-emerald-900 dark:text-emerald-300">Summary</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-800 dark:text-slate-200">
          {summaryText}
        </p>
      </section>

      <ProUpsellCard />

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Recent activity
          </h3>
          <Link to="/history" className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400">
            View all
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing to show yet.</p>
        ) : (
          <ul className="glass-card divide-y divide-slate-200/80 overflow-hidden rounded-2xl dark:divide-slate-700">
            {recent.map((t) => (
              <li
                key={t.id}
                className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {TRANSACTION_TYPE_LABELS[t.type]}
                    {t.description ? ` · ${t.description}` : ''}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {formatLagosDateTime(t.occurredAt)} · {t.category}
                  </p>
                </div>
                <p className="text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
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
