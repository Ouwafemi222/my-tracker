import { REPORT_TIMEZONE } from './dates'

export function lagosGreeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: REPORT_TIMEZONE,
      hour: 'numeric',
      hour12: false,
    }).format(new Date()),
  )
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function formatFriendlyPeriodLabel(mode: string, start: string, end: string): string {
  if (start === end) {
    return new Intl.DateTimeFormat('en-NG', {
      timeZone: REPORT_TIMEZONE,
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(`${start}T12:00:00+01:00`))
  }
  const fmt = (d: string) =>
    new Intl.DateTimeFormat('en-NG', {
      timeZone: REPORT_TIMEZONE,
      month: 'short',
      day: 'numeric',
    }).format(new Date(`${d}T12:00:00+01:00`))
  if (mode === 'weekly') return `Week of ${fmt(start)}`
  if (mode === 'monthly') {
    return new Intl.DateTimeFormat('en-NG', {
      timeZone: REPORT_TIMEZONE,
      month: 'long',
      year: 'numeric',
    }).format(new Date(`${start}T12:00:00+01:00`))
  }
  return `${fmt(start)} – ${fmt(end)}`
}
