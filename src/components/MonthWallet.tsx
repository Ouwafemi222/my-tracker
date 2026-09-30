import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useScreenLock } from '../context/ScreenLockContext'
import { useLedgerFilter } from '../context/LedgerFilterContext'
import { useProfilePhoto } from '../lib/useProfilePhoto'
import { BANKS, bankFromAccount, formatMinorAmount } from '../utils/banks'
import { filterTransactionsByLagosRange, totalsForLagosRange } from '../utils/calculations'
import { monthRangeLagos, todayLagosDateString, toLagosDateString } from '../utils/dates'

function mask(hidden: boolean, amount: number, currency: 'NGN' | 'USD') {
  if (hidden) return currency === 'USD' ? '$ ••••••' : '₦ ••••••'
  return formatMinorAmount(amount, currency)
}

export function MonthWallet() {
  const { profile } = useAuth()
  const { photo, upload, remove } = useProfilePhoto()
  const { visibleTransactions: transactions, filter } = useLedgerFilter()
  const { hasPin, lock, locked } = useScreenLock()
  const [choosePin, setChoosePin] = useState(false)
  const [amountsHidden, setAmountsHidden] = useState(false)

  const monthId = todayLagosDateString().slice(0, 7)
  const monthLabel = new Intl.DateTimeFormat('en-NG', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${monthId}-01T12:00:00+01:00`))

  const { start, end } = monthRangeLagos(monthId)
  const monthRows = useMemo(
    () => filterTransactionsByLagosRange(transactions, start, end),
    [transactions, start, end],
  )

  const currency = 'NGN' as const
  const scoped = monthRows.filter((t) => bankFromAccount(t.account)?.currency !== 'USD')
  const monthTotals = useMemo(() => totalsForLagosRange(scoped, start, end), [scoped, start, end])

  const byBank = useMemo(() => {
    return BANKS.map((bank) => {
      const rows = monthRows.filter((t) => bankFromAccount(t.account)?.id === bank.id)
      return { bank, spent: totalsForLagosRange(rows, start, end).totalMoneyOutKobo }
    })
  }, [monthRows, start, end])

  const today = todayLagosDateString()
  const todayRows = transactions.filter((t) => toLagosDateString(t.occurredAt) === today)
  const todayNaira = totalsForLagosRange(
    todayRows.filter((t) => bankFromAccount(t.account)?.currency !== 'USD'),
    today,
    today,
  )
  const todayUsd = totalsForLagosRange(
    todayRows.filter((t) => bankFromAccount(t.account)?.currency === 'USD'),
    today,
    today,
  )

  const name = profile?.display_name?.trim() || 'My ledger'
  const filteredBank = BANKS.find((bank) => bank.id === filter.bankId)
  const figuresHidden = amountsHidden || locked || choosePin
  const backdrop = photo
    ? {
        backgroundImage: `linear-gradient(180deg, rgba(12,22,18,0.35) 0%, rgba(12,22,18,0.82) 70%), url(${photo})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
      }
    : undefined

  function onLock() {
    if (hasPin) lock()
    else setChoosePin(true)
  }

  return (
    <>
      {choosePin ? <PinSetup onClose={() => setChoosePin(false)} /> : null}
      <section
        className="overflow-hidden rounded-[2rem] bg-[#1a3a2f] text-[#f7f4ee] shadow-xl shadow-[#1a3a2f]/20"
        style={backdrop}
      >
        <div className="px-5 pb-6 pt-6 sm:px-8">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-[#d6ee7a]">{name}</p>
              <p className="mt-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs">
                This month · {monthLabel}
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <label className="cursor-pointer rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
                Background
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    event.target.value = ''
                    if (file) void upload(file)
                  }}
                />
              </label>
              {photo ? (
                <button
                  type="button"
                  onClick={remove}
                  className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium"
                >
                  Default
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setAmountsHidden((hidden) => !hidden)}
                className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium"
              >
                {amountsHidden ? 'Show' : 'Hide'}
              </button>
            </div>
          </div>

              <p className="mt-8 text-xs uppercase tracking-[0.16em] text-[#c5d6c8]">
            {filteredBank ? `Sent this month · ${filteredBank.label}` : 'Spent this month'}
          </p>
          <p className="mt-1 font-serif text-4xl tracking-tight sm:text-5xl">
            {mask(figuresHidden, monthTotals.totalMoneyOutKobo, currency)}
          </p>
          <p className="mt-2 text-sm text-[#d6ee7a]">
            Money in {mask(figuresHidden, monthTotals.totalMoneyInKobo, currency)}
          </p>
          <p className="mt-4 text-xs uppercase tracking-[0.16em] text-[#c5d6c8]">Today</p>
          <p className="mt-1 text-lg font-semibold">
            Spent {mask(figuresHidden, todayNaira.totalMoneyOutKobo, 'NGN')}
            <span className="ml-3 text-sm font-normal text-[#d6ee7a]">
              In {mask(figuresHidden, todayNaira.totalMoneyInKobo, 'NGN')}
            </span>
          </p>
          {todayUsd.totalMoneyOutKobo > 0 || todayUsd.totalMoneyInKobo > 0 ? (
            <p className="mt-1 text-sm text-[#d6ee7a]">
              Grey today {mask(figuresHidden, todayUsd.totalMoneyOutKobo, 'USD')} spent
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3 px-5 pb-4 sm:grid-cols-4 sm:px-8">
            <Link
              to="/bank/all"
              className="rounded-[1.4rem] bg-white/15 px-3 py-5 text-center backdrop-blur-sm transition hover:bg-[#d6ee7a] hover:text-[#1a3a2f]"
            >
              <p className="text-sm font-semibold">All naira</p>
              <p className="mt-2 text-lg font-bold tabular-nums">
                {mask(figuresHidden, monthTotals.totalMoneyOutKobo, 'NGN')}
              </p>
              <p className="mt-1 text-[11px] opacity-80">Sent</p>
            </Link>
            {byBank.map(({ bank, spent }) => (
              <Link
                key={bank.id}
                to={`/bank/${bank.id}`}
                className="rounded-[1.4rem] bg-white/15 px-3 py-5 text-center backdrop-blur-sm transition hover:bg-[#d6ee7a] hover:text-[#1a3a2f]"
              >
                <p className="text-sm font-semibold">{bank.label}</p>
                <p className="mt-2 text-lg font-bold tabular-nums">
                  {mask(figuresHidden, spent, bank.currency)}
                </p>
                <p className="mt-1 text-[11px] opacity-80">Sent</p>
              </Link>
            ))}
          </div>

        <div className="grid grid-cols-3 gap-3 px-5 pb-6 sm:px-8">
          <Link
            to="/add"
            className="rounded-2xl bg-white/10 px-3 py-4 text-center text-sm font-medium"
          >
            Record
          </Link>
          <Link
            to="/history"
            className="rounded-2xl bg-white/10 px-3 py-4 text-center text-sm font-medium"
          >
            History
          </Link>
          <button
            type="button"
            onClick={onLock}
            className="rounded-2xl bg-[#d6ee7a] px-3 py-4 text-center text-sm font-semibold text-[#1a3a2f]"
          >
            Lock
          </button>
        </div>
      </section>
    </>
  )
}

function PinSetup({ onClose }: { onClose: () => void }) {
  const { savePinAndLock } = useScreenLock()
  const [pin, setPin] = useState('')

  async function onDigit(d: string) {
    const next = (pin + d).slice(0, 4)
    setPin(next)
    if (next.length === 4) {
      await savePinAndLock(next)
      onClose()
    }
  }

  return (
    <LockScreenSetup
      pin={pin}
      onDigit={onDigit}
      onDelete={() => setPin((p) => p.slice(0, -1))}
      onClose={onClose}
    />
  )
}

function LockScreenSetup({
  pin,
  onDigit,
  onDelete,
  onClose,
}: {
  pin: string
  onDigit: (d: string) => void
  onDelete: () => void
  onClose: () => void
}) {
  return (
    <PinVeil>
      <div className="relative w-full max-w-sm rounded-[2rem] bg-[#f7f4ee] px-6 py-8 text-center text-[#143028]">
        <h2 className="text-3xl">Choose a PIN</h2>
        <p className="mt-2 text-sm text-[#4d5e56]">4 digits to lock this screen.</p>
        <div className="mt-6 flex justify-center gap-3">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`h-3 w-3 rounded-full ${i < pin.length ? 'bg-[#1a3a2f]' : 'bg-[#e2dbce]'}`}
            />
          ))}
        </div>
        <div className="mt-6 grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'x', '0', 'del'].map((d) =>
            d === 'x' ? (
              <button key={d} type="button" onClick={onClose} className="py-4 text-sm">
                Cancel
              </button>
            ) : d === 'del' ? (
              <button key={d} type="button" onClick={onDelete} className="py-4 text-sm font-medium">
                Delete
              </button>
            ) : (
              <button
                key={d}
                type="button"
                onClick={() => onDigit(d)}
                className="rounded-2xl bg-white py-4 text-lg font-semibold ring-1 ring-[#e2dbce]"
              >
                {d}
              </button>
            ),
          )}
        </div>
      </div>
    </PinVeil>
  )
}

function PinVeil({ children }: { children: ReactNode }) {
  useEffect(() => {
    const root = document.getElementById('root')
    root?.classList.add('ledger-locked')
    return () => root?.classList.remove('ledger-locked')
  }, [])

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[#0c1612]/70 backdrop-blur-3xl" />
      {children}
    </div>,
    document.body,
  )
}
