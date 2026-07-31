import { describe, expect, it } from 'vitest'
import { eventEndsAt, isUpcoming, nextEvent, partitionEvents, relativeDayLabel } from './events'
import type { AcademyEvent } from './types'

const NOW = new Date('2026-08-01T12:00:00.000Z')

function event(overrides: Partial<AcademyEvent> & { id: string }): AcademyEvent {
  return {
    title: 'Event',
    startAt: '2026-08-10T15:00:00.000Z',
    allDay: false,
    description: 'Description',
    featured: false,
    published: true,
    publishedAt: '2026-07-01T00:00:00.000Z',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('eventEndsAt', () => {
  it('uses the end time when one is given', () => {
    const item = event({ id: 'a', endAt: '2026-08-10T17:00:00.000Z' })
    expect(eventEndsAt(item)).toBe(Date.parse('2026-08-10T17:00:00.000Z'))
  })

  it('falls back to the start time for a timed event', () => {
    expect(eventEndsAt(event({ id: 'a' }))).toBe(Date.parse('2026-08-10T15:00:00.000Z'))
  })

  it('runs an all-day event to the end of its day', () => {
    const item = event({ id: 'a', allDay: true })
    expect(eventEndsAt(item)).toBe(Date.parse('2026-08-11T15:00:00.000Z'))
  })
})

describe('isUpcoming', () => {
  it('counts an event that has not finished as upcoming', () => {
    expect(isUpcoming(event({ id: 'a' }), NOW)).toBe(true)
  })

  it('counts a finished event as past', () => {
    expect(isUpcoming(event({ id: 'a', startAt: '2026-07-01T10:00:00.000Z' }), NOW)).toBe(false)
  })

  it('keeps an event that is happening right now in "upcoming"', () => {
    const running = event({
      id: 'a',
      startAt: '2026-08-01T11:00:00.000Z',
      endAt: '2026-08-01T13:00:00.000Z',
    })
    expect(isUpcoming(running, NOW)).toBe(true)
  })
})

describe('partitionEvents', () => {
  const events = [
    event({ id: 'soon', startAt: '2026-08-05T10:00:00.000Z' }),
    event({ id: 'later', startAt: '2026-09-05T10:00:00.000Z' }),
    event({ id: 'recent-past', startAt: '2026-07-20T10:00:00.000Z' }),
    event({ id: 'old-past', startAt: '2026-05-20T10:00:00.000Z' }),
    event({ id: 'draft', published: false, startAt: '2026-08-06T10:00:00.000Z' }),
    event({ id: 'unposted', publishedAt: '2026-12-01T00:00:00.000Z' }),
  ]

  it('sorts upcoming events soonest first', () => {
    expect(partitionEvents(events, NOW).upcoming.map((item) => item.id)).toEqual(['soon', 'later'])
  })

  it('sorts past events most recent first', () => {
    expect(partitionEvents(events, NOW).past.map((item) => item.id)).toEqual([
      'recent-past',
      'old-past',
    ])
  })

  it('excludes drafts and not-yet-posted events from both lists', () => {
    const { upcoming, past } = partitionEvents(events, NOW)
    const ids = [...upcoming, ...past].map((item) => item.id)
    expect(ids).not.toContain('draft')
    expect(ids).not.toContain('unposted')
  })

  it('returns empty lists when there is nothing to show', () => {
    expect(partitionEvents([], NOW)).toEqual({ upcoming: [], past: [] })
  })
})

describe('nextEvent', () => {
  it('prefers a featured upcoming event', () => {
    const events = [
      event({ id: 'sooner', startAt: '2026-08-02T10:00:00.000Z' }),
      event({ id: 'featured', startAt: '2026-08-20T10:00:00.000Z', featured: true }),
    ]
    expect(nextEvent(events, NOW)?.id).toBe('featured')
  })

  it('falls back to the soonest event when none is featured', () => {
    const events = [
      event({ id: 'later', startAt: '2026-09-02T10:00:00.000Z' }),
      event({ id: 'sooner', startAt: '2026-08-02T10:00:00.000Z' }),
    ]
    expect(nextEvent(events, NOW)?.id).toBe('sooner')
  })

  it('returns undefined when nothing is coming up', () => {
    expect(nextEvent([event({ id: 'past', startAt: '2020-01-01T00:00:00Z' })], NOW)).toBeUndefined()
  })
})

describe('relativeDayLabel', () => {
  const base = new Date(2026, 7, 1, 12)

  it('describes near dates in plain language', () => {
    expect(relativeDayLabel(new Date(2026, 7, 1, 18).toISOString(), base)).toBe('Today')
    expect(relativeDayLabel(new Date(2026, 7, 2, 9).toISOString(), base)).toBe('Tomorrow')
    expect(relativeDayLabel(new Date(2026, 7, 4, 9).toISOString(), base)).toBe('In 3 days')
    expect(relativeDayLabel(new Date(2026, 6, 31, 9).toISOString(), base)).toBe('Yesterday')
  })

  it('says nothing for distant dates', () => {
    expect(relativeDayLabel(new Date(2027, 0, 1).toISOString(), base)).toBe('')
  })

  it('is safe with invalid input', () => {
    expect(relativeDayLabel('not a date', base)).toBe('')
  })
})
