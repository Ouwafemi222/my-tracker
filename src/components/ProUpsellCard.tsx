import { isSimpleApp } from '../config/appVariant'
import { UpgradeToProButton } from './UpgradeToProButton'

const PRO_FEATURES = [
  'Daily, weekly, monthly & custom summaries',
  'Income vs spending charts',
  'Spending by category',
  'Monthly budget with overspend alerts',
  'CSV export of your activity',
]

export function ProUpsellCard() {
  if (!isSimpleApp()) return null

  return (
    <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-emerald-700 p-6 text-white shadow-xl sm:p-8">
      <p className="text-xs font-bold uppercase tracking-widest text-white/80">My Tracker Pro</p>
      <h3 className="mt-2 text-xl font-bold sm:text-2xl">
        Personal Finance Gratitude Expenses Pro
      </h3>
      <p className="mt-2 max-w-lg text-sm text-white/90">
        Unlock the full experience — visual insights, budgets, and exports. Same account works on
        Pro after you upgrade.
      </p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {PRO_FEATURES.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-white/95">
            <span className="mt-0.5 text-emerald-200" aria-hidden>
              ✓
            </span>
            {f}
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <UpgradeToProButton />
      </div>
    </section>
  )
}
