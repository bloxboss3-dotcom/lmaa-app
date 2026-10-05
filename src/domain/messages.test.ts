import { describe, expect, it } from 'vitest'
import {
  MESSAGE_LIMITS,
  looksReachable,
  messageMailto,
  normalizeMessage,
  replyHref,
  validateMessage,
} from './messages'
import type { ContactMessageDraft } from './types'

const good: ContactMessageDraft = {
  name: '  Jordan Rivera ',
  contact: ' jordan@example.com ',
  topic: 'trial',
  body: '  My son is seven and would like to try a class. Which day suits a beginner?  ',
}

describe('validateMessage', () => {
  it('accepts a complete message', () => {
    expect(validateMessage(good)).toEqual({})
  })

  it('needs a name, a way to reply, and a real message', () => {
    const errors = validateMessage({ name: 'J', contact: '', topic: 'general', body: 'hi' })
    expect(errors.name).toMatch(/name/i)
    expect(errors.contact).toMatch(/email address or phone number/i)
    expect(errors.body).toMatch(/few more words/i)
  })

  it('refuses contact details nobody could reply to', () => {
    expect(validateMessage({ ...good, contact: 'see you at class' }).contact).toMatch(
      /does not look like/i,
    )
  })

  it('keeps every field inside the database limits', () => {
    expect(validateMessage({ ...good, name: 'x'.repeat(MESSAGE_LIMITS.name + 1) }).name).toMatch(
      /under 80/i,
    )
    expect(validateMessage({ ...good, body: 'x'.repeat(MESSAGE_LIMITS.body + 1) }).body).toMatch(
      /under 2000/i,
    )
  })
})

describe('looksReachable', () => {
  it('recognises email addresses and US phone numbers in the ways people type them', () => {
    expect(looksReachable('parent@example.com')).toBe(true)
    expect(looksReachable('(503) 682-2318')).toBe(true)
    expect(looksReachable('503.682.2318')).toBe(true)
    expect(looksReachable('+1 503 682 2318')).toBe(true)
    expect(looksReachable('call me')).toBe(false)
    expect(looksReachable('12345')).toBe(false)
  })
})

describe('messageMailto', () => {
  it('writes the whole email so the family only has to press Send', () => {
    const href = messageMailto('lmaa.wilsonville@gmail.com', good)
    expect(href.startsWith('mailto:lmaa.wilsonville@gmail.com?subject=')).toBe(true)
    const url = new URL(href)
    expect(url.searchParams.get('subject')).toBe(
      'Trying a class — from Jordan Rivera (via the LMAA app)',
    )
    const body = url.searchParams.get('body') ?? ''
    expect(body).toContain('My son is seven')
    expect(body).toContain('Reply to: jordan@example.com')
  })

  it('trims what it sends', () => {
    expect(normalizeMessage(good)).toEqual({
      name: 'Jordan Rivera',
      contact: 'jordan@example.com',
      topic: 'trial',
      body: 'My son is seven and would like to try a class. Which day suits a beginner?',
    })
  })
})

describe('replyHref', () => {
  it('turns an email into a mail link with the subject and a phone number into a call link', () => {
    expect(replyHref('parent@example.com', 'Re: Trying a class')).toBe(
      'mailto:parent@example.com?subject=Re%3A%20Trying%20a%20class',
    )
    expect(replyHref('(503) 682-2318')).toBe('tel:5036822318')
    expect(replyHref('ask at the desk')).toBeUndefined()
  })
})
