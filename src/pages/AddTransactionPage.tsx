import { useState } from 'react'
import { Link } from 'react-router-dom'
import { TransactionForm } from '../components/TransactionForm'
import { useTransactions } from '../context/TransactionContext'
import { formatKoboAsNaira } from '../utils/money'
import { TRANSACTION_TYPE_LABELS } from '../types/transaction'

export function AddTransactionPage() {
  const { addTransaction } = useTransactions()
  const [saved, setSaved] = useState<{
    type: string
    amountKobo: number
  } | null>(null)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Record a transaction
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Log income, spending, or a transfer between your own accounts. Amounts are in naira (₦).
        </p>
      </div>

      {saved ? (
        <div
          className="glass-card rounded-2xl p-5 text-sm ring-2 ring-emerald-500/30"
          role="status"
        >
          <p className="font-semibold text-emerald-900 dark:text-emerald-200">Saved</p>
          <p className="mt-1 text-slate-700 dark:text-slate-300">
            {saved.type} · {formatKoboAsNaira(saved.amountKobo)}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSaved(null)}
              className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              Record another
            </button>
            <Link
              to="/"
              className="rounded-full border border-emerald-600 px-4 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950"
            >
              Back to overview
            </Link>
          </div>
        </div>
      ) : null}

      <div className="glass-card rounded-2xl p-6 shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700">
        <TransactionForm
          submitLabel="Save"
          onSubmit={(payload) => {
            addTransaction(payload)
            setSaved({
              type: TRANSACTION_TYPE_LABELS[payload.type],
              amountKobo: payload.amountKobo,
            })
          }}
        />
      </div>
    </div>
  )
}
