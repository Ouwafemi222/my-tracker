import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

const PIN_KEY = 'gratitude-screen-pin'

async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(`gratitude-lock:${pin}`)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

interface ScreenLockValue {
  locked: boolean
  hasPin: boolean
  amountsHidden: boolean
  toggleAmounts: () => void
  lock: () => void
  savePinAndLock: (pin: string) => Promise<void>
  tryUnlock: (pin: string) => Promise<boolean>
}

const ScreenLockContext = createContext<ScreenLockValue | null>(null)

export function ScreenLockProvider({ children }: { children: ReactNode }) {
  const [locked, setLocked] = useState(false)
  const [hasPin, setHasPin] = useState(() => Boolean(localStorage.getItem(PIN_KEY)))
  const [amountsHidden, setAmountsHidden] = useState(false)

  const lock = useCallback(() => {
    if (!localStorage.getItem(PIN_KEY)) return
    setLocked(true)
  }, [])

  const savePinAndLock = useCallback(async (pin: string) => {
    localStorage.setItem(PIN_KEY, await hashPin(pin))
    setHasPin(true)
    setLocked(true)
  }, [])

  const tryUnlock = useCallback(async (pin: string) => {
    const saved = localStorage.getItem(PIN_KEY)
    if (!saved || (await hashPin(pin)) !== saved) return false
    setLocked(false)
    return true
  }, [])

  const value = useMemo(
    () => ({
      locked,
      hasPin,
      amountsHidden,
      toggleAmounts: () => setAmountsHidden((v) => !v),
      lock,
      savePinAndLock,
      tryUnlock,
    }),
    [locked, hasPin, amountsHidden, lock, savePinAndLock, tryUnlock],
  )

  return <ScreenLockContext.Provider value={value}>{children}</ScreenLockContext.Provider>
}

export function useScreenLock() {
  const ctx = useContext(ScreenLockContext)
  if (!ctx) throw new Error('useScreenLock must be used within ScreenLockProvider')
  return ctx
}
