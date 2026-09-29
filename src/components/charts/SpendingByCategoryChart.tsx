import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { formatKoboAsNaira } from '../../utils/money'

const COLORS = [
  '#059669',
  '#0d9488',
  '#0891b2',
  '#6366f1',
  '#a855f7',
  '#db2777',
  '#ea580c',
  '#ca8a04',
  '#64748b',
]

interface Props {
  data: { category: string; amountKobo: number }[]
  emptyMessage: string
}

export function SpendingByCategoryChart({ data, emptyMessage }: Props) {
  const total = data.reduce((s, d) => s + d.amountKobo, 0)
  if (total === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-400">
        {emptyMessage}
      </div>
    )
  }

  const chartData = data.map((d) => ({
    name: d.category,
    value: d.amountKobo / 100,
    amountKobo: d.amountKobo,
  }))

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius="70%"
            label={({ name, percent }) =>
              percent && percent > 0.05 ? `${name}` : ''
            }
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(_v, _n, item) =>
              formatKoboAsNaira((item.payload as { amountKobo: number }).amountKobo)
            }
          />
          <Legend layout="horizontal" verticalAlign="bottom" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
