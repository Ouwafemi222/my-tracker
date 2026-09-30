import { useRef, useState } from 'react'
import { ChatGptImportSection } from '../components/ChatGptImportSection'
import { useTransactions } from '../context/TransactionContext'

export function DataPage() {
  const {
    transactions,
    loadDemoData,
    clearAll,
    exportBackup,
    importBackupV2,
    importBackupV1,
  } = useTransactions()
  const backupFileRef = useRef<HTMLInputElement>(null)
  const legacyFileRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null,
  )

  function downloadBackup() {
    const json = exportBackup()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gratitude-expenses-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMessage({ type: 'ok', text: 'Backup saved to your downloads folder.' })
  }

  function restoreBackup(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      const ok = window.confirm(
        'Restore will replace your current transactions and preferences. Continue?',
      )
      if (!ok) return
      const result = importBackupV2(String(reader.result ?? ''))
      if (!result.ok) {
        setMessage({ type: 'err', text: result.error })
        return
      }
      setMessage({ type: 'ok', text: 'Your data was restored successfully.' })
    }
    reader.readAsText(file)
  }

  function importLegacy(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      const ok = window.confirm(
        'Import this archive? Your current transaction list will be replaced.',
      )
      if (!ok) return
      const result = importBackupV1(String(reader.result ?? ''))
      if (!result.ok) {
        setMessage({ type: 'err', text: result.error })
        return
      }
      setMessage({ type: 'ok', text: 'Archive imported successfully.' })
    }
    reader.readAsText(file)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Settings
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Back up your records, restore from a file, or reset your activity.
        </p>
      </div>

      {message ? (
        <p
          className={`rounded-xl px-4 py-3 text-sm ${
            message.type === 'ok'
              ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100'
              : 'bg-rose-50 text-rose-900 dark:bg-rose-950 dark:text-rose-100'
          }`}
        >
          {message.text}
        </p>
      ) : null}

      <ChatGptImportSection />

      {transactions.length === 0 ? (
        <section className="glass-card space-y-3 rounded-2xl p-6 ring-1 ring-slate-200/80 dark:ring-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white">New here?</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Load a week of sample salary, shopping, and transfers to explore charts and summaries.
          </p>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Add sample transactions for today?')) {
                loadDemoData()
                setMessage({ type: 'ok', text: 'Sample activity added.' })
              }
            }}
            className="rounded-full border border-emerald-600 px-5 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950"
          >
            Try sample activity
          </button>
        </section>
      ) : null}

      <section className="glass-card space-y-4 rounded-2xl p-6 ring-1 ring-slate-200/80 dark:ring-slate-700">
        <h3 className="font-semibold text-slate-900 dark:text-white">Backup & restore</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Download a secure copy of your transactions and preferences. You can restore it on any
          browser.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={downloadBackup}
            className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Download backup
          </button>
          <input
            ref={backupFileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) restoreBackup(f)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            onClick={() => backupFileRef.current?.click()}
            className="rounded-full border border-slate-300 px-5 py-2 text-sm font-medium hover:bg-white dark:border-slate-600 dark:hover:bg-slate-800"
          >
            Restore from file
          </button>
        </div>
      </section>

      <section className="glass-card space-y-3 rounded-2xl p-6 ring-1 ring-slate-200/80 dark:ring-slate-700">
        <h3 className="font-semibold text-slate-900 dark:text-white">Import older archive</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Have a backup from an earlier export? Import it here.
        </p>
        <input
          ref={legacyFileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) importLegacy(f)
            e.target.value = ''
          }}
        />
        <button
          type="button"
          onClick={() => legacyFileRef.current?.click()}
          className="rounded-full border border-slate-300 px-5 py-2 text-sm font-medium dark:border-slate-600"
        >
          Choose file to import
        </button>
      </section>

      <section className="rounded-2xl border border-rose-200/80 bg-rose-50/60 p-6 dark:border-rose-900 dark:bg-rose-950/30">
        <h3 className="font-semibold text-rose-900 dark:text-rose-200">Reset activity</h3>
        <p className="mt-1 text-sm text-rose-800/90 dark:text-rose-300/90">
          Removes all {transactions.length} transactions. Download a backup first if you may need
          them later.
        </p>
        <button
          type="button"
          onClick={() => {
            if (
              window.confirm(
                'Delete all transactions? This cannot be undone unless you have a backup.',
              )
            ) {
              clearAll()
              setMessage({ type: 'ok', text: 'All transactions were removed.' })
            }
          }}
          className="mt-4 rounded-full border border-rose-300 px-5 py-2 text-sm font-medium text-rose-800 hover:bg-white dark:border-rose-800 dark:text-rose-200"
        >
          Clear all transactions
        </button>
      </section>
    </div>
  )
}
