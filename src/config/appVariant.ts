export type AppVariant = 'simple' | 'pro'

export function getAppVariant(): AppVariant {
  const raw = import.meta.env.VITE_APP_VARIANT?.trim().toLowerCase()
  return raw === 'simple' ? 'simple' : 'pro'
}

export function isProApp(): boolean {
  return getAppVariant() === 'pro'
}

export function isSimpleApp(): boolean {
  return getAppVariant() === 'simple'
}

/** Full URL of the Pro deployment (simple site only). */
export function getProAppUrl(): string | null {
  const url = import.meta.env.VITE_PRO_APP_URL?.trim()
  if (!url) return null
  return url.replace(/\/$/, '')
}

export function getAppBranding() {
  if (isProApp()) {
    return {
      shortName: 'Gratitude Expenses Pro',
      fullName: 'Personal Finance Gratitude Expenses Pro',
      tagline: 'Charts, budgets, and deep insights',
      documentTitle: 'Personal Finance Gratitude Expenses Pro',
    }
  }
  return {
    shortName: 'Gratitude Expenses',
    fullName: 'Gratitude Expenses',
    tagline: 'Simple cash-flow tracking in naira',
    documentTitle: 'Gratitude Expenses',
  }
}
