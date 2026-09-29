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
        ? 'ring-1 ring-emerald-200'
        : highlight === 'out'
          ? 'ring-1 ring-rose-200'
          : 'ring-1 ring-slate-200'

  const valueColor =
    highlight === 'net'
      ? amountKobo >= 0
        ? 'text-emerald-700'
        : 'text-rose-700'
      : 'text-slate-900'

  return (
    <article
      className={`rounded-2xl bg-white p-5 shadow-sm ${ring}`}
    >
      <h3 className="text-sm font-medium text-slate-600">{title}</h3>
      <p className={`mt-2 text-2xl font-bold tabular-nums ${valueColor}`}>
        {formatKoboAsNaira(amountKobo)}
      </p>
      {subtitle ? (
        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      ) : null}
    </article>
  )
}
