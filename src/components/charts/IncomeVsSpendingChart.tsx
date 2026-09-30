import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatKoboAsNaira } from '../../utils/money'

export interface IncomeVsSpendingPoint {
  label: string
  incomeKobo: number
  spendingKobo: number
}

interface Props {
  data: IncomeVsSpendingPoint[]
  emptyMessage: string
}

export function IncomeVsSpendingChart({ data, emptyMessage }: Props) {
  const hasValues = data.some((d) => d.incomeKobo > 0 || d.spendingKobo > 0)
  if (!hasValues) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-400">
        {emptyMessage}
      </div>
    )
  }

  const chartData = data.map((d) => ({
    name: d.label,
    Income: d.incomeKobo / 100,
    Spending: d.spendingKobo / 100,
  }))

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₦${v}`} />
          <Tooltip
            formatter={(value) =>
              formatKoboAsNaira(Math.round(Number(value ?? 0) * 100))
            }
          />
          <Legend />
          <Bar dataKey="Income" fill="#059669" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Spending" fill="#e11d48" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
