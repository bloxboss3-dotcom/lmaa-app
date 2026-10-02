import { describe, expect, it } from 'vitest'
import { ACADEMY_TIME_ZONE, buildScheduleIcs } from './calendar'
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

const NOW = new Date(2026, 9, 7, 14, 0) // Wed 7 Oct 2026
const lines = (ics: string) => ics.split('\r\n')

describe('buildScheduleIcs', () => {
  const ics = buildScheduleIcs(
    [
      entry('mon', 'Level II', 1, '17:45', '18:25'),
      entry('wed', 'Little Tigers', 3, '16:25', '16:55', { ageRange: 'Ages 4–5' }),
    ],
    {
      now: NOW,
      domain: 'test.local',
      location: '8263 SW Wilsonville Rd',
      appUrl: 'https://example.test/app',
    },
  )

  it('is a well-formed calendar with CRLF endings and a VTIMEZONE for the TZID it uses', () => {
    expect(ics.endsWith('\r\n')).toBe(true)
    expect(ics).not.toMatch(/[^\r]\n/)
    expect(lines(ics)[0]).toBe('BEGIN:VCALENDAR')
    expect(ics).toContain(`TZID:${ACADEMY_TIME_ZONE}`)
    expect(ics).toContain('BEGIN:VTIMEZONE')
    expect(ics).toContain('TZNAME:PDT')
  })

  it('emits one repeating event per class, anchored on the next matching weekday', () => {
    // Wednesday today -> Monday is 5 days ahead (12 Oct); Wednesday is today.
    expect(ics).toContain(`DTSTART;TZID=${ACADEMY_TIME_ZONE}:20261012T174500`)
    expect(ics).toContain(`DTEND;TZID=${ACADEMY_TIME_ZONE}:20261012T182500`)
    expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO')
    expect(ics).toContain(`DTSTART;TZID=${ACADEMY_TIME_ZONE}:20261007T162500`)
    expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=WE')
  })

  it('writes wall-clock local times, never UTC-shifted ones', () => {
    expect(ics).not.toMatch(/DTSTART;TZID=[^:]+:\d{8}T\d{6}Z/)
  })

  it('uses stable unique UIDs, the location, and a description that points back to the app', () => {
    expect(ics).toContain('UID:mon@test.local')
    expect(ics).toContain('UID:wed@test.local')
    expect(ics).toContain('LOCATION:8263 SW Wilsonville Rd')
    expect(ics).toContain('Ages 4–5')
    expect(ics).toContain('https://example.test/app')
  })

  it('leaves out unpublished classes and classes cancelled until further notice', () => {
    const out = buildScheduleIcs(
      [
        entry('draft', 'Draft class', 2, '10:00', '11:00', { published: false }),
        entry('gone', 'Gone class', 2, '10:00', '11:00', { status: 'cancelled' }),
        entry('ok', 'Kept class', 2, '10:00', '11:00'),
      ],
      { now: NOW },
    )
    expect(out).not.toContain('Draft class')
    expect(out).not.toContain('Gone class')
    expect(out).toContain('SUMMARY:Kept class')
  })

  it('turns a one-date cancellation into an EXDATE rather than dropping the series', () => {
    const out = buildScheduleIcs(
      [
        entry('thu', 'Level I', 4, '16:15', '16:55', {
          status: 'cancelled',
          statusDate: '2026-10-15',
        }),
      ],
      { now: NOW },
    )
    expect(out).toContain('RRULE:FREQ=WEEKLY;BYDAY=TH')
    expect(out).toContain(`EXDATE;TZID=${ACADEMY_TIME_ZONE}:20261015T161500`)
  })

  it('skips an entry whose time is malformed instead of writing a broken event', () => {
    const out = buildScheduleIcs([entry('bad', 'Odd class', 1, '25:99', '26:00')], { now: NOW })
    expect(out).not.toContain('BEGIN:VEVENT')
    expect(out).toContain('END:VCALENDAR')
  })

  it('folds long lines at 75 octets', () => {
    const out = buildScheduleIcs([entry('long', 'A'.repeat(120), 1, '10:00', '11:00')], {
      now: NOW,
    })
    for (const line of lines(out)) expect(line.length).toBeLessThanOrEqual(75)
  })
})
