export const REPORT_TIMEZONE = 'Africa/Lagos'

/** YYYY-MM-DD in Africa/Lagos for an ISO instant */
export function toLagosDateString(iso: string): string {
  const d = new Date(iso)
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: REPORT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

/** Today's YYYY-MM-DD in Lagos */
export function todayLagosDateString(): string {
  return toLagosDateString(new Date().toISOString())
}

export function formatLagosDateTime(iso: string): string {
  return new Intl.DateTimeFormat('en-NG', {
    timeZone: REPORT_TIMEZONE,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

export function formatLagosDate(iso: string): string {
  return new Intl.DateTimeFormat('en-NG', {
    timeZone: REPORT_TIMEZONE,
    dateStyle: 'medium',
  }).format(new Date(iso))
}

/** Inclusive range filter by Lagos calendar date */
export function isInLagosDateRange(
  iso: string,
  startDate: string,
  endDate: string,
): boolean {
  const d = toLagosDateString(iso)
  return d >= startDate && d <= endDate
}

export function startOfWeekLagos(dateStr: string): string {
  const [y, m, day] = dateStr.split('-').map(Number)
  const utc = new Date(Date.UTC(y, m - 1, day, 12, 0, 0))
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: REPORT_TIMEZONE,
    weekday: 'short',
  }).format(utc)
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }
  const dow = map[weekday] ?? 0
  const mondayOffset = dow === 0 ? -6 : 1 - dow
  utc.setUTCDate(utc.getUTCDate() + mondayOffset)
  return utc.toISOString().slice(0, 10)
}

export function endOfWeekLagos(weekStart: string): string {
  const [y, m, day] = weekStart.split('-').map(Number)
  const utc = new Date(Date.UTC(y, m - 1, day + 6, 12, 0, 0))
  return utc.toISOString().slice(0, 10)
}

export function monthRangeLagos(yearMonth: string): { start: string; end: string } {
  const [y, m] = yearMonth.split('-').map(Number)
  const start = `${yearMonth}-01`
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const end = `${yearMonth}-${String(lastDay).padStart(2, '0')}`
  return { start, end }
}
