import { useEffect } from 'react'
import type { Transaction } from '../types/transaction'
import { readAlert, receiptStory } from '../utils/alertDetails'
import { bankFromAccount, formatMinorAmount } from '../utils/banks'
import { formatLagosDateTime } from '../utils/dates'

export function TransactionReceipt({
  transaction,
  onClose,
}: {
  transaction: Transaction
  onClose: () => void
}) {
  const bank = bankFromAccount(transaction.account)
  const currency = bank?.currency ?? 'NGN'
  const story = receiptStory(
    transaction.description,
    transaction.counterparty,
    bank?.label || transaction.account,
    transaction.type,
  )
  const alert = readAlert(transaction.description, transaction.counterparty)
  const rows = [
    [story.whoLabel, story.who],
    ['Their bank', story.theirBank],
    ['Your account', story.yourBank],
    ['Account number', alert.accountNumber],
    ['Balance after', alert.balance],
    ['When', formatLagosDateTime(transaction.occurredAt)],
  ].filter(([, value]) => value)

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-[#0c1612]/55 px-4 py-6 sm:items-center"
      onClick={onClose}
    >
      <article
        className="w-full max-w-md overflow-hidden rounded-[1.6rem] bg-[#f7f4ee] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="bg-[#1a3a2f] px-6 pb-8 pt-6 text-[#f7f4ee]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d6ee7a]">
            {story.yourBank}
          </p>
          <h2 className="mt-2 text-2xl font-semibold leading-snug">{story.title}</h2>
          <p className="mt-5 text-xs uppercase tracking-[0.14em] text-[#c5d6c8]">{story.amountLabel}</p>
          <p className="mt-1 font-serif text-4xl tracking-tight">
            {formatMinorAmount(transaction.amountKobo, currency)}
          </p>
        </header>
        <div className="px-5 py-5">
          <dl className="overflow-hidden rounded-2xl bg-white ring-1 ring-[#e2dbce]">
            {rows.map(([label, value]) => (
              <div key={label} className="grid grid-cols-[7.5rem_1fr] gap-3 border-b border-[#efe8dc] px-4 py-3 text-sm last:border-b-0">
                <dt className="text-[#6b7280]">{label}</dt>
                <dd className="font-semibold text-[#143028]">{value}</dd>
              </div>
            ))}
          </dl>
          {story.whenNote && !story.who ? (
            <p className="mt-3 px-1 text-sm leading-relaxed text-[#4d5e56]">{story.whenNote}</p>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="mt-4 w-full rounded-full bg-[#1a3a2f] py-3 text-sm font-semibold text-[#f7f4ee]"
          >
            Close
          </button>
        </div>
      </article>
    </div>
  )
}
