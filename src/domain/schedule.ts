import type { IsoDate, ScheduleEntry, TimeOfDay, Weekday } from './types'

export const WEEKDAYS: { value: Weekday; label: string; short: string }[] = [
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
  { value: 7, label: 'Sunday', short: 'Sun' },
]

export function weekdayLabel(day: Weekday): string {
  return WEEKDAYS.find((entry) => entry.value === day)?.label ?? ''
}

/** JS `getDay()` is Sunday-first; the domain uses ISO weekdays (Monday = 1). */
export function isoWeekday(date: Date): Weekday {
  const day = date.getDay()
  return (day === 0 ? 7 : day) as Weekday
}

/** `16:25` -> 985. Invalid input sorts last rather than throwing. */
export function minutesOfDay(time: TimeOfDay): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time?.trim() ?? '')
  if (!match) return Number.MAX_SAFE_INTEGER
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return Number.MAX_SAFE_INTEGER
  return hours * 60 + minutes
}

/** `16:25` -> `4:25 PM`. */
export function formatTime(time: TimeOfDay): string {
  const total = minutesOfDay(time)
  if (total === Number.MAX_SAFE_INTEGER) return time ?? ''
  const hours24 = Math.floor(total / 60)
  const minutes = total % 60
  const suffix = hours24 >= 12 ? 'PM' : 'AM'
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12
  return `${hours12}:${String(minutes).padStart(2, '0')} ${suffix}`
}

export function formatTimeRange(start: TimeOfDay, end: TimeOfDay): string {
  return `${formatTime(start)} – ${formatTime(end)}`
}

/**
 * Times families should actually turn up for, honouring a temporary change.
 */
export function effectiveTimes(entry: ScheduleEntry): { start: TimeOfDay; end: TimeOfDay } {
  if (entry.status === 'changed' && entry.newStartTime && entry.newEndTime) {
    return { start: entry.newStartTime, end: entry.newEndTime }
  }
  return { start: entry.startTime, end: entry.endTime }
}

/**
 * A cancelled/changed notice either applies to one specific date or stands
 * until an admin clears it.
 */
export function noticeAppliesOn(entry: ScheduleEntry, date: IsoDate): boolean {
  if (entry.status === 'scheduled') return false
  if (!entry.statusDate) return true
  return entry.statusDate === date
}

/** Local calendar date as `YYYY-MM-DD` (never UTC-shifted). */
export function toIsoDate(date: Date): IsoDate {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Day of week, then start time, then the admin's manual ordering. */
export function sortScheduleEntries(entries: ScheduleEntry[]): ScheduleEntry[] {
  return [...entries].sort((a, b) => {
    if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek
    const start = minutesOfDay(a.startTime) - minutesOfDay(b.startTime)
    if (start !== 0) return start
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
    return a.className.localeCompare(b.className)
  })
}

export interface ScheduleFilter {
  /** Program slug, or `all`. */
  program?: string
  /** Level label, or `all`. */
  level?: string
  day?: Weekday | 'all'
}

export function filterScheduleEntries(
  entries: ScheduleEntry[],
  filter: ScheduleFilter = {},
): ScheduleEntry[] {
  const { program = 'all', level = 'all', day = 'all' } = filter
  return entries.filter((entry) => {
    if (!entry.published) return false
    if (program !== 'all' && entry.programSlug !== program) return false
    if (level !== 'all' && entry.level !== level) return false
    if (day !== 'all' && entry.dayOfWeek !== day) return false
    return true
  })
}

/** Published classes for one weekday, correctly ordered by start time. */
export function entriesForDay(entries: ScheduleEntry[], day: Weekday): ScheduleEntry[] {
  return sortScheduleEntries(filterScheduleEntries(entries, { day }))
}

export interface ScheduleDayGroup {
  day: Weekday
  label: string
  entries: ScheduleEntry[]
}

/** The whole week grouped for display; days without classes are kept so the
 *  UI can show an honest "no classes" line instead of silently hiding them. */
export function groupByDay(
  entries: ScheduleEntry[],
  filter: ScheduleFilter = {},
): ScheduleDayGroup[] {
  const filtered = sortScheduleEntries(filterScheduleEntries(entries, { ...filter, day: 'all' }))
  return WEEKDAYS.map(({ value, label }) => ({
    day: value,
    label,
    entries: filtered.filter((entry) => entry.dayOfWeek === value),
  }))
}

/** Distinct level labels present in the data, for the filter control. */
export function availableLevels(entries: ScheduleEntry[]): string[] {
  const levels = new Set<string>()
  for (const entry of entries) if (entry.level) levels.add(entry.level)
  return [...levels].sort((a, b) => a.localeCompare(b))
}

export interface NextClassDay {
  day: Weekday
  /** 0 = today, 1 = tomorrow, and so on. */
  daysAhead: number
  entries: ScheduleEntry[]
}

/**
 * The next weekday that actually has classes.
 *
 * The academy is closed at weekends, so a family opening the app on a Sunday
 * would otherwise be told only what is *not* happening. `startOffset` of 0
 * considers today first (useful for picking a sensible default day on the
 * Schedule screen); 1 skips today (useful once today's classes have finished).
 * Returns null only when the timetable is completely empty.
 */
export function nextClassDay(
  entries: ScheduleEntry[],
  now: Date = new Date(),
  startOffset: 0 | 1 = 1,
): NextClassDay | null {
  const today = isoWeekday(now)
  for (let ahead = startOffset; ahead < startOffset + 7; ahead += 1) {
    const day = (((today - 1 + ahead) % 7) + 1) as Weekday
    const dayEntries = entriesForDay(entries, day)
    if (dayEntries.length) return { day, daysAhead: ahead, entries: dayEntries }
  }
  return null
}

/** Classes still to come today, based on the current wall-clock time. */
export function upcomingToday(
  entries: ScheduleEntry[],
  now: Date = new Date(),
): ScheduleEntry[] {
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  return entriesForDay(entries, isoWeekday(now)).filter((entry) => {
    const { end } = effectiveTimes(entry)
    return minutesOfDay(end) >= nowMinutes
  })
}
