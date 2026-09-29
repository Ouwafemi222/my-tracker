import { useRef, useState } from 'react'
import { useTransactions } from '../context/TransactionContext'

export function DataPage() {
  const { transactions, loadDemoData, clearAll, exportBackup, importBackup } =
    useTransactions()
  const fileRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null,
  )

  function downloadBackup() {
    const json = exportBackup()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gratitude-expenses-v1-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMessage({ type: 'ok', text: 'Backup downloaded.' })
  }

  function handleImportFile(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? '')
      const ok = window.confirm(
        'Import will replace all current transactions in this browser with the backup. Continue?',
      )
      if (!ok) return
      const result = importBackup(text)
      if (!result.ok) {
        setMessage({ type: 'err', text: result.error })
        return
      }
      setMessage({ type: 'ok', text: 'Backup restored successfully.' })
    }
    reader.readAsText(file)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Data & backup</h2>
        <p className="mt-1 text-sm text-slate-600">
          Optional demo data, export, and restore for Version 1 storage.
        </p>
      </div>

      {message ? (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            message.type === 'ok'
              ? 'bg-emerald-50 text-emerald-900'
              : 'bg-rose-50 text-rose-900'
          }`}
        >
          {message.text}
        </p>
      ) : null}

      <section className="space-y-3 rounded-2xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-900">Optional demo data</h3>
        <p className="text-sm text-slate-600">
          Loads sample transactions for today including ₦50,000 earned income, ₦5,000
          other received, ₦12,000 expense, and an internal transfer that does not affect
          totals.
        </p>
        <button
          type="button"
          disabled={transactions.length > 0}
          onClick={() => {
            if (transactions.length > 0) return
            const ok = window.confirm('Load demo data? You can clear it later.')
            if (ok) {
              loadDemoData()
              setMessage({ type: 'ok', text: 'Demo data loaded.' })
            }
          }}
          className="rounded-lg border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-700 enabled:hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Load optional demo data
        </button>
        {transactions.length > 0 ? (
          <p className="text-xs text-slate-500">
            Demo loader is disabled while you have records. Clear data first if you need
            a fresh demo set.
          </p>
        ) : null}
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-900">JSON backup (Version 1)</h3>
        <p className="text-sm text-slate-600">
          Export all transactions. Version 2 can import this file deliberately when you
          switch branches and open the upgraded app.
        </p>
        <button
          type="button"
          onClick={downloadBackup}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Download JSON backup
        </button>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleImportFile(f)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Restore from JSON backup
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5">
        <h3 className="font-semibold text-rose-900">Clear all data</h3>
        <p className="mt-1 text-sm text-rose-800">
          Removes every transaction from this browser ({transactions.length} currently).
        </p>
        <button
          type="button"
          onClick={() => {
            if (
              window.confirm(
                'Delete all transactions from this browser? Export a backup first if needed.',
              )
            ) {
              clearAll()
              setMessage({ type: 'ok', text: 'All transactions cleared.' })
            }
          }}
          className="mt-3 rounded-lg border border-rose-300 px-4 py-2 text-sm font-medium text-rose-800 hover:bg-white"
        >
          Clear all transactions
        </button>
      </section>
    </div>
  )
}
