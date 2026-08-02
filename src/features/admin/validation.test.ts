import { describe, expect, it } from 'vitest'
import {
  endAfterStart,
  endDateAfterStart,
  expiresAfterPublish,
  hasErrors,
  slugify,
  validateValues,
  type FieldDef,
} from './validation'
import { COLLECTIONS, findCollection } from './collections'

describe('validateValues', () => {
  const fields: FieldDef[] = [
    { name: 'title', label: 'Headline', type: 'text', required: true },
    { name: 'count', label: 'Order', type: 'number' },
    { name: 'link', label: 'Button link', type: 'url' },
    { name: 'startTime', label: 'Starts', type: 'time' },
    { name: 'postAt', label: 'Post at', type: 'datetime' },
  ]

  it('accepts a valid form', () => {
    const errors = validateValues(fields, {
      title: 'Belt testing',
      count: 3,
      link: 'https://example.com/x',
      startTime: '16:25',
      postAt: '2026-08-01T09:00',
    })
    expect(errors).toEqual({})
    expect(hasErrors(errors)).toBe(false)
  })

  it('requires required fields and names them in plain language', () => {
    const errors = validateValues(fields, { title: '   ' })
    expect(errors.title).toBe('Headline is required.')
  })

  it('rejects a web address that is not a real link', () => {
    expect(validateValues(fields, { title: 'x', link: 'example.com' }).link).toMatch(/https:\/\//)
    expect(validateValues(fields, { title: 'x', link: 'javascript:alert(1)' }).link).toBeDefined()
  })

  it('allows internal app links for action buttons', () => {
    expect(validateValues(fields, { title: 'x', link: '#/schedule' }).link).toBeUndefined()
  })

  it('rejects times that are not real clock times', () => {
    expect(validateValues(fields, { title: 'x', startTime: '25:00' }).startTime).toBeDefined()
    expect(validateValues(fields, { title: 'x', startTime: '4pm' }).startTime).toBeDefined()
    expect(validateValues(fields, { title: 'x', startTime: '09:05' }).startTime).toBeUndefined()
  })

  it('rejects unparseable dates and numbers', () => {
    expect(validateValues(fields, { title: 'x', postAt: 'sometime' }).postAt).toBeDefined()
    expect(validateValues(fields, { title: 'x', count: 'three' }).count).toBeDefined()
  })

  it('skips validation for hidden fields', () => {
    const conditional: FieldDef[] = [
      { name: 'status', label: 'Status', type: 'select' },
      {
        name: 'newStartTime',
        label: 'New start time',
        type: 'time',
        required: true,
        visibleWhen: (values) => values.status === 'changed',
      },
    ]
    expect(validateValues(conditional, { status: 'scheduled' })).toEqual({})
    expect(validateValues(conditional, { status: 'changed' }).newStartTime).toBeDefined()
  })

  it('leaves optional empty fields alone', () => {
    expect(validateValues(fields, { title: 'x', link: '', startTime: '' })).toEqual({})
  })
})

describe('cross-field rules', () => {
  it('requires an end time after the start time', () => {
    const rule = endAfterStart('startTime', 'endTime')
    expect(rule({ startTime: '16:00', endTime: '16:40' })).toBeUndefined()
    expect(rule({ startTime: '16:00', endTime: '15:40' })).toBeDefined()
    expect(rule({ startTime: '16:00', endTime: '16:00' })).toBeDefined()
    expect(rule({ startTime: '16:00' })).toBeUndefined()
  })

  it('requires an event to end after it starts', () => {
    const rule = endDateAfterStart('startAt', 'endAt')
    expect(rule({ startAt: '2026-08-01T10:00', endAt: '2026-08-01T12:00' })).toBeUndefined()
    expect(rule({ startAt: '2026-08-01T10:00', endAt: '2026-07-01T12:00' })).toBeDefined()
  })

  it('requires an expiry after the posting time', () => {
    const rule = expiresAfterPublish('publishedAt', 'expiresAt')
    expect(rule({ publishedAt: '2026-08-01T10:00', expiresAt: '2026-08-09T10:00' })).toBeUndefined()
    expect(rule({ publishedAt: '2026-08-01T10:00', expiresAt: '2026-07-09T10:00' })).toBeDefined()
    expect(rule({ publishedAt: '2026-08-01T10:00' })).toBeUndefined()
  })
})

describe('slugify', () => {
  it('makes a safe key from a name', () => {
    expect(slugify('Children White Belt')).toBe('children-white-belt')
    expect(slugify('  Teen & Adult!  ')).toBe('teen-adult')
  })
})

describe('collection definitions', () => {
  it('round-trips a schedule entry through the form and back', () => {
    const schedule = findCollection('schedule')!
    const values = {
      ...schedule.defaults({ programs: [] }),
      className: 'Little Tigers',
      dayOfWeek: '3',
      startTime: '16:25',
      endTime: '16:55',
      programSlug: 'little-tigers',
    }
    expect(validateValues(schedule.fields({ programs: [] }), values)).toEqual({})
    const draft = schedule.toDraft(values) as unknown as {
      className: string
      dayOfWeek: number
      startTime: string
      programSlug?: string
    }
    expect(draft).toMatchObject({
      className: 'Little Tigers',
      dayOfWeek: 3,
      startTime: '16:25',
      programSlug: 'little-tigers',
    })
  })

  it('catches an announcement saved without a headline', () => {
    const announcements = findCollection('announcements')!
    const errors = validateValues(
      announcements.fields({ programs: [] }),
      announcements.defaults({ programs: [] }),
    )
    expect(errors.title).toBeDefined()
    expect(errors.body).toBeDefined()
  })

  it('gives every collection a unique route key and required plumbing', () => {
    const keys = COLLECTIONS.map((collection) => collection.key)
    expect(new Set(keys).size).toBe(keys.length)
    for (const collection of COLLECTIONS) {
      expect(collection.title).toBeTruthy()
      expect(collection.singular).toBeTruthy()
      expect(collection.fields({ programs: [] }).length).toBeGreaterThan(0)
      // Every collection must expose a publish toggle so drafts are possible.
      expect(
        collection.fields({ programs: [] }).some((field) => field.name === 'published'),
      ).toBe(true)
    }
  })
})
