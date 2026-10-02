import type { AcademyEvent, ScheduleEntry, Weekday } from './types'
import { eventEndsAt } from './events'
import { isoWeekday, minutesOfDay, sortScheduleEntries } from './schedule'

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

  const description = [
    event.description,
    event.registrationUrl && `Register: ${event.registrationUrl}`,
  ]
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

/* ------------------------------------------------- the weekly timetable -- */

/**
 * The academy's time zone. The timetable is published as local wall-clock
 * times ("4:25 PM"), so the calendar file carries a TZID rather than UTC —
 * that way a parent who imports it while travelling still sees 4:25 PM, and
 * the file stays correct across the daylight-saving change.
 */
export const ACADEMY_TIME_ZONE = 'America/Los_Angeles'

/** RFC 5545 requires a VTIMEZONE for any TZID used. US rules since 2007. */
const VTIMEZONE_LOS_ANGELES: string[] = [
  'BEGIN:VTIMEZONE',
  `TZID:${ACADEMY_TIME_ZONE}`,
  'BEGIN:STANDARD',
  'DTSTART:19701101T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
  'TZOFFSETFROM:-0700',
  'TZOFFSETTO:-0800',
  'TZNAME:PST',
  'END:STANDARD',
  'BEGIN:DAYLIGHT',
  'DTSTART:19700308T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
  'TZOFFSETFROM:-0800',
  'TZOFFSETTO:-0700',
  'TZNAME:PDT',
  'END:DAYLIGHT',
  'END:VTIMEZONE',
]

const ICS_BYDAY: Record<Weekday, string> = {
  1: 'MO',
  2: 'TU',
  3: 'WE',
  4: 'TH',
  5: 'FR',
  6: 'SA',
  7: 'SU',
}

/** `16:25` -> `162500`, or null when the time is not well-formed. */
function toIcsLocalTime(time: string): string | null {
  const total = minutesOfDay(time)
  if (total === Number.MAX_SAFE_INTEGER) return null
  const hours = String(Math.floor(total / 60)).padStart(2, '0')
  const minutes = String(total % 60).padStart(2, '0')
  return `${hours}${minutes}00`
}

/** Local `YYYYMMDD` from a Date's local fields — never UTC-shifted. */
function toIcsLocalDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}${month}${day}`
}

export interface ScheduleIcsOptions extends IcsOptions {
  /** Shown as the event location, e.g. the academy's street address. */
  location?: string
  /** Put in each description so a parent can get back to the live timetable. */
  appUrl?: string
}

/**
 * The whole weekly timetable (or a chosen subset) as repeating calendar
 * events, one VEVENT per class with a weekly RRULE.
 *
 * Subscribing once beats re-reading a screen every week, which is the thing
 * parents of busy kids say they most want from an activity app. The file is
 * honest about its limits: a class cancelled on one date is excluded for that
 * date, a class cancelled until further notice is left out entirely, and the
 * description says to check the app for one-off time changes.
 */
export function buildScheduleIcs(
  entries: ScheduleEntry[],
  options: ScheduleIcsOptions = {},
): string {
  const {
    now = new Date(),
    domain = 'leesmartialartsacademy.app',
    calendarName = 'LMAA classes',
    location,
    appUrl,
  } = options
  const today = isoWeekday(now)

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//Lee's Martial Arts Academy//LMAA Family App//EN`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
    `X-WR-TIMEZONE:${ACADEMY_TIME_ZONE}`,
    ...VTIMEZONE_LOS_ANGELES,
  ]

  const usable = sortScheduleEntries(
    entries.filter(
      (entry) =>
        entry.published &&
        // Cancelled with no date means "until further notice": not a series.
        !(entry.status === 'cancelled' && !entry.statusDate),
    ),
  )

  for (const entry of usable) {
    const start = toIcsLocalTime(entry.startTime)
    const end = toIcsLocalTime(entry.endTime)
    if (!start || !end) continue

    // First occurrence: the next date that falls on this weekday, today
    // included. A series that started "today" is correct even if the class
    // has already run — it is a weekly rule, not a single appointment.
    const ahead = (entry.dayOfWeek - today + 7) % 7
    const first = new Date(now.getFullYear(), now.getMonth(), now.getDate() + ahead)
    const firstDate = toIcsLocalDate(first)

    lines.push(
      'BEGIN:VEVENT',
      `UID:${entry.id}@${domain}`,
      `DTSTAMP:${toIcsUtc(now)}`,
      `DTSTART;TZID=${ACADEMY_TIME_ZONE}:${firstDate}T${start}`,
      `DTEND;TZID=${ACADEMY_TIME_ZONE}:${firstDate}T${end}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${ICS_BYDAY[entry.dayOfWeek]}`,
      `SUMMARY:${escapeIcsText(entry.className)}`,
    )

    // A one-date cancellation becomes an exception to the series.
    if (entry.status === 'cancelled' && entry.statusDate) {
      lines.push(`EXDATE;TZID=${ACADEMY_TIME_ZONE}:${entry.statusDate.replace(/-/g, '')}T${start}`)
    }

    const description = [
      [entry.ageRange, entry.level].filter(Boolean).join(' · '),
      'Times can change. Check the LMAA app before you leave.',
      appUrl,
    ]
      .filter(Boolean)
      .join('\n')
    lines.push(`DESCRIPTION:${escapeIcsText(description)}`)
    if (location) lines.push(`LOCATION:${escapeIcsText(location)}`)
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')
  return `${lines.map(foldLine).join(CRLF)}${CRLF}`
}
