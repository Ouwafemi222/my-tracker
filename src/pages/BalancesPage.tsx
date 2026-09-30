import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useBankBalances } from '../context/BankBalanceContext'
import { BANKS, formatMinorAmount, type BankCurrency } from '../utils/banks'
import { formatLagosDateTime } from '../utils/dates'

function mask(hidden: boolean, amount: number, currency: BankCurrency) {
  if (hidden) return currency === 'USD' ? '$ ••••••' : '₦ ••••••'
  return formatMinorAmount(amount, currency)
}

export function BalancesPage() {
  const { balances } = useBankBalances()
  const [hidden, setHidden] = useState(true)
  const nairaLeft = BANKS.filter((bank) => bank.currency === 'NGN').reduce(
    (sum, bank) => sum + (balances[bank.id]?.amountKobo ?? 0),
    0,
  )
  const usdLeft = balances.grey?.amountKobo ?? 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Balances</h2>
        <button
          type="button"
          onClick={() => setHidden((value) => !value)}
          className="rounded-full bg-[#1a3a2f] px-4 py-1.5 text-xs font-semibold text-[#f7f4ee]"
        >
          {hidden ? 'Show' : 'Hide'}
        </button>
      </div>
      <p className="mt-1 max-w-xl text-sm text-slate-600 dark:text-slate-400">
          Each figure is the account balance from that bank’s newest email alert. Fetch today’s mail
          on Settings after a transfer, and the cards on the dashboard update from those emails.
        </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-[#1a3a2f] px-5 py-4 text-[#f7f4ee]">
          <p className="text-xs uppercase tracking-[0.14em] text-[#d6ee7a]">Naira left</p>
          <p className="mt-2 font-serif text-3xl">{mask(hidden, nairaLeft, 'NGN')}</p>
        </div>
        <div className="rounded-2xl bg-[#1a3a2f] px-5 py-4 text-[#f7f4ee]">
          <p className="text-xs uppercase tracking-[0.14em] text-[#d6ee7a]">Grey left</p>
          <p className="mt-2 font-serif text-3xl">{mask(hidden, usdLeft, 'USD')}</p>
        </div>
      </div>

      <ul className="space-y-3">
        {BANKS.map((bank) => {
          const mailed = balances[bank.id]
          return (
            <li
              key={bank.id}
              className="rounded-2xl bg-white p-4 ring-1 ring-[#e2dbce] dark:bg-slate-950 dark:ring-slate-700"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-[#143028] dark:text-white">{bank.label}</p>
                  <p className="text-xs text-slate-500">
                    {mailed?.at ? `From the alert on ${formatLagosDateTime(mailed.at)}` : 'No balance in mail yet'}
                  </p>
                </div>
                <p className="text-xl font-semibold tabular-nums text-[#143028] dark:text-white">
                  {mailed ? mask(hidden, mailed.amountKobo, bank.currency) : '—'}
                </p>
              </div>
            </li>
          )
        })}
      </ul>

      <Link to="/data" className="inline-block text-sm font-semibold text-emerald-800 hover:underline">
        Fetch today’s mail
      </Link>
    </div>
  )
}
