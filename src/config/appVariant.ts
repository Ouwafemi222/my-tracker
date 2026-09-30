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
      shortName: 'Gratitude',
      fullName: 'My naira ledger',
      tagline: 'Private cash flow, just for me',
      documentTitle: 'Gratitude',
    }
  }
  return {
    shortName: 'Gratitude',
    fullName: 'My naira ledger',
    tagline: 'Private cash flow, just for me',
    documentTitle: 'Gratitude',
  }
}
