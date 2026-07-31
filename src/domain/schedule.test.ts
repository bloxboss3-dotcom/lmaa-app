import { describe, expect, it } from 'vitest'
import {
  availableLevels,
  effectiveTimes,
  entriesForDay,
  filterScheduleEntries,
  formatTime,
  groupByDay,
  isoWeekday,
  minutesOfDay,
  noticeAppliesOn,
  sortScheduleEntries,
  toIsoDate,
  upcomingToday,
} from './schedule'
import type { ScheduleEntry, Weekday } from './types'

function entry(overrides: Partial<ScheduleEntry> & { id: string }): ScheduleEntry {
  return {
    className: 'Class',
    dayOfWeek: 1,
    startTime: '16:00',
    endTime: '16:40',
    status: 'scheduled',
    published: true,
    sortOrder: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('minutesOfDay', () => {
  it('converts 24-hour times to minutes', () => {
    expect(minutesOfDay('00:00')).toBe(0)
    expect(minutesOfDay('16:25')).toBe(985)
    expect(minutesOfDay('23:59')).toBe(1439)
  })

  it('sorts invalid values last instead of throwing', () => {
    expect(minutesOfDay('')).toBe(Number.MAX_SAFE_INTEGER)
    expect(minutesOfDay('99:99')).toBe(Number.MAX_SAFE_INTEGER)
    expect(minutesOfDay('nonsense')).toBe(Number.MAX_SAFE_INTEGER)
  })
})

describe('formatTime', () => {
  it('formats as 12-hour time with meridiem', () => {
    expect(formatTime('16:25')).toBe('4:25 PM')
    expect(formatTime('09:05')).toBe('9:05 AM')
    expect(formatTime('00:30')).toBe('12:30 AM')
    expect(formatTime('12:00')).toBe('12:00 PM')
  })
})

describe('isoWeekday', () => {
  it('treats Monday as 1 and Sunday as 7', () => {
    // 2026-08-03 is a Monday.
    expect(isoWeekday(new Date(2026, 7, 3, 12))).toBe(1)
    expect(isoWeekday(new Date(2026, 7, 9, 12))).toBe(7)
  })
})

describe('sortScheduleEntries', () => {
  it('orders by day, then by start time', () => {
    const entries = [
      entry({ id: 'wed-late', dayOfWeek: 3, startTime: '19:15' }),
      entry({ id: 'mon-late', dayOfWeek: 1, startTime: '20:00' }),
      entry({ id: 'mon-early', dayOfWeek: 1, startTime: '15:40' }),
      entry({ id: 'wed-early', dayOfWeek: 3, startTime: '15:40' }),
    ]
    expect(sortScheduleEntries(entries).map((item) => item.id)).toEqual([
      'mon-early',
      'mon-late',
      'wed-early',
      'wed-late',
    ])
  })

  it('does not mutate the input array', () => {
    const entries = [entry({ id: 'b', startTime: '20:00' }), entry({ id: 'a', startTime: '15:00' })]
    sortScheduleEntries(entries)
    expect(entries.map((item) => item.id)).toEqual(['b', 'a'])
  })
})

describe('filterScheduleEntries', () => {
  const entries = [
    entry({ id: 'tigers', programSlug: 'little-tigers', level: 'All levels', dayOfWeek: 1 }),
    entry({ id: 'white', programSlug: 'children-white-belt', level: 'White Belt', dayOfWeek: 1 }),
    entry({ id: 'teen', programSlug: 'teen-adult', level: 'All levels', dayOfWeek: 2 }),
    entry({ id: 'draft', programSlug: 'teen-adult', level: 'All levels', published: false }),
  ]

  it('hides unpublished classes from families', () => {
    expect(filterScheduleEntries(entries).map((item) => item.id)).not.toContain('draft')
  })

  it('filters by program', () => {
    expect(filterScheduleEntries(entries, { program: 'little-tigers' }).map((i) => i.id)).toEqual([
      'tigers',
    ])
  })

  it('filters by level', () => {
    expect(filterScheduleEntries(entries, { level: 'White Belt' }).map((i) => i.id)).toEqual([
      'white',
    ])
  })

  it('combines filters', () => {
    expect(
      filterScheduleEntries(entries, { program: 'teen-adult', level: 'All levels', day: 2 }).map(
        (i) => i.id,
      ),
    ).toEqual(['teen'])
  })

  it('returns everything when no filter is set', () => {
    expect(filterScheduleEntries(entries, {})).toHaveLength(3)
  })
})

describe('entriesForDay', () => {
  it('returns one day, ordered by start time', () => {
    const entries = [
      entry({ id: 'late', dayOfWeek: 2, startTime: '20:00' }),
      entry({ id: 'early', dayOfWeek: 2, startTime: '15:40' }),
      entry({ id: 'other-day', dayOfWeek: 5, startTime: '18:40' }),
    ]
    expect(entriesForDay(entries, 2).map((item) => item.id)).toEqual(['early', 'late'])
  })
})

describe('groupByDay', () => {
  it('keeps empty days so the UI can say "no classes"', () => {
    const groups = groupByDay([entry({ id: 'mon', dayOfWeek: 1 })])
    expect(groups).toHaveLength(7)
    expect(groups[0].entries.map((item) => item.id)).toEqual(['mon'])
    expect(groups[6].entries).toEqual([])
    expect(groups[6].label).toBe('Sunday')
  })
})

describe('effectiveTimes', () => {
  it('uses the replacement times when a class time changed', () => {
    const changed = entry({
      id: 'changed',
      status: 'changed',
      startTime: '16:00',
      endTime: '16:40',
      newStartTime: '17:00',
      newEndTime: '17:40',
    })
    expect(effectiveTimes(changed)).toEqual({ start: '17:00', end: '17:40' })
  })

  it('falls back to the normal times when replacements are missing', () => {
    const changed = entry({ id: 'changed', status: 'changed' })
    expect(effectiveTimes(changed)).toEqual({ start: '16:00', end: '16:40' })
  })

  it('ignores replacement times on a normal class', () => {
    const normal = entry({ id: 'normal', newStartTime: '19:00', newEndTime: '19:40' })
    expect(effectiveTimes(normal)).toEqual({ start: '16:00', end: '16:40' })
  })
})

describe('noticeAppliesOn', () => {
  it('never applies to a normally running class', () => {
    expect(noticeAppliesOn(entry({ id: 'a' }), '2026-08-03')).toBe(false)
  })

  it('applies on every date when no date was given', () => {
    const cancelled = entry({ id: 'a', status: 'cancelled' })
    expect(noticeAppliesOn(cancelled, '2026-08-03')).toBe(true)
    expect(noticeAppliesOn(cancelled, '2027-01-01')).toBe(true)
  })

  it('applies only on the chosen date when one was given', () => {
    const cancelled = entry({ id: 'a', status: 'cancelled', statusDate: '2026-11-26' })
    expect(noticeAppliesOn(cancelled, '2026-11-26')).toBe(true)
    expect(noticeAppliesOn(cancelled, '2026-11-27')).toBe(false)
  })
})

describe('upcomingToday', () => {
  it('keeps classes that have not finished yet', () => {
    const monday = new Date(2026, 7, 3, 17, 0) // Monday 5:00 PM
    const entries = [
      entry({ id: 'finished', dayOfWeek: 1, startTime: '15:40', endTime: '16:20' }),
      entry({ id: 'running', dayOfWeek: 1, startTime: '16:50', endTime: '17:30' }),
      entry({ id: 'later', dayOfWeek: 1, startTime: '20:00', endTime: '20:40' }),
      entry({ id: 'tomorrow', dayOfWeek: 2, startTime: '20:00', endTime: '20:40' }),
    ]
    expect(upcomingToday(entries, monday).map((item) => item.id)).toEqual(['running', 'later'])
  })
})

describe('availableLevels', () => {
  it('lists distinct levels alphabetically', () => {
    const entries = [
      entry({ id: '1', level: 'White Belt' }),
      entry({ id: '2', level: 'All levels' }),
      entry({ id: '3', level: 'White Belt' }),
      entry({ id: '4' }),
    ]
    expect(availableLevels(entries)).toEqual(['All levels', 'White Belt'])
  })
})

describe('toIsoDate', () => {
  it('uses the local calendar date, not UTC', () => {
    // 11pm local on the 3rd is the 4th in UTC for negative offsets — the
    // schedule must still say the 3rd.
    expect(toIsoDate(new Date(2026, 7, 3, 23, 30))).toBe('2026-08-03')
  })
})

describe('the seeded LMAA week', () => {
  it('places Little Tigers before Children White Belt on Tuesdays', () => {
    // Real academy times: Tue/Thu Little Tigers 3:40pm, White Belt 5:00pm.
    const entries = [
      entry({ id: 'white', dayOfWeek: 2 as Weekday, startTime: '17:00', endTime: '17:40' }),
      entry({ id: 'tigers', dayOfWeek: 2 as Weekday, startTime: '15:40', endTime: '16:10' }),
    ]
    expect(entriesForDay(entries, 2).map((item) => item.id)).toEqual(['tigers', 'white'])
  })
})
