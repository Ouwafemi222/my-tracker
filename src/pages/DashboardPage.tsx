import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { IncomeVsSpendingChart } from '../components/charts/IncomeVsSpendingChart'
import { SpendingByCategoryChart } from '../components/charts/SpendingByCategoryChart'
import { SummaryCard } from '../components/SummaryCard'
import { useTransactions } from '../context/TransactionContext'
import { TRANSACTION_TYPE_LABELS, type Transaction } from '../types/transaction'
import {
  filterTransactionsByLagosRange,
  spendingByCategory,
  totalsForLagosRange,
} from '../utils/calculations'
import {
  formatLagosDateTime,
  monthRangeLagos,
  todayLagosDateString,
} from '../utils/dates'
import { formatKoboAsNaira, parseNairaToKoboAllowZero } from '../utils/money'
import {
  dayLabelsInRange,
  formatShortDay,
  lagosMonthForDate,
  resolvePeriodRange,
  type PeriodMode,
} from '../utils/periods'

function buildPeriodSummary(
  range: { start: string; end: string },
  txs: Transaction[],
  totals: ReturnType<typeof totalsForLagosRange>,
): string {
  if (txs.length === 0) {
    return `No transactions between ${range.start} and ${range.end} (Africa/Lagos). Add entries or load optional demo data.`
  }
  return [
    `From ${range.start} to ${range.end} (Africa/Lagos), ${txs.length} transaction${txs.length === 1 ? '' : 's'} recorded.`,
    `Money in: ${formatKoboAsNaira(totals.totalMoneyInKobo)}; money out: ${formatKoboAsNaira(totals.totalMoneyOutKobo)}.`,
    `Net cash flow: ${formatKoboAsNaira(totals.netCashFlowKobo)} (inflows minus outflows, not a balance). Internal transfers excluded from income and spending.`,
  ].join(' ')
}

