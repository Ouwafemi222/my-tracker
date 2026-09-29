import { useRef, useState } from 'react'
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
  const v2FileRef = useRef<HTMLInputElement>(null)
  const v1FileRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null,
  )

  function downloadBackup() {
    const json = exportBackup()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gratitude-expenses-v2-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMessage({ type: 'ok', text: 'Version 2 backup downloaded (transactions + settings).' })
  }

  function restoreV2(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      const ok = window.confirm(
        'Restore will replace all Version 2 transactions and settings in this browser. Continue?',
      )
      if (!ok) return
      const result = importBackupV2(String(reader.result ?? ''))
      if (!result.ok) {
        setMessage({ type: 'err', text: result.error })
        return
      }
      setMessage({ type: 'ok', text: 'Version 2 backup restored.' })
    }
    reader.readAsText(file)
  }

  function importV1(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      const ok = window.confirm(
        'Import Version 1 backup into Version 2 storage? This replaces current Version 2 transactions (settings are kept).',
      )
      if (!ok) return
      const result = importBackupV1(String(reader.result ?? ''))
      if (!result.ok) {
        setMessage({ type: 'err', text: result.error })
        return
      }
      setMessage({ type: 'ok', text: 'Version 1 backup imported into Version 2.' })
    }
    reader.readAsText(file)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Data & backup</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Demo data, JSON backup/restore, and Version 1 migration.
        </p>
      </div>

      {message ? (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            message.type === 'ok'
              ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100'
              : 'bg-rose-50 text-rose-900 dark:bg-rose-950 dark:text-rose-100'
          }`}
        >
          {message.text}
        </p>
      ) : null}

      <section className="space-y-3 rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
        <h3 className="font-semibold text-slate-900 dark:text-white">Optional demo data</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Sample day: ₦50,000 earned, ₦5,000 other received, ₦12,000 expense, plus an internal
          transfer that does not affect totals.
        </p>
        <button
          type="button"
          disabled={transactions.length > 0}
          onClick={() => {
            if (transactions.length > 0) return
            if (window.confirm('Load demo data?')) {
              loadDemoData()
              setMessage({ type: 'ok', text: 'Demo data loaded.' })
            }
          }}
          className="rounded-lg border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-700 enabled:hover:bg-emerald-50 disabled:opacity-50 dark:text-emerald-400 dark:enabled:hover:bg-emerald-950"
        >
          Load optional demo data
        </button>
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
        <h3 className="font-semibold text-slate-900 dark:text-white">JSON backup (Version 2)</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Includes transactions and settings (budget, theme). Validated before restore.
        </p>
        <button
          type="button"
          onClick={downloadBackup}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Download JSON backup
        </button>
        <input
          ref={v2FileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) restoreV2(f)
            e.target.value = ''
          }}
        />
        <button
          type="button"
          onClick={() => v2FileRef.current?.click()}
          className="ml-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-600"
        >
          Restore Version 2 backup
        </button>
      </section>

      <section className="space-y-3 rounded-2xl border border-indigo-200 bg-indigo-50/40 p-5 dark:border-indigo-900 dark:bg-indigo-950/20">
        <h3 className="font-semibold text-indigo-950 dark:text-indigo-200">
          Import Version 1 backup
        </h3>
        <p className="text-sm text-indigo-900 dark:text-indigo-300">
          After switching from the <code className="rounded bg-white/50 px-1">version-1</code>{' '}
          branch, export a JSON backup there and import it here deliberately.
        </p>
        <input
          ref={v1FileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) importV1(f)
            e.target.value = ''
          }}
        />
        <button
          type="button"
          onClick={() => v1FileRef.current?.click()}
          className="rounded-lg border border-indigo-600 px-4 py-2 text-sm font-semibold text-indigo-800 dark:text-indigo-300"
        >
          Import Version 1 JSON backup
        </button>
      </section>

      <section className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5 dark:border-rose-900 dark:bg-rose-950/20">
        <h3 className="font-semibold text-rose-900 dark:text-rose-200">Clear Version 2 data</h3>
        <button
          type="button"
          onClick={() => {
            if (
              window.confirm(
                'Delete all Version 2 transactions? Export a backup first. Settings remain unless restored.',
              )
            ) {
              clearAll()
              setMessage({ type: 'ok', text: 'Transactions cleared.' })
            }
          }}
          className="mt-2 rounded-lg border border-rose-300 px-4 py-2 text-sm font-medium text-rose-800"
        >
          Clear all transactions ({transactions.length})
        </button>
      </section>
    </div>
  )
}
