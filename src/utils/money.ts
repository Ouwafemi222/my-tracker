/** Parse user-entered naira string to integer kobo. Returns null if invalid. */
export function parseNairaToKobo(input: string): number | null {
  const n = parseNairaToKoboAllowZero(input)
  if (n === null || n <= 0) return null
  return n
}

/** Like parseNairaToKobo but allows zero (e.g. budgets). */
export function parseNairaToKoboAllowZero(input: string): number | null {
  const trimmed = input.trim().replace(/,/g, '')
  if (!trimmed || !/^\d+(\.\d{1,2})?$/.test(trimmed)) return null
  const [whole, frac = ''] = trimmed.split('.')
  const koboFromFrac = (frac + '00').slice(0, 2)
  const kobo = BigInt(whole) * 100n + BigInt(koboFromFrac)
  if (kobo > BigInt(Number.MAX_SAFE_INTEGER)) return null
  return Number(kobo)
}

export function formatKoboAsNaira(kobo: number): string {
  const sign = kobo < 0 ? '-' : ''
  const abs = Math.abs(kobo)
  const naira = Math.floor(abs / 100)
  const remainder = abs % 100
  const frac = remainder.toString().padStart(2, '0')
  return `${sign}₦${naira.toLocaleString('en-NG')}.${frac}`
}

export function nairaInputFromKobo(kobo: number): string {
  const naira = kobo / 100
  return naira.toFixed(2)
}
