import type { AcademyEvent } from './types'
import { eventEndsAt } from './events'

/**
 * Minimal, standards-correct iCalendar (RFC 5545) generation.
 *
 * Everything here is pure so it can be unit tested; the browser download
 * wrapper lives in `src/lib/download.ts`.
 */

const CRLF = '\r\n'

/** RFC 5545 §3.3.11 — escape TEXT values. */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n')
}

/** RFC 5545 §3.1 — fold content lines longer than 75 octets. */
export function foldLine(line: string): string {
  if (line.length <= 75) return line
  const parts: string[] = [line.slice(0, 75)]
  let rest = line.slice(75)
  while (rest.length > 74) {
    parts.push(` ${rest.slice(0, 74)}`)
    rest = rest.slice(74)
  }
  if (rest.length) parts.push(` ${rest}`)
  return parts.join(CRLF)
}

/** `2026-08-01T22:30:00Z` -> `20260801T223000Z`. */
export function toIcsUtc(value: number | string | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  return `${date.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`
}

/** Local calendar date in UTC terms -> `20260801` (all-day events). */
export function toIcsDate(value: number | string | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  return date.toISOString().slice(0, 10).replace(/-/g, '')
}

export interface IcsOptions {
  /** Overridable so tests are deterministic. */
  now?: Date
  /** Used to build a stable, unique UID. */
  domain?: string
  calendarName?: string
}

export function buildEventIcs(event: AcademyEvent, options: IcsOptions = {}): string {
  const { now = new Date(), domain = 'leesmartialartsacademy.app', calendarName = 'LMAA' } = options

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//Lee's Martial Arts Academy//LMAA Family App//EN`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
    'BEGIN:VEVENT',
    `UID:${event.id}@${domain}`,
    `DTSTAMP:${toIcsUtc(now)}`,
  ]

  if (event.allDay) {
    const start = new Date(event.startAt)
    const end = new Date(eventEndsAt(event))
    lines.push(`DTSTART;VALUE=DATE:${toIcsDate(start)}`)
    lines.push(`DTEND;VALUE=DATE:${toIcsDate(end)}`)
  } else {
    lines.push(`DTSTART:${toIcsUtc(event.startAt)}`)
    lines.push(`DTEND:${toIcsUtc(eventEndsAt(event))}`)
  }

  lines.push(`SUMMARY:${escapeIcsText(event.title)}`)

  const description = [event.description, event.registrationUrl && `Register: ${event.registrationUrl}`]
    .filter(Boolean)
    .join('\n\n')
  if (description) lines.push(`DESCRIPTION:${escapeIcsText(description)}`)

  const location = [event.location, event.address].filter(Boolean).join(', ')
  if (location) lines.push(`LOCATION:${escapeIcsText(location)}`)
  if (event.registrationUrl) lines.push(`URL:${event.registrationUrl}`)

  lines.push('END:VEVENT', 'END:VCALENDAR')

  return `${lines.map(foldLine).join(CRLF)}${CRLF}`
}

/** A safe, readable download filename such as `lmaa-belt-testing.ics`. */
export function icsFileName(event: AcademyEvent): string {
  const slug = event.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return `lmaa-${slug || 'event'}.ics`
}
