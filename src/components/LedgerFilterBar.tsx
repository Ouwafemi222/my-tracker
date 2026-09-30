import { BANKS } from '../utils/banks'
import { TRANSACTION_TYPE_LABELS, type TransactionType } from '../types/transaction'
import { useLedgerFilter } from '../context/LedgerFilterContext'

const field =
  'mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900'

export function LedgerFilterBar() {
  const { filter, setFilter, clearFilter, active, visibleTransactions } = useLedgerFilter()

  return (
    <section className="mb-6 rounded-3xl bg-white/80 p-4 shadow-sm ring-1 ring-[#e2dbce] dark:bg-slate-950/70 dark:ring-slate-700">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg text-[#143028] dark:text-white">Filter the ledger</h2>
          <p className="text-xs text-slate-500">
            The dashboard above follows this filter, including the bank you pick. Showing{' '}
            {visibleTransactions.length} rows.
          </p>
        </div>
        {active ? (
          <button
            type="button"
            onClick={clearFilter}
            className="rounded-full border border-slate-300 px-4 py-1.5 text-xs font-semibold dark:border-slate-600"
          >
            Clear filters
          </button>
        ) : null}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
          Search
          <input
            className={field}
            value={filter.search}
            placeholder="Description, person, category"
            onChange={(e) => setFilter({ search: e.target.value })}
          />
        </label>
        <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
          Bank
          <select
            className={field}
            value={filter.bankId}
            onChange={(e) => setFilter({ bankId: e.target.value })}
          >
            <option value="all">All banks</option>
            {BANKS.map((bank) => (
              <option key={bank.id} value={bank.id}>
                {bank.label}
                {bank.currency === 'USD' ? ' (USD)' : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
          Type
          <select
            className={field}
            value={filter.type}
            onChange={(e) => setFilter({ type: e.target.value as TransactionType | 'all' })}
          >
            <option value="all">All types</option>
            {(Object.keys(TRANSACTION_TYPE_LABELS) as TransactionType[]).map((type) => (
              <option key={type} value={type}>
                {TRANSACTION_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
          From
          <input
            type="date"
            className={field}
            value={filter.from}
            onChange={(e) => setFilter({ from: e.target.value })}
          />
        </label>
        <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
          To
          <input
            type="date"
            className={field}
            value={filter.to}
            onChange={(e) => setFilter({ to: e.target.value })}
          />
        </label>
      </div>
    </section>
  )
}
