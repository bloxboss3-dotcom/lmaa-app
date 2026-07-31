import { describe, expect, it } from 'vitest'
import { buildEventIcs, escapeIcsText, foldLine, icsFileName, toIcsDate, toIcsUtc } from './calendar'
import type { AcademyEvent } from './types'

const NOW = new Date('2026-08-01T12:00:00.000Z')

function event(overrides: Partial<AcademyEvent> & { id: string }): AcademyEvent {
  return {
    title: 'Belt Testing',
    startAt: '2026-08-10T15:00:00.000Z',
    endAt: '2026-08-10T17:30:00.000Z',
    allDay: false,
    description: 'Bring your uniform.',
    featured: false,
    published: true,
    publishedAt: '2026-07-01T00:00:00.000Z',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('escapeIcsText', () => {
  it('escapes the characters RFC 5545 reserves', () => {
    expect(escapeIcsText('a,b;c\\d')).toBe('a\\,b\\;c\\\\d')
    expect(escapeIcsText('line one\nline two')).toBe('line one\\nline two')
    expect(escapeIcsText('windows\r\nnewline')).toBe('windows\\nnewline')
  })
})

describe('foldLine', () => {
  it('leaves short lines alone', () => {
    expect(foldLine('SUMMARY:Short')).toBe('SUMMARY:Short')
  })

  it('folds long lines with a leading space on continuations', () => {
    const folded = foldLine(`DESCRIPTION:${'x'.repeat(200)}`)
    const lines = folded.split('\r\n')
    expect(lines.length).toBeGreaterThan(1)
    expect(lines[0]).toHaveLength(75)
    for (const line of lines.slice(1)) expect(line.startsWith(' ')).toBe(true)
  })
})

describe('toIcsUtc / toIcsDate', () => {
  it('formats instants and dates the way calendars expect', () => {
    expect(toIcsUtc('2026-08-10T15:00:00.000Z')).toBe('20260810T150000Z')
    expect(toIcsDate('2026-08-10T15:00:00.000Z')).toBe('20260810')
  })
})

describe('buildEventIcs', () => {
  it('produces a complete, well-formed VCALENDAR', () => {
    const ics = buildEventIcs(event({ id: 'evt-1' }), { now: NOW })
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(ics).toContain('VERSION:2.0')
    expect(ics).toContain('BEGIN:VEVENT')
    expect(ics).toContain('END:VEVENT')
    expect(ics).toContain('UID:evt-1@leesmartialartsacademy.app')
    expect(ics).toContain('DTSTAMP:20260801T120000Z')
    expect(ics).toContain('DTSTART:20260810T150000Z')
    expect(ics).toContain('DTEND:20260810T173000Z')
    expect(ics).toContain('SUMMARY:Belt Testing')
  })

  it('uses CRLF line endings throughout', () => {
    const ics = buildEventIcs(event({ id: 'evt-1' }), { now: NOW })
    const bareNewlines = ics.split('\n').filter((line) => !line.endsWith('\r'))
    // Only the trailing empty string after the final CRLF may lack a \r.
    expect(bareNewlines).toEqual([''])
  })

  it('writes all-day events as DATE values ending the next day', () => {
    const ics = buildEventIcs(
      event({ id: 'evt-2', allDay: true, endAt: undefined, startAt: '2026-08-10T00:00:00.000Z' }),
      { now: NOW },
    )
    expect(ics).toContain('DTSTART;VALUE=DATE:20260810')
    expect(ics).toContain('DTEND;VALUE=DATE:20260811')
  })

  it('falls back to the start time when no end time is given', () => {
    const ics = buildEventIcs(event({ id: 'evt-3', endAt: undefined }), { now: NOW })
    expect(ics).toContain('DTSTART:20260810T150000Z')
    expect(ics).toContain('DTEND:20260810T150000Z')
  })

  it('escapes commas and semicolons in the summary and location', () => {
    const ics = buildEventIcs(
      event({ id: 'evt-4', title: 'Testing, Rank; Colour', location: 'Dojang, Main' }),
      { now: NOW },
    )
    expect(ics).toContain('SUMMARY:Testing\\, Rank\\; Colour')
    expect(ics).toContain('LOCATION:Dojang\\, Main')
  })

  it('joins location and address, and includes the registration link', () => {
    const ics = buildEventIcs(
      event({
        id: 'evt-5',
        location: 'LMAA',
        address: '1 Main St',
        registrationUrl: 'https://example.com/register',
      }),
      { now: NOW },
    )
    expect(ics).toContain('LOCATION:LMAA\\, 1 Main St')
    expect(ics).toContain('URL:https://example.com/register')
    expect(ics).toContain('Register: https://example.com/register')
  })

  it('omits optional properties that have no value', () => {
    const ics = buildEventIcs(event({ id: 'evt-6', description: '' }), { now: NOW })
    expect(ics).not.toContain('LOCATION:')
    expect(ics).not.toContain('DESCRIPTION:')
    expect(ics).not.toContain('URL:')
  })
})

describe('icsFileName', () => {
  it('builds a safe, readable file name', () => {
    expect(icsFileName(event({ id: 'a', title: 'Belt Testing: Autumn 2026!' }))).toBe(
      'lmaa-belt-testing-autumn-2026.ics',
    )
  })

  it('copes with a title that has no usable characters', () => {
    expect(icsFileName(event({ id: 'a', title: '***' }))).toBe('lmaa-event.ics')
  })
})
