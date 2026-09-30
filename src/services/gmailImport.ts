import { balanceLine, grabField, minorFromBalanceText, packAlert } from '../utils/alertDetails'
import { canonicalBankLabel, bankFromAccount } from '../utils/banks'
import { parseNairaToKobo } from '../utils/money'
import type { Transaction, TransactionType } from '../types/transaction'

export const GMAIL_ACCOUNT = 'oluwafemipeter14@gmail.com'
const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly'
const SEEN_KEY = 'gratitude-gmail-seen'
const TOKEN_KEY = 'gratitude-gmail-token'
const GRANTED_KEY = 'gratitude-gmail-granted'

interface TokenResponse {
  access_token?: string
  error?: string
  expires_in?: number
}

interface GmailList {
  messages?: { id: string }[]
  nextPageToken?: string
}

interface GmailMessage {
  id: string
  internalDate?: string
  snippet?: string
  payload?: {
    mimeType?: string
    body?: { data?: string }
    headers?: { name: string; value: string }[]
    parts?: GmailMessage['payload'][]
  }
}

function loadGis(): Promise<void> {
  const existing = window.google?.accounts?.oauth2
  if (existing) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Could not load Google sign-in'))
    document.head.appendChild(script)
  })
}

interface StoredGmailToken {
  accessToken: string
  expiresAt: number
}

export function gmailIsConnected(): boolean {
  return localStorage.getItem(GRANTED_KEY) === '1'
}

export function disconnectGmail() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(GRANTED_KEY)
}

function readStoredToken(): string | null {
  try {
    const raw = JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null') as StoredGmailToken | null
    if (!raw?.accessToken || raw.expiresAt < Date.now() + 60_000) return null
    return raw.accessToken
  } catch {
    return null
  }
}

function saveToken(accessToken: string, expiresIn?: number) {
  const ttlMs = Math.max((expiresIn ?? 3600) - 60, 60) * 1000
  const stored: StoredGmailToken = { accessToken, expiresAt: Date.now() + ttlMs }
  localStorage.setItem(TOKEN_KEY, JSON.stringify(stored))
  localStorage.setItem(GRANTED_KEY, '1')
}

function requestToken(clientId: string, consent: boolean): Promise<string> {
  return loadGis().then(
    () =>
      new Promise((resolve, reject) => {
        const client = window.google!.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: GMAIL_SCOPE,
          hint: GMAIL_ACCOUNT,
          callback: (response: TokenResponse) => {
            if (response.access_token) {
              saveToken(response.access_token, response.expires_in)
              resolve(response.access_token)
            } else reject(new Error(response.error || 'Google did not grant access'))
          },
        })
        client.requestAccessToken(consent ? { prompt: 'consent' } : { prompt: '' })
      }),
  )
}

/** Reuses the saved Google access. Opens the consent screen only the first time. */
export function ensureGmailAccess(clientId: string): Promise<string> {
  const existing = readStoredToken()
  if (existing) return Promise.resolve(existing)
  if (!gmailIsConnected()) return requestToken(clientId, true)
  return requestToken(clientId, false).catch(() => requestToken(clientId, true))
}

