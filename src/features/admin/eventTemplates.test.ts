import { describe, expect, it } from 'vitest'
import { EVENT_TEMPLATES, applyTemplate, toDateTimeLocal } from './eventTemplates'

const NOW = new Date(2026, 7, 13, 14, 30) // Thu 13 Aug 2026, 2:30pm local

describe('toDateTimeLocal', () => {
  it('formats for a datetime-local input in LOCAL time, not UTC', () => {
    // Using toISOString() here would shift the date for anyone west of GMT and
    // silently schedule events on the wrong day.
    expect(toDateTimeLocal(new Date(2026, 0, 5, 9, 7))).toBe('2026-01-05T09:07')
  })

  it('pads single-digit months, days, hours and minutes', () => {
    expect(toDateTimeLocal(new Date(2026, 8, 3, 4, 5))).toBe('2026-09-03T04:05')
  })
})

describe('applyTemplate', () => {
  const beltTest = EVENT_TEMPLATES.find((template) => template.id === 'belt-testing')!

  it('always dates the event in the future', () => {
    const values = applyTemplate(beltTest, NOW)
    expect(new Date(String(values.startAt)).getTime()).toBeGreaterThan(NOW.getTime())
  })

  it('uses the template’s suggested time of day', () => {
    const values = applyTemplate(beltTest, NOW)
    expect(String(values.startAt)).toBe('2026-08-20T17:30')
  })

  it('ends after it starts', () => {
    const values = applyTemplate(beltTest, NOW)
    expect(String(values.endAt) > String(values.startAt)).toBe(true)
    expect(String(values.endAt)).toBe('2026-08-20T19:30')
  })

  it('saves as a draft so a template can never publish itself', () => {
    for (const template of EVENT_TEMPLATES) {
      expect(applyTemplate(template, NOW).published).toBe(false)
    }
  })

  it('gives an all-day template no end time', () => {
    const closure = EVENT_TEMPLATES.find((template) => template.id === 'closure')!
    const values = applyTemplate(closure, NOW)
    expect(values.allDay).toBe(true)
    expect(values.endAt).toBeUndefined()
  })

  it('fills in the fields the events form requires', () => {
    for (const template of EVENT_TEMPLATES) {
      const values = applyTemplate(template, NOW)
      expect(String(values.title)).not.toBe('')
      expect(String(values.description)).not.toBe('')
      expect(values.startAt).toBeTruthy()
    }
  })
})

describe('the template list itself', () => {
  it('has unique ids', () => {
    const ids = EVENT_TEMPLATES.map((template) => template.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('never carries a hard-coded date, so nothing is invented for the academy', () => {
    for (const template of EVENT_TEMPLATES) {
      expect(`${template.title} ${template.description}`).not.toMatch(
        /\b(20\d\d|january|february|march|april|june|july|august|september|october|november|december)\b/i,
      )
    }
  })
})
