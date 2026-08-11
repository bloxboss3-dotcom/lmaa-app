/** Shared, locale-aware formatting helpers. Pure and safe with bad input. */

const DATE_MEDIUM: Intl.DateTimeFormatOptions = {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
}

const DATE_LONG: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
}

function parse(value: string | number | Date | undefined): Date | null {
  if (value === undefined || value === '') return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDate(value: string | number | Date | undefined): string {
  const date = parse(value)
  return date ? date.toLocaleDateString(undefined, DATE_MEDIUM) : ''
}

export function formatLongDate(value: string | number | Date | undefined): string {
  const date = parse(value)
  return date ? date.toLocaleDateString(undefined, DATE_LONG) : ''
}

export function formatClock(value: string | number | Date | undefined): string {
  const date = parse(value)
  return date ? date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : ''
}

export function formatDateTime(value: string | number | Date | undefined): string {
  const date = parse(value)
  if (!date) return ''
  return `${formatDate(date)} · ${formatClock(date)}`
}

/** "2 hours ago" / "in 3 days" for feed timestamps. */
export function formatRelative(
  value: string | number | Date | undefined,
  now: Date = new Date(),
): string {
  const date = parse(value)
  if (!date) return ''
  const diffMs = date.getTime() - now.getTime()
  const absMinutes = Math.abs(diffMs) / 60000
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  if (absMinutes < 1) return 'Just now'
  if (absMinutes < 60) return formatter.format(Math.round(diffMs / 60000), 'minute')
  if (absMinutes < 60 * 24) return formatter.format(Math.round(diffMs / 3600000), 'hour')
  if (absMinutes < 60 * 24 * 30) return formatter.format(Math.round(diffMs / 86400000), 'day')
  return formatDate(date)
}

/** `2026-08-01T22:30` (what `<input type="datetime-local">` expects). */
export function toDateTimeLocalInput(value: string | undefined): string {
  const date = parse(value)
  if (!date) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`
}

/** Turn a `datetime-local` value back into a full ISO instant. */
export function fromDateTimeLocalInput(value: string): string {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

/**
 * Builds a `tel:` link.
 *
 * Plain 10-digit US numbers are promoted to E.164 (+1…) because a bare
 * national number can fail to dial from a phone on an international SIM or in
 * a roaming context — and a family standing outside a locked dojang door is
 * exactly when the Call button has to work. Anything already carrying a `+`,
 * or that is not a NANP-shaped number, is passed through untouched.
 */
export function telHref(phone: string | undefined): string | undefined {
  if (!phone) return undefined
  const cleaned = phone.replace(/[^\d+]/g, '')
  if (!cleaned) return undefined
  if (cleaned.startsWith('+')) return `tel:${cleaned}`
  if (/^\d{10}$/.test(cleaned)) return `tel:+1${cleaned}`
  if (/^1\d{10}$/.test(cleaned)) return `tel:+${cleaned}`
  return `tel:${cleaned}`
}

export function mailtoHref(email: string | undefined): string | undefined {
  return email ? `mailto:${email}` : undefined
}

/** Time-of-day greeting. No account required. */
export function greeting(now: Date = new Date()): string {
  const hour = now.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}
