import { formatKoboAsNaira } from '../utils/money'

interface SummaryCardProps {
  title: string
  amountKobo: number
  subtitle?: string
  highlight?: 'neutral' | 'in' | 'out' | 'net'
}

export function SummaryCard({
  title,
  amountKobo,
  subtitle,
  highlight = 'neutral',
}: SummaryCardProps) {
  const ring =
    highlight === 'net'
      ? 'ring-2 ring-emerald-500/40'
      : highlight === 'in'
        ? 'ring-1 ring-emerald-200 dark:ring-emerald-800'
        : highlight === 'out'
          ? 'ring-1 ring-rose-200 dark:ring-rose-900'
          : 'ring-1 ring-slate-200 dark:ring-slate-700'

  const valueColor =
    highlight === 'net'
      ? amountKobo >= 0
        ? 'text-emerald-700 dark:text-emerald-400'
        : 'text-rose-700 dark:text-rose-400'
      : 'text-slate-900 dark:text-white'

  return (
    <article
      className={`rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900 ${ring}`}
    >
      <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">{title}</h3>
      <p className={`mt-2 text-2xl font-bold tabular-nums ${valueColor}`}>
        {formatKoboAsNaira(amountKobo)}
      </p>
      {subtitle ? (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">{subtitle}</p>
      ) : null}
    </article>
  )
}
