import { formatKoboAsNaira } from '../utils/money'

interface SummaryCardProps {
  title: string
  amountKobo: number
  subtitle?: string
  highlight?: 'neutral' | 'in' | 'out' | 'net'
  large?: boolean
}

export function SummaryCard({
  title,
  amountKobo,
  subtitle,
  highlight = 'neutral',
  large = false,
}: SummaryCardProps) {
  const ring =
    highlight === 'net'
      ? 'ring-2 ring-emerald-500/35 shadow-lg shadow-emerald-500/10'
      : highlight === 'in'
        ? 'ring-1 ring-emerald-200/80 dark:ring-emerald-800'
        : highlight === 'out'
          ? 'ring-1 ring-rose-200/80 dark:ring-rose-900'
          : 'ring-1 ring-slate-200/80 dark:ring-slate-700'

  const valueColor =
    highlight === 'net'
      ? amountKobo >= 0
        ? 'text-emerald-700 dark:text-emerald-400'
        : 'text-rose-700 dark:text-rose-400'
      : 'text-slate-900 dark:text-white'

  return (
    <article
      className={`glass-card rounded-2xl p-5 shadow-sm transition hover:shadow-md ${ring} ${large ? 'sm:col-span-2 lg:col-span-1' : ''}`}
    >
      <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">{title}</h3>
      <p
        className={`mt-2 font-bold tabular-nums tracking-tight ${valueColor} ${large ? 'text-3xl sm:text-4xl' : 'text-2xl'}`}
      >
        {formatKoboAsNaira(amountKobo)}
      </p>
      {subtitle ? (
        <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-500">
          {subtitle}
        </p>
      ) : null}
    </article>
  )
}