export function DashboardPage() {
  const { transactions, loadDemoData, settings, setMonthlyBudgetKobo } =
    useTransactions()
  const [mode, setMode] = useState<PeriodMode>('daily')
  const [selectedDate, setSelectedDate] = useState(todayLagosDateString)
  const [month, setMonth] = useState(todayLagosDateString().slice(0, 7))
  const [customStart, setCustomStart] = useState(todayLagosDateString())
  const [customEnd, setCustomEnd] = useState(todayLagosDateString())
  const [budgetInput, setBudgetInput] = useState('')

  const period = useMemo(
    () =>
      resolvePeriodRange(mode, {
        selectedDate,
        month,
        customStart,
        customEnd,
      }),
    [mode, selectedDate, month, customStart, customEnd],
  )

  const periodTransactions = useMemo(
    () =>
      filterTransactionsByLagosRange(transactions, period.start, period.end).sort(
        (a, b) => b.occurredAt.localeCompare(a.occurredAt),
      ),
    [transactions, period],
  )

  const totals = useMemo(
    () => totalsForLagosRange(transactions, period.start, period.end),
    [transactions, period],
  )

  const summaryText = useMemo(
    () => buildPeriodSummary(period, periodTransactions, totals),
    [period, periodTransactions, totals],
  )

  const incomeVsSpendingData = useMemo(() => {
    const days = dayLabelsInRange(period.start, period.end)
    if (days.length > 14) {
      return days
        .filter((_, i) => i % 7 === 0)
        .slice(0, 8)
        .map((day) => {
          const weekEnd = dayLabelsInRange(day, period.end).slice(0, 7)
          const end = weekEnd[weekEnd.length - 1] ?? day
          const t = totalsForLagosRange(transactions, day, end)
          return {
            label: formatShortDay(day),
            incomeKobo: t.totalMoneyInKobo,
            spendingKobo: t.totalMoneyOutKobo,
          }
        })
    }
    return days.map((day) => {
      const t = totalsForLagosRange(transactions, day, day)
      return {
        label: days.length === 1 ? 'Selected day' : formatShortDay(day),
        incomeKobo: t.totalMoneyInKobo,
        spendingKobo: t.totalMoneyOutKobo,
      }
    })
  }, [transactions, period])

  const categoryData = useMemo(
    () => spendingByCategory(periodTransactions),
    [periodTransactions],
  )

  const budgetMonth = lagosMonthForDate(period.end)
  const monthSpend = useMemo(() => {
    const { start, end } = monthRangeLagos(budgetMonth)
    return totalsForLagosRange(transactions, start, end).totalMoneyOutKobo
  }, [transactions, budgetMonth])

  const budgetKobo = settings.monthlyBudgetKobo
  const budgetRemaining = budgetKobo > 0 ? budgetKobo - monthSpend : 0
  const overBudget = budgetKobo > 0 && monthSpend > budgetKobo

  const recent = useMemo(
    () =>
      [...transactions]
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
        .slice(0, 8),
    [transactions],
  )

  function saveBudget() {
    const kobo = parseNairaToKoboAllowZero(budgetInput || '0')
    if (kobo === null) return
    setMonthlyBudgetKobo(kobo)
    setBudgetInput('')
  }

  const tabClass = (m: PeriodMode) =>
    [
      'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
      mode === m
        ? 'bg-emerald-600 text-white'
        : 'text-slate-600 hover:bg-emerald-50 dark:text-slate-300 dark:hover:bg-emerald-950',
    ].join(' ')

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Finance dashboard
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {period.label} · Africa/Lagos
          </p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
          {(['daily', 'weekly', 'monthly', 'custom'] as PeriodMode[]).map((m) => (
            <button key={m} type="button" className={tabClass(m)} onClick={() => setMode(m)}>
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-4">
        {mode === 'daily' || mode === 'weekly' ? (
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {mode === 'daily' ? 'Day' : 'Week containing'}
            <input
              type="date"
              className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </label>
        ) : null}
        {mode === 'monthly' ? (
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Month
            <input
              type="month"
              className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </label>
        ) : null}
        {mode === 'custom' ? (
          <>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              From
              <input
                type="date"
                className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
              />
            </label>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              To
              <input
                type="date"
                className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
              />
            </label>
          </>
        ) : null}
      </div>

      {transactions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center dark:border-slate-600 dark:bg-slate-800/40">
          <p className="text-slate-700 dark:text-slate-200">No transactions yet.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link
              to="/add"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Add transaction
            </Link>
            <button
              type="button"
              onClick={loadDemoData}
              className="rounded-lg border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950"
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
          subtitle="Earned + other (transfers excluded)"
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
          subtitle="Not an account balance"
          highlight="net"
        />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          Monthly expense budget · {budgetMonth}
        </h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Tracks spending in this Lagos calendar month (expenses only).
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Set budget (₦)
            <input
              className="mt-1 block w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
              placeholder={budgetKobo ? formatKoboAsNaira(budgetKobo) : 'e.g. 100000'}
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
            />
          </label>
          <button
            type="button"
            onClick={saveBudget}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Save budget
          </button>
        </div>
        {budgetKobo > 0 ? (
          <div
            className={`mt-4 rounded-xl p-4 ${
              overBudget
                ? 'bg-rose-50 ring-1 ring-rose-200 dark:bg-rose-950/40 dark:ring-rose-800'
                : 'bg-emerald-50 ring-1 ring-emerald-200 dark:bg-emerald-950/30 dark:ring-emerald-800'
            }`}
          >
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
              Spent this month: {formatKoboAsNaira(monthSpend)} of{' '}
              {formatKoboAsNaira(budgetKobo)}
            </p>
            <p
              className={`mt-1 text-sm font-semibold ${
                overBudget ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-800 dark:text-emerald-400'
              }`}
            >
              {overBudget
                ? `Over budget by ${formatKoboAsNaira(monthSpend - budgetKobo)}`
                : `Remaining: ${formatKoboAsNaira(budgetRemaining)}`}
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white dark:bg-slate-800">
              <div
                className={`h-full rounded-full ${overBudget ? 'bg-rose-500' : 'bg-emerald-500'}`}
                style={{
                  width: `${Math.min(100, (monthSpend / budgetKobo) * 100)}%`,
                }}
              />
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">Set a monthly budget to see progress.</p>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <h3 className="mb-3 font-semibold text-slate-900 dark:text-white">
            Income vs spending
          </h3>
          <IncomeVsSpendingChart
            data={incomeVsSpendingData}
            emptyMessage="No income or spending in this period."
          />
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <h3 className="mb-3 font-semibold text-slate-900 dark:text-white">
            Spending by category
          </h3>
          <SpendingByCategoryChart
            data={categoryData}
            emptyMessage="No expenses in this period."
          />
        </section>
      </div>

      <section className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 dark:border-emerald-900 dark:bg-emerald-950/20">
        <h3 className="text-sm font-semibold text-emerald-900 dark:text-emerald-300">
          Period summary
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-800 dark:text-slate-200">
          {summaryText}
        </p>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Recent transactions
          </h3>
          <Link to="/history" className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400">
            View all
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-slate-500">No transactions to show.</p>
        ) : (
          <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-slate-700 dark:border-slate-700 dark:bg-slate-900">
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
                    {formatLagosDateTime(t.occurredAt)} · {t.category} · {t.account}
                  </p>
                </div>
                <p
                  className={`text-sm font-semibold tabular-nums ${
                    t.type === 'expense'
                      ? 'text-rose-700 dark:text-rose-400'
                      : t.type === 'internal_transfer'
                        ? 'text-slate-600 dark:text-slate-400'
                        : 'text-emerald-700 dark:text-emerald-400'
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
