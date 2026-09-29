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
        <h2 className="text-2xl font-bold text-slate-900">Manual transaction entry</h2>
        <p className="mt-1 text-sm text-slate-600">
          Record earned income, other money received, expenses, or transfers between your
          own accounts.
        </p>
      </div>

      {saved ? (
        <div
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950"
          role="status"
        >
          <p className="font-semibold">Transaction saved</p>
          <p className="mt-1">
            {saved.type} — {formatKoboAsNaira(saved.amountKobo)} recorded successfully.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSaved(null)}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              Add another
            </button>
            <Link
              to="/"
              className="rounded-lg border border-emerald-600 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-white"
            >
              Go to dashboard
            </Link>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <TransactionForm
          submitLabel="Save transaction"
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
