import type { ScheduleEntry, Weekday } from './types'
import {
  effectiveTimes,
  entriesForDay,
  isoWeekday,
  minutesOfDay,
  noticeAppliesOn,
  sortScheduleEntries,
  toIsoDate,
} from './schedule'

/**
 * "My classes" — the classes a family actually attends, chosen on the device.
 *
 * Stored as class NAMES rather than entry ids: a parent thinks "my kid is in
 * Level II", which means every Level II slot in the week, and a name survives
 * an administrator re-timing a class where a generated id would not.
 *
 * It lives only in the browser's storage. No account, no server row, nothing
 * that could identify a child — just a short list of strings on the family's
 * own phone, which is why this feature was allowed into version one at all.
 */

export function normaliseClassName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

function isNameIn(mine: readonly string[], key: string): boolean {
  return mine.some((name) => normaliseClassName(name) === key)
}

export function isMyClass(entry: ScheduleEntry, mine: readonly string[]): boolean {
  return isNameIn(mine, normaliseClassName(entry.className))
}

/** Adds the class if absent, removes it if present. Never duplicates. */
export function toggleClassName(mine: readonly string[], name: string): string[] {
  const key = normaliseClassName(name)
  if (!key) return [...mine]
  return isNameIn(mine, key)
    ? mine.filter((item) => normaliseClassName(item) !== key)
    : [...mine, key]
}

/** Distinct published class names in timetable order, for a picker. */
export function distinctClassNames(entries: ScheduleEntry[]): string[] {
  const seen = new Set<string>()
  const names: string[] = []
  for (const entry of sortScheduleEntries(entries.filter((item) => item.published))) {
    const key = normaliseClassName(entry.className)
    if (!seen.has(key)) {
      seen.add(key)
      names.push(key)
    }
  }
  return names
}

export interface NextMyClass {
  entry: ScheduleEntry
  /** 0 = later today, 1 = tomorrow … 7 = same weekday next week. */
  daysAhead: number
}

/**
 * The next time one of "my" classes meets, counting from now.
 *
 * Today's remaining classes come first, then forward through the week, then
 * back round to today's earlier classes next week. A class cancelled on the
 * date in question is skipped: a parent asking "when is my next class" wants
 * one that is actually on.
 */
export function nextMyClass(
  entries: ScheduleEntry[],
  mine: readonly string[],
  now: Date = new Date(),
): NextMyClass | null {
  if (!mine.length) return null
  const today = isoWeekday(now)
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  for (let ahead = 0; ahead <= 7; ahead += 1) {
    const day = (((today - 1 + ahead) % 7) + 1) as Weekday
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + ahead)
    const dateIso = toIsoDate(date)

    for (const entry of entriesForDay(entries, day)) {
      if (!isMyClass(entry, mine)) continue
      if (entry.status === 'cancelled' && noticeAppliesOn(entry, dateIso)) continue
      const { start, end } = effectiveTimes(entry)
      // Day 0 is today: only classes that have not finished yet. Day 7 is
      // today again, next week: only the ones already finished today.
      if (ahead === 0 && minutesOfDay(end) < nowMinutes) continue
      if (ahead === 7 && minutesOfDay(start) >= nowMinutes) continue
      return { entry, daysAhead: ahead }
    }
  }
  return null
}
