import { useState } from 'react'
import { useBankBalances } from '../context/BankBalanceContext'
import { useTransactions } from '../context/TransactionContext'
import {
  GMAIL_ACCOUNT,
  GMAIL_LOOKBACK_DAYS,
  disconnectGmail,
  ensureGmailAccess,
  fetchTodayGmailTransactions,
  gmailIsConnected,
  markGmailMessagesSaved,
  type GmailFetchResult,
} from '../services/gmailImport'

function summarizeFetch(fetched: GmailFetchResult): string {
  const days = GMAIL_LOOKBACK_DAYS
  const added =
    fetched.rows.length > 0
      ? `Added ${fetched.rows.length} transaction${fetched.rows.length === 1 ? '' : 's'} from the last ${days} days.`
      : fetched.scanned === 0
        ? `No bank emails were found in the last ${days} days on this Google account.`
        : fetched.alreadySaved > 0 && fetched.unreadable === 0
          ? `Checked ${fetched.scanned} bank emails. Nothing new to add. They are already saved.`
          : `Checked ${fetched.scanned} bank emails from the last ${days} days and could not read a new debit or credit from them.`
  const balanceCount = new Set(fetched.balances.map((item) => item.bankId)).size
  const balances = balanceCount
    ? `Updated the balance on ${balanceCount} bank${balanceCount === 1 ? '' : 's'}.`
    : ''
  const missed =
    fetched.failed > 0 ? `${fetched.failed} email${fetched.failed === 1 ? '' : 's'} could not be opened.` : ''
  return [added, balances, missed].filter(Boolean).join(' ')
}

export function GmailConnectSection() {
  const { addTransaction } = useTransactions()
  const { setMailedBalance } = useBankBalances()
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? ''
  const [busy, setBusy] = useState(false)
  const [connected, setConnected] = useState(() => gmailIsConnected())
  const [note, setNote] = useState<string | null>(null)
  const [noteTone, setNoteTone] = useState<'progress' | 'ok' | 'warn' | 'err'>('progress')

  async function pullMail() {
    if (!clientId) return
    setBusy(true)
    setNote(null)
    try {
      let token = await ensureGmailAccess(clientId)
      setConnected(true)
      const report = (message: string) => {
        setNoteTone('progress')
        setNote(message)
      }
      let fetched
      try {
        fetched = await fetchTodayGmailTransactions(token, report)
      } catch (error) {
        if (!(error instanceof Error) || error.message !== 'Gmail access expired') throw error
        token = await ensureGmailAccess(clientId)
        fetched = await fetchTodayGmailTransactions(token, report)
      }
      for (const row of fetched.rows) addTransaction(row.transaction)
      markGmailMessagesSaved(fetched.rows.map((row) => row.messageId))
      for (const item of fetched.balances) {
        setMailedBalance(item.bankId, item.amountKobo, item.occurredAt)
      }
      setNoteTone(fetched.rows.length > 0 ? 'ok' : 'warn')
      setNote(summarizeFetch(fetched))
    } catch (error) {
      setNoteTone('err')
      setNote(error instanceof Error ? error.message : 'Gmail import failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="glass-card space-y-4 rounded-2xl p-6 ring-1 ring-[#c5d6c8]">
      <div>
        <h3 className="font-semibold text-slate-900 dark:text-white">Gmail</h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Pull credit and debit alerts from OPay, PalmPay, GTBank, Wema, Premium Bank, Kuda,
          Moniepoint, Grey, and Rainest (USDT) in <strong>{GMAIL_ACCOUNT}</strong>. This reads the
          last {GMAIL_LOOKBACK_DAYS} days, including alerts that arrived on earlier days. Approve
          Google once. After that, signing in to this ledger does not open Google again.
        </p>
      </div>

      {note ? (
        <p
          className={`text-sm ${
            noteTone === 'ok'
              ? 'text-emerald-800 dark:text-emerald-300'
              : noteTone === 'err'
                ? 'text-rose-800 dark:text-rose-300'
                : noteTone === 'warn'
                  ? 'text-amber-900 dark:text-amber-200'
                  : 'text-slate-600 dark:text-slate-300'
          }`}
        >
          {note}
        </p>
      ) : null}

      {clientId ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => void pullMail()}
            className="rounded-full bg-[#1a3a2f] px-5 py-2 text-sm font-semibold text-[#f7f4ee] disabled:opacity-60"
          >
            {busy ? 'Fetching mail…' : connected ? 'Fetch recent mail' : 'Connect Gmail once'}
          </button>
          {connected ? (
            <button
              type="button"
              onClick={() => {
                disconnectGmail()
                setConnected(false)
                setNoteTone('progress')
                setNote('Gmail disconnected on this browser.')
              }}
              className="text-sm text-slate-600 underline dark:text-slate-400"
            >
              Disconnect
            </button>
          ) : null}
        </div>
      ) : (
        <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-600 dark:text-slate-400">
          <li>In Google Cloud, enable the Gmail API.</li>
          <li>
            OAuth consent screen: add <strong>{GMAIL_ACCOUNT}</strong> as a test user. Scope:{' '}
            <code>gmail.readonly</code>.
          </li>
          <li>
            Create an OAuth client ID (Web). JavaScript origins:{' '}
            <code>http://localhost:5173</code>, <code>http://localhost:5174</code>, and your Vercel
            URL.
          </li>
          <li>
            Put that client ID in <code>VITE_GOOGLE_CLIENT_ID</code>, then restart{' '}
            <code>npm run dev</code>.
          </li>
        </ol>
      )}
    </section>
  )
}
