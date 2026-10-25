import { balanceLine, grabField, minorFromBalanceText, packAlert } from '../utils/alertDetails'
import { BANKS, type BankAccount } from '../utils/banks'
import { parseNairaToKobo } from '../utils/money'
import type { Transaction, TransactionType } from '../types/transaction'

export const GMAIL_ACCOUNT = 'oluwafemipeter14@gmail.com'
export const GMAIL_LOOKBACK_DAYS = 45
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
  const mime = part.mimeType?.split(';')[0]?.trim().toLowerCase()
  if (part.body?.data && (mime === 'text/plain' || mime === 'text/html')) {
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
    .replace(/<img\b[^>]*\balt=["']([^"']+)["'][^>]*>/gi, ' $1 ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h[1-6]|table)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x20a6;|&#8358;|&naira;/gi, '₦')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim()
}

const AMBIGUOUS_ALIASES = new Set(['usdt', 'grey', 'gray', 'o pay'])

function aliasHits(text: string, alias: string): boolean {
  const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`, 'i').test(text)
}

function matchBank(text: string, allowAmbiguous: boolean): BankAccount | null {
  for (const bank of BANKS) {
    for (const alias of bank.aliases) {
      if (!allowAmbiguous && AMBIGUOUS_ALIASES.has(alias)) continue
      if (aliasHits(text, alias)) return bank
    }
  }
  return null
}

function detectBank(from: string, subject: string, text: string): BankAccount | null {
  return matchBank(from, true) ?? matchBank(subject, true) ?? matchBank(text, false)
}

function stripBalances(text: string): string {
  return text.replace(
    /(?:account|available|wallet|current|new|ledger|closing|opening)?\s*bal(?:ance)?\s*[:\-|]?\s*(?:₦|NGN|N|\$|USD|USDT)?\s*[\d,]+(?:\.\d{1,2})?/gi,
    ' ',
  )
}

function withoutBoilerplate(text: string): string {
  return text
    .replace(/credit\s*(?:\/|or)\s*debit/gi, ' ')
    .replace(/debit\s*(?:\/|or)\s*credit/gi, ' ')
    .replace(/not a (?:credit|debit)/gi, ' ')
    .replace(/if you (?:did not |didn't )?(?:receive|received) this/gi, ' ')
}

function koboOf(raw: string | undefined): number | null {
  if (!raw) return null
  return parseNairaToKobo(raw.replace(/,/g, ''))
}

function firstKobo(text: string, pattern: RegExp): number | null {
  return koboOf(text.match(pattern)?.[1])
}

const MONEY = String.raw`(?:₦|NGN|N|\$|USD|USDT)?\s*([\d,]+\.\d{2})`

function explicitDirection(text: string): TransactionType | null {
  const debit = /\b(?:debit(?:\s+alert|\s+transaction)?|debited|money\s+out)\b/i.test(text)
  const credit = /\b(?:credit(?:\s+alert|\s+transaction)?|credited|money\s+in)\b/i.test(text)
  if (debit && !credit) return 'expense'
  if (credit && !debit) return 'other_income'
  return null
}

function layoutDirection(text: string): TransactionType | null {
  const hits = [...text.matchAll(/(debit|credit)\b[\s\S]{0,80}?(?:₦|NGN|N|\$|USD|USDT)?\s*([\d,]+\.\d{2})/gi)]
  let debit = false
  let credit = false
  for (const hit of hits) {
    const amount = koboOf(hit[2])
    if (!amount) continue
    if (hit[1].toLowerCase() === 'debit') debit = true
    else credit = true
  }
  if (debit && !credit) return 'expense'
  if (credit && !debit) return 'other_income'
  return null
}

function guessType(subject: string, text: string): TransactionType {
  const subjectDir = explicitDirection(withoutBoilerplate(subject))
  if (subjectDir) return subjectDir

  const body = withoutBoilerplate(toPlain(text))
  const typed = body.match(/transaction\s*type\s*[:\-]?\s*(debit|credit|dr|cr)\b/i)
  if (typed) return /^d/i.test(typed[1]) ? 'expense' : 'other_income'
  const layout = layoutDirection(body)
  if (layout) return layout
  if (/(?:₦|NGN|N|\$)?\s*[\d,]+\.\d{2}\s*DR\b|\bDR\s*[:\-]\s*(?:₦|NGN|N|\$)?\s*[\d,]+\.\d{2}/i.test(body)) {
    return 'expense'
  }
  if (/(?:₦|NGN|N|\$)?\s*[\d,]+\.\d{2}\s*CR\b|\bCR\s*[:\-]\s*(?:₦|NGN|N|\$)?\s*[\d,]+\.\d{2}/i.test(body)) {
    return 'other_income'
  }
  const head = body.slice(0, 900)
  if (/\b(sent|paid|payment|spent|withdraw|purchase|airtime|pos)\b/i.test(head)) return 'expense'
  if (/\b(received|incoming)\b/i.test(head)) return 'other_income'
  return 'expense'
}

function currencyAmounts(text: string): { kobo: number; index: number }[] {
  const found: { kobo: number; index: number }[] = []
  const re = /(?:₦|NGN|\$|USD|USDT)\s*([\d,]+(?:\.\d{1,2})?)|\bN\s*([\d,]+\.\d{2})\b/gi
  for (const match of text.matchAll(re)) {
    const amount = koboOf(match[1] ?? match[2])
    if (amount) found.push({ kobo: amount, index: match.index ?? 0 })
  }
  return found
}

function pickAmount(text: string, direction: TransactionType, currency: 'NGN' | 'USD'): number | null {
  const plain = stripBalances(withoutBoilerplate(toPlain(text)))
  if (currency === 'USD') {
    const usd =
      firstKobo(plain, /([\d,]+\.\d{2})\s*(?:USD|USDT)\b/i) ??
      firstKobo(plain, /(?:\$|USD|USDT)\s*([\d,]+(?:\.\d{1,2})?)/i)
    if (usd) return usd
  }

  const labeled =
    direction === 'expense'
      ? firstKobo(plain, new RegExp(String.raw`debit(?:\s+alert)?(?:\s+(?:amount|amt))?\s*[:\-]?\s*${MONEY}`, 'i')) ??
        firstKobo(plain, new RegExp(String.raw`(?:amount|amt)\s*(?:debited)?\s*[:\-]\s*${MONEY}`, 'i')) ??
        firstKobo(plain, /(?:₦|NGN|N|\$)?\s*([\d,]+\.\d{2})\s*DR\b/i) ??
        firstKobo(plain, new RegExp(String.raw`\bDR\s*[:\-]?\s*${MONEY}`, 'i'))
      : firstKobo(plain, new RegExp(String.raw`credit(?:\s+alert)?(?:\s+(?:amount|amt))?\s*[:\-]?\s*${MONEY}`, 'i')) ??
        firstKobo(plain, new RegExp(String.raw`(?:amount|amt)\s*(?:credited)?\s*[:\-]\s*${MONEY}`, 'i')) ??
        firstKobo(plain, /(?:₦|NGN|N|\$)?\s*([\d,]+\.\d{2})\s*CR\b/i) ??
        firstKobo(plain, /\+\s*(?:₦|NGN|\$|USD|USDT)?\s*([\d,]+\.\d{2})/i)
  if (labeled) return labeled

  const verb = firstKobo(
    plain,
    /(?:debited|credited|transfer(?:red)?|sent|received|paid)(?:\s+(?:with|of|to|from))?\s+(?:₦|NGN|N|\$)?\s*([\d,]+(?:\.\d{1,2})?)/i,
  )
  if (verb) return verb

  const bareLabel = firstKobo(plain, /\b(?:amount|amt)\s*[:\-]\s*([\d,]+\.\d{2})/i)
  if (bareLabel) return bareLabel

  const found = currencyAmounts(plain)
  const word =
    direction === 'expense' ? /\bdebit\b|\bdr\b|\bsent\b|\bpaid\b|\bpayment\b/i : /\bcredit\b|\bcr\b|\breceived\b/i
  const at = word.exec(plain)
  if (at) {
    const after = found.find((item) => item.index >= at.index)
    if (after) return after.kobo
  }
  return found[0]?.kobo ?? null
}

function seenIds(): Set<string> {
  try {
    const raw = JSON.parse(localStorage.getItem(SEEN_KEY) || '[]') as string[]
    return new Set(raw)
  } catch {
    return new Set()
  }
}

export function markGmailMessagesSaved(ids: string[]) {
  if (ids.length === 0) return
  const next = [...seenIds(), ...ids].slice(-3000)
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
  scanned: number
  alreadySaved: number
  unreadable: number
  failed: number
}

export interface ParsedGmailAlert {
  bankId: string
  balanceKobo: number | null
  transaction: Omit<Transaction, 'id'> | null
}

export function alertIsInWindow(occurredAtIso: string, now = new Date()): boolean {
  const at = new Date(occurredAtIso).getTime()
  if (Number.isNaN(at)) return false
  const age = now.getTime() - at
  return age <= GMAIL_LOOKBACK_DAYS * 24 * 60 * 60 * 1000 && age > -6 * 60 * 60 * 1000
}

export function parseGmailAlert(input: {
  from: string
  subject: string
  snippet?: string
  body?: string
  occurredAt: string
}): ParsedGmailAlert | null {
  const text = toPlain([input.subject, input.from, input.snippet ?? '', input.body ?? ''].join('\n'))
  const bank = detectBank(input.from, input.subject, text)
  if (!bank) return null
  const balanceText = balanceLine(text)
  const balanceKobo = minorFromBalanceText(balanceText)
  const type = guessType(input.subject, text)
  const amountKobo = pickAmount(text, type, bank.currency)
  if (!amountKobo) return { bankId: bank.id, balanceKobo, transaction: null }
  const sender = grabField(text, ["Sender's Name", 'Sender Name', 'Sender'])
  const recipient = grabField(text, ["Beneficiary's Name", 'Beneficiary', "Recipient's Name", 'Recipient'])
  const narration = grabField(text, ['Narration', 'Remark', 'Description']) || input.subject || 'Bank alert'
  return {
    bankId: bank.id,
    balanceKobo,
    transaction: {
      type,
      amountKobo,
      occurredAt: input.occurredAt,
      category: type === 'expense' ? 'Other expense' : 'Other received',
      account: bank.label,
      counterparty: (sender || recipient).slice(0, 200),
      description: packAlert({
        narration: narration.slice(0, 180),
        accountNumber: grabField(text, ['Account Number', 'Account No', 'A/C Number'])
          .replace(/\D/g, '')
          .slice(0, 12),
        balance: balanceText,
        sender: sender.replace(/^from\s+/i, ''),
        recipient,
      }),
    },
  }
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
  'moniepoint',
  '"monie point"',
  'rainest',
  'raines',
  'premiumtrust',
  '"premium trust"',
  '"premium bank"',
  'from:grey.co',
  '"debit alert"',
  '"credit alert"',
  '"debit transaction"',
  '"credit transaction"',
  '"transaction notification"',
  '"transaction alert"',
].join(' OR ')

async function listMessageIds(accessToken: string, query: string, limit: number): Promise<string[]> {
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
    if (listRes.status === 403) {
      throw new Error(
        'Gmail refused access. Disconnect, then connect Gmail again so read-only mail access is granted.',
      )
    }
    if (!listRes.ok) throw new Error(`Gmail could not list messages (${listRes.status})`)
    const list = (await listRes.json()) as GmailList
    for (const item of list.messages ?? []) ids.push(item.id)
    pageToken = list.nextPageToken ?? ''
  } while (pageToken && ids.length < limit)
  return ids.slice(0, limit)
}

async function listBankMessageIds(accessToken: string): Promise<string[]> {
  const window = `newer_than:${GMAIL_LOOKBACK_DAYS}d`
  const [debits, credits, banks] = await Promise.all([
    listMessageIds(
      accessToken,
      `${window} ("debit alert" OR "debit transaction" OR "transaction type: debit" OR debited OR "you sent" OR "payment successful")`,
      200,
    ),
    listMessageIds(
      accessToken,
      `${window} ("credit alert" OR "credit transaction" OR "transaction type: credit" OR credited OR "money received")`,
      200,
    ),
    listMessageIds(accessToken, `${window} (${BANK_QUERY})`, 250),
  ])
  return [...new Set([...debits, ...credits, ...banks])].slice(0, 500)
}

function occurredAtOf(message: GmailMessage): string {
  return message.internalDate
    ? new Date(Number(message.internalDate)).toISOString()
    : new Date().toISOString()
}

async function getMessage(accessToken: string, id: string): Promise<GmailMessage | null> {
  const messageRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (messageRes.status === 401) {
    localStorage.removeItem(TOKEN_KEY)
    throw new Error('Gmail access expired')
  }
  if (!messageRes.ok) return null
  return (await messageRes.json()) as GmailMessage
}

async function mapPool<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let cursor = 0
  async function run() {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      results[index] = await worker(items[index])
    }
  }
  const workers = Math.min(limit, items.length)
  if (workers === 0) return []
  await Promise.all(Array.from({ length: workers }, () => run()))
  return results
}

export async function fetchTodayGmailTransactions(
  accessToken: string,
  onProgress?: (message: string) => void,
): Promise<GmailFetchResult> {
  onProgress?.(`Fetching debits and credits from the last ${GMAIL_LOOKBACK_DAYS} days…`)
  const ids = await listBankMessageIds(accessToken)
  const seen = seenIds()
  const rows: ParsedGmailRow[] = []
  const balances: MailedBankBalance[] = []
  let scanned = 0
  let alreadySaved = 0
  let unreadable = 0
  let failed = 0
  let done = 0

  const messages = await mapPool(ids, 6, async (id) => {
    const message = await getMessage(accessToken, id)
    done += 1
    if (done === 1 || done === ids.length || done % 10 === 0) {
      onProgress?.(`Fetching mail… ${done} of ${ids.length}`)
    }
    return message
  })

  for (const message of messages) {
    if (!message) {
      failed += 1
      continue
    }
    scanned += 1
    const occurredAt = occurredAtOf(message)
    if (!alertIsInWindow(occurredAt)) continue
    const chunks: string[] = []
    collectText(message.payload, chunks)
    const parsed = parseGmailAlert({
      from: header(message, 'from'),
      subject: header(message, 'subject'),
      snippet: message.snippet,
      body: chunks.join('\n'),
      occurredAt,
    })
    if (!parsed) {
      unreadable += 1
      continue
    }
    if (parsed.balanceKobo !== null) {
      balances.push({ bankId: parsed.bankId, amountKobo: parsed.balanceKobo, occurredAt })
    }
    if (seen.has(message.id)) {
      alreadySaved += 1
      continue
    }
    if (!parsed.transaction) {
      unreadable += 1
      continue
    }
    rows.push({ messageId: message.id, transaction: parsed.transaction })
  }

  return { rows, balances, scanned, alreadySaved, unreadable, failed }
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
