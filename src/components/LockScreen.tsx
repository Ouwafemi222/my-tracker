import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useScreenLock } from '../context/ScreenLockContext'
import { Logo } from './Logo'

function LockVeil({ children }: { children: ReactNode }) {
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

export function LockScreen() {
  const { locked, tryUnlock } = useScreenLock()
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!locked) return null

  function onDigit(d: string) {
    setError(null)
    const next = (pin + d).slice(0, 4)
    setPin(next)
    if (next.length === 4) {
      void tryUnlock(next).then((ok) => {
        if (!ok) {
          setError('Wrong PIN')
          setPin('')
        } else {
          setPin('')
        }
      })
    }
  }

  return (
    <LockVeil>
      <div className="relative w-full max-w-sm rounded-[2rem] bg-[#f7f4ee] px-6 py-8 text-center text-[#143028] shadow-2xl">
        <div className="mx-auto flex justify-center">
          <Logo className="h-14 w-14 text-2xl" />
        </div>
        <h2 className="mt-4 text-3xl">Ledger locked</h2>
        <p className="mt-2 text-sm text-[#4d5e56]">
          Enter your 4-digit PIN. This stays up until the PIN is right.
        </p>
        <div className="mt-6 flex justify-center gap-3" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`h-3 w-3 rounded-full ${i < pin.length ? 'bg-[#1a3a2f]' : 'bg-[#e2dbce]'}`}
            />
          ))}
        </div>
        {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
        <div className="mt-6 grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onDigit(d)}
              className="rounded-2xl bg-white py-4 text-lg font-semibold shadow-sm ring-1 ring-[#e2dbce]"
            >
              {d}
            </button>
          ))}
          <span />
          <button
            type="button"
            onClick={() => onDigit('0')}
            className="rounded-2xl bg-white py-4 text-lg font-semibold shadow-sm ring-1 ring-[#e2dbce]"
          >
            0
          </button>
          <button
            type="button"
            onClick={() => setPin((p) => p.slice(0, -1))}
            className="rounded-2xl py-4 text-sm font-medium text-[#1a3a2f]"
          >
            Delete
          </button>
        </div>
      </div>
    </LockVeil>
  )
}
