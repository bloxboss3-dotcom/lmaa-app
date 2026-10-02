import { describe, expect, it } from 'vitest'
import {
  distinctClassNames,
  isMyClass,
  nextMyClass,
  normaliseClassName,
  toggleClassName,
} from './myClasses'
import type { ScheduleEntry, Weekday } from './types'

function entry(
  id: string,
  className: string,
  day: Weekday,
  start: string,
  end: string,
  extra: Partial<ScheduleEntry> = {},
): ScheduleEntry {
  return {
    id,
    className,
    dayOfWeek: day,
    startTime: start,
    endTime: end,
    status: 'scheduled',
    published: true,
    sortOrder: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...extra,
  }
}

// Wednesday 7 Oct 2026, 2:00 pm local.
const WED_2PM = new Date(2026, 9, 7, 14, 0)

const WEEK: ScheduleEntry[] = [
  entry('mon-l2', 'Level II', 1, '17:45', '18:25'),
  entry('wed-wb', 'White Belt Only', 3, '15:40', '16:20'),
  entry('wed-l2', 'Level II', 3, '12:00', '12:40'), // already finished at 2pm
  entry('thu-l2', 'Level II', 4, '17:45', '18:25'),
  entry('fri-spar', 'Kids Sparring', 5, '17:55', '18:35'),
]

describe('normaliseClassName / toggleClassName', () => {
  it('ignores stray whitespace so " Level II " and "Level II" are the same class', () => {
    expect(normaliseClassName('  Level   II ')).toBe('Level II')
    expect(toggleClassName(['Level II'], ' Level II ')).toEqual([])
  })

  it('adds a missing class and removes a present one, never duplicating', () => {
    const once = toggleClassName([], 'Level II')
    expect(once).toEqual(['Level II'])
    expect(toggleClassName(once, 'Level II')).toEqual([])
    expect(toggleClassName(['Level II', 'Level II'], 'Level II')).toEqual([])
  })

  it('ignores an empty name', () => {
    expect(toggleClassName(['Level II'], '   ')).toEqual(['Level II'])
  })
})

describe('isMyClass / distinctClassNames', () => {
  it('matches by name, not by id, so every slot of a class counts', () => {
    expect(WEEK.filter((item) => isMyClass(item, ['Level II'])).map((item) => item.id)).toEqual([
      'mon-l2',
      'wed-l2',
      'thu-l2',
    ])
  })

  it('lists each published class once, in timetable order', () => {
    expect(distinctClassNames(WEEK)).toEqual(['Level II', 'White Belt Only', 'Kids Sparring'])
    expect(
      distinctClassNames([
        ...WEEK,
        entry('x', 'Secret', 2, '10:00', '11:00', { published: false }),
      ]),
    ).not.toContain('Secret')
  })
})

describe('nextMyClass', () => {
  it('returns null when no classes are chosen', () => {
    expect(nextMyClass(WEEK, [], WED_2PM)).toBeNull()
  })

  it('skips a class that already finished today and looks forward', () => {
    // Wed 12:00 Level II is over by 2pm; Thursday's is the next one.
    const next = nextMyClass(WEEK, ['Level II'], WED_2PM)
    expect(next?.entry.id).toBe('thu-l2')
    expect(next?.daysAhead).toBe(1)
  })

  it('prefers a class still to come today', () => {
    const next = nextMyClass(WEEK, ['White Belt Only'], WED_2PM)
    expect(next?.entry.id).toBe('wed-wb')
    expect(next?.daysAhead).toBe(0)
  })

  it('wraps round to next week when the only slot is earlier in the week', () => {
    const next = nextMyClass(WEEK, ['Level II'], new Date(2026, 9, 9, 20, 0)) // Fri 8pm
    expect(next?.entry.id).toBe('mon-l2')
    expect(next?.daysAhead).toBe(3)
  })

  it('wraps to the same weekday next week when today’s class has passed', () => {
    const onlyWed = [entry('wed-l2', 'Level II', 3, '12:00', '12:40')]
    const next = nextMyClass(onlyWed, ['Level II'], WED_2PM)
    expect(next?.entry.id).toBe('wed-l2')
    expect(next?.daysAhead).toBe(7)
  })

  it('skips a class cancelled on that date but not the same class on another date', () => {
    const week = WEEK.map((item) =>
      item.id === 'thu-l2'
        ? { ...item, status: 'cancelled' as const, statusDate: '2026-10-08' }
        : item,
    )
    const next = nextMyClass(week, ['Level II'], WED_2PM)
    expect(next?.entry.id).toBe('mon-l2')
    expect(next?.daysAhead).toBe(5)
  })

  it('skips a class cancelled until further notice', () => {
    const week = WEEK.map((item) =>
      item.id === 'thu-l2' ? { ...item, status: 'cancelled' as const } : item,
    )
    expect(nextMyClass(week, ['Level II'], WED_2PM)?.entry.id).toBe('mon-l2')
  })
})
