export type BankCurrency = 'NGN' | 'USD'

export interface BankAccount {
  id: string
  label: string
  currency: BankCurrency
  aliases: string[]
}

export const BANKS: BankAccount[] = [
  { id: 'opay', label: 'OPay', currency: 'NGN', aliases: ['opay', 'o pay'] },
  { id: 'palmpay', label: 'PalmPay', currency: 'NGN', aliases: ['palmpay', 'palm pay', 'palmpay'] },
  { id: 'gtbank', label: 'GTBank', currency: 'NGN', aliases: ['gtbank', 'gt bank', 'guaranty trust'] },
  { id: 'wema', label: 'Wema', currency: 'NGN', aliases: ['wema', 'wema bank'] },
  { id: 'premium', label: 'Premium Bank', currency: 'NGN', aliases: ['premium', 'premium bank', 'premiumtrust'] },
  { id: 'kuda', label: 'Kuda', currency: 'NGN', aliases: ['kuda'] },
  { id: 'grey', label: 'Grey', currency: 'USD', aliases: ['grey', 'gray', 'grey usd'] },
]

/** Turn "opay", "Palm Pay", or a note that names a bank into the label used on the ledger. */
export function canonicalBankLabel(parts: string[]): string {
  const blobs = parts
    .map((part) => part.trim().toLowerCase().replace(/[_-]+/g, ' '))
    .filter(Boolean)
  for (const blob of blobs) {
    const hit = BANKS.find(
      (bank) =>
        bank.label.toLowerCase() === blob || bank.aliases.some((alias) => blob.includes(alias)),
    )
    if (hit) return hit.label
  }
  return parts.find((part) => part.trim())?.trim().slice(0, 120) || ''
}

export function bankFromAccount(account: string): BankAccount | null {
  const key = account.trim().toLowerCase().replace(/[_-]+/g, ' ')
  if (!key) return null
  return (
    BANKS.find(
      (bank) => bank.label.toLowerCase() === key || bank.aliases.some((alias) => key.includes(alias)),
    ) ?? null
  )
}

export function filterTransactionsByBank<T extends { account: string }>(
  transactions: T[],
  bankId: string,
): T[] {
  if (bankId === 'all') {
    return transactions.filter((t) => bankFromAccount(t.account)?.currency !== 'USD')
  }
  return transactions.filter((t) => bankFromAccount(t.account)?.id === bankId)
}

export function formatMinorAmount(amount: number, currency: BankCurrency): string {
  const sign = amount < 0 ? '-' : ''
  const abs = Math.abs(amount)
  const major = Math.floor(abs / 100)
  const frac = (abs % 100).toString().padStart(2, '0')
  if (currency === 'USD') {
    return `${sign}$${major.toLocaleString('en-US')}.${frac}`
  }
  return `${sign}₦${major.toLocaleString('en-NG')}.${frac}`
}