function decodeBody(data: string): string {
  const padded = data.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function collectText(part: GmailMessage['payload'] | undefined, chunks: string[]) {
  if (!part) return
  if (part.body?.data && (part.mimeType === 'text/plain' || part.mimeType === 'text/html')) {
    chunks.push(decodeBody(part.body.data))
  }
  for (const child of part.parts ?? []) collectText(child, chunks)
}

function header(message: GmailMessage, name: string): string {
  return (
    message.payload?.headers?.find((item) => item.name.toLowerCase() === name.toLowerCase())
      ?.value ?? ''
  )
}

function toPlain(text: string): string {
  return text
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#8358;|&naira;/gi, '₦')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
}

function parseAmount(text: string, currency: 'NGN' | 'USD'): number | null {
  const cleaned = toPlain(text)
  const patterns =
    currency === 'USD'
      ? [/\$\s*([\d,]+(?:\.\d{1,2})?)/, /USD\s*([\d,]+(?:\.\d{1,2})?)/i]
      : [
          /(?:₦|NGN)\s*([\d,]+(?:\.\d{1,2})?)/i,
          /\bN\s*([\d]{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)\b/,
          /(?:debited|credited|transfer(?:red)?|sent|received|paid)\s+(?:with\s+)?(?:₦|NGN|N)?\s*([\d,]+(?:\.\d{1,2})?)/i,
        ]
  for (const pattern of patterns) {
    const match = cleaned.match(pattern)
    if (!match) continue
    const kobo = parseNairaToKobo(match[1].replace(/,/g, ''))
    if (kobo) return kobo
  }
  return null
}

function labeledAmount(text: string, currency: 'NGN' | 'USD'): number | null {
  const match = text.match(
    /(?:credit|debit|transaction)\s+amount[\s\S]{0,48}?(?:₦|NGN|N|\$|USD)?\s*([\d,]+\.\d{2})/i,
  )
  if (!match) return null
  return parseAmount(`${currency === 'USD' ? '$' : '₦'}${match[1]}`, currency)
}

function guessType(text: string): TransactionType {
  if (/\b(debit|debited|sent|paid|payment|spent|withdraw)\b/i.test(text)) return 'expense'
  if (/\b(credit|credited|received|incoming)\b/i.test(text)) return 'other_income'
  return 'expense'
}

function seenIds(): Set<string> {
  try {
    const raw = JSON.parse(localStorage.getItem(SEEN_KEY) || '[]') as string[]
    return new Set(raw)
  } catch {
    return new Set()
  }
}

function remember(ids: string[]) {
  const next = [...seenIds(), ...ids].slice(-400)
  localStorage.setItem(SEEN_KEY, JSON.stringify(next))
}

export interface ParsedGmailRow {
  messageId: string
  transaction: Omit<Transaction, 'id'>
}

export interface MailedBankBalance {
  bankId: string
  amountKobo: number
  occurredAt: string
}

export interface GmailFetchResult {
  rows: ParsedGmailRow[]
  balances: MailedBankBalance[]
}

const BANK_QUERY = [
  'opay',
  'palmpay',
  '"palm pay"',
  'gtbank',
  '"guaranty trust"',
  'wema',
  'alat',
  'kuda',
  'grey',
  'premiumtrust',
  '"premium trust"',
  '"premium bank"',
  '"debit alert"',
  '"credit alert"',
  'transfer',
].join(' OR ')

async function listMessageIds(accessToken: string, query: string): Promise<string[]> {
  const ids: string[] = []
  let pageToken = ''
  do {
    const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages')
    url.searchParams.set('q', query)
    url.searchParams.set('maxResults', '50')
    if (pageToken) url.searchParams.set('pageToken', pageToken)
    const listRes = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
    if (listRes.status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      throw new Error('Gmail access expired')
    }
    if (!listRes.ok) throw new Error('Gmail could not list messages')
    const list = (await listRes.json()) as GmailList
    for (const item of list.messages ?? []) ids.push(item.id)
    pageToken = list.nextPageToken ?? ''
  } while (pageToken && ids.length < 150)
  return ids
}

export async function fetchTodayGmailTransactions(accessToken: string): Promise<GmailFetchResult> {
  const query = `newer_than:14d (${BANK_QUERY})`
  const ids = (await listMessageIds(accessToken, query)).slice(0, 40)
  const seen = seenIds()
  const rows: ParsedGmailRow[] = []
  const balances: MailedBankBalance[] = []
  const freshIds: string[] = []
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos' }).format(new Date())

  for (const id of ids) {
    const already = seen.has(id)
    const messageRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    if (!messageRes.ok) continue
    const message = (await messageRes.json()) as GmailMessage
    const occurredAt = message.internalDate
      ? new Date(Number(message.internalDate)).toISOString()
      : new Date().toISOString()
    const lagosDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos' }).format(
      new Date(occurredAt),
    )

    const chunks: string[] = []
    collectText(message.payload, chunks)
    const subject = header(message, 'subject')
    const from = header(message, 'from')
    const text = toPlain([subject, from, message.snippet ?? '', ...chunks].join('\n'))
    const account = canonicalBankLabel([from, subject, text])
    const bank = account ? bankFromAccount(account) : null
    if (!bank) continue
    const stated = minorFromBalanceText(balanceLine(text))
    if (stated !== null) {
      balances.push({ bankId: bank.id, amountKobo: stated, occurredAt })
    }
    if (already || lagosDay !== today) continue
    const amountKobo = labeledAmount(text, bank.currency) ?? parseAmount(text, bank.currency)
    if (!amountKobo) continue
    const type = guessType(text)
    const sender = grabField(text, ["Sender's Name", 'Sender Name', 'Sender'])
    const recipient = grabField(text, ["Beneficiary's Name", 'Beneficiary', "Recipient's Name", 'Recipient'])
    const narration =
      grabField(text, ['Narration', 'Remark', 'Description']) || subject || 'Bank alert'
    rows.push({
      messageId: message.id,
      transaction: {
        type,
        amountKobo,
        occurredAt,
        category: type === 'expense' ? 'Other expense' : 'Other received',
        account: bank.label,
        counterparty: (sender || recipient).slice(0, 200),
        description: packAlert({
          narration: narration.slice(0, 180),
          accountNumber: grabField(text, ['Account Number', 'Account No', 'A/C Number']).replace(/\D/g, '').slice(0, 12),
          balance: balanceLine(text),
          sender: sender.replace(/^from\s+/i, ''),
          recipient,
        }),
      },
    })
    freshIds.push(message.id)
  }

  remember(freshIds)
  return { rows, balances }
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            hint?: string
            callback: (response: TokenResponse) => void
          }) => { requestAccessToken: (override?: { prompt?: string }) => void }
        }
      }
    }
  }
}
