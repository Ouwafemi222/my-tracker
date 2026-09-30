import { useState } from 'react'
import { useBankBalances } from '../context/BankBalanceContext'
import { useTransactions } from '../context/TransactionContext'
import {
  GMAIL_ACCOUNT,
  disconnectGmail,
  ensureGmailAccess,
  fetchTodayGmailTransactions,
  gmailIsConnected,
} from '../services/gmailImport'

export function GmailConnectSection() {
  const { addTransaction } = useTransactions()
  const { setMailedBalance } = useBankBalances()
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? ''
  const [busy, setBusy] = useState(false)
  const [connected, setConnected] = useState(() => gmailIsConnected())
  const [note, setNote] = useState<string | null>(null)

  async function pullMail() {
    if (!clientId) return
    setBusy(true)
    setNote(null)
    try {
      let token = await ensureGmailAccess(clientId)
      setConnected(true)
      let fetched
      try {
        fetched = await fetchTodayGmailTransactions(token)
      } catch (error) {
        if (!(error instanceof Error) || error.message !== 'Gmail access expired') throw error
        token = await ensureGmailAccess(clientId)
        fetched = await fetchTodayGmailTransactions(token)
      }
      for (const row of fetched.rows) addTransaction(row.transaction)
      for (const item of fetched.balances) {
        setMailedBalance(item.bankId, item.amountKobo, item.occurredAt)
      }
      const balanceCount = new Set(fetched.balances.map((item) => item.bankId)).size
      setNote(
        [
          fetched.rows.length
            ? `Added ${fetched.rows.length} transaction${fetched.rows.length === 1 ? '' : 's'} from today's mail.`
            : 'No new transactions in today’s mail.',
          balanceCount
            ? `Updated the balance on ${balanceCount} bank${balanceCount === 1 ? '' : 's'} from the newest alert.`
            : 'No account balance was written in those emails.',
        ].join(' '),
      )
    } catch (error) {
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
          Pull every transfer alert from today for OPay, PalmPay, GTBank, Wema, Premium Bank, Kuda,
          and Grey in <strong>{GMAIL_ACCOUNT}</strong>. Approve Google once. After that, signing
          in to this ledger does not open Google again.
        </p>
      </div>

      {note ? <p className="text-sm text-emerald-800 dark:text-emerald-300">{note}</p> : null}

      {clientId ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => void pullMail()}
            className="rounded-full bg-[#1a3a2f] px-5 py-2 text-sm font-semibold text-[#f7f4ee] disabled:opacity-60"
          >
            {busy ? 'Checking Gmail…' : connected ? 'Fetch today’s mail' : 'Connect Gmail once'}
          </button>
          {connected ? (
            <button
              type="button"
              onClick={() => {
                disconnectGmail()
                setConnected(false)
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
