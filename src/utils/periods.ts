import {
  endOfWeekLagos,
  monthRangeLagos,
  startOfWeekLagos,
  todayLagosDateString,
} from './dates'

export type PeriodMode = 'daily' | 'weekly' | 'monthly' | 'custom'

export interface PeriodRange {
  start: string
  end: string
  label: string
}

export function resolvePeriodRange(
  mode: PeriodMode,
  opts: {
    selectedDate: string
    month: string
    customStart: string
    customEnd: string
  },
): PeriodRange {
  const today = todayLagosDateString()
  switch (mode) {
    case 'daily': {
      const d = opts.selectedDate || today
      return { start: d, end: d, label: `Day ${d}` }
    }
    case 'weekly': {
      const anchor = opts.selectedDate || today
      const start = startOfWeekLagos(anchor)
      const end = endOfWeekLagos(start)
      return { start, end, label: `Week ${start} → ${end}` }
    }
    case 'monthly': {
      const ym = opts.month || today.slice(0, 7)
      const { start, end } = monthRangeLagos(ym)
      return { start, end, label: `Month ${ym}` }
    }
    case 'custom': {
      let start = opts.customStart || today
      let end = opts.customEnd || today
      if (start > end) [start, end] = [end, start]
      return { start, end, label: `${start} → ${end}` }
    }
    default:
      return { start: today, end: today, label: today }
  }
}

/** Split a Lagos date range into day labels for charts */
export function dayLabelsInRange(start: string, end: string): string[] {
  const labels: string[] = []
  const [y0, m0, d0] = start.split('-').map(Number)
  const [y1, m1, d1] = end.split('-').map(Number)
  const cur = new Date(Date.UTC(y0, m0 - 1, d0))
  const endDate = new Date(Date.UTC(y1, m1 - 1, d1))
  while (cur <= endDate) {
    labels.push(cur.toISOString().slice(0, 10))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return labels
}

export function lagosMonthForDate(dateStr: string): string {
  return dateStr.slice(0, 7)
}

export function formatShortDay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return new Intl.DateTimeFormat('en-NG', {
    timeZone: 'Africa/Lagos',
    weekday: 'short',
    day: 'numeric',
  }).format(dt)
}
