import type { ContactMessageDraft, MessageTopic } from './types'

/**
 * Messages from families to the academy.
 *
 * This is the one place a family types something into the app that leaves
 * their device, so the rules are explicit:
 *   - only what a reply needs: a name, one way to reach them, and the message;
 *   - bounded sizes, enforced here and again by the database;
 *   - no account, no child's details asked for, nothing stored on the phone.
 */

export const MESSAGE_TOPIC_LABELS: Record<MessageTopic, string> = {
  general: 'A general question',
  trial: 'Trying a class',
  schedule: 'The class schedule',
  events: 'Events, camps & parties',
  other: 'Something else',
}

/** Mirrored by the check constraints in supabase/migrations/0005_contact_messages.sql. */
export const MESSAGE_LIMITS = {
  name: 80,
  contact: 120,
  body: 2000,
  minBody: 10,
} as const

export interface MessageErrors {
  name?: string
  contact?: string
  body?: string
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
/** Seven or more digits once formatting is stripped — a phone number, not a typo. */
const PHONE_DIGITS = /^\+?\d{7,15}$/

/** True when the text is something the academy could actually reply to. */
export function looksReachable(value: string): boolean {
  const trimmed = value.trim()
  if (EMAIL.test(trimmed)) return true
  return PHONE_DIGITS.test(trimmed.replace(/[\s().-]/g, ''))
}

export function validateMessage(draft: ContactMessageDraft): MessageErrors {
  const errors: MessageErrors = {}
  const name = draft.name.trim()
  const contact = draft.contact.trim()
  const body = draft.body.trim()

  if (name.length < 2) errors.name = 'Please tell us your name.'
  else if (name.length > MESSAGE_LIMITS.name)
    errors.name = `Please keep your name under ${MESSAGE_LIMITS.name} characters.`

  if (!contact) errors.contact = 'Please add an email address or phone number so we can reply.'
  else if (contact.length > MESSAGE_LIMITS.contact)
    errors.contact = `Please keep this under ${MESSAGE_LIMITS.contact} characters.`
  else if (!looksReachable(contact))
    errors.contact = 'That does not look like an email address or phone number.'

  if (body.length < MESSAGE_LIMITS.minBody) errors.body = 'Please write a few more words.'
  else if (body.length > MESSAGE_LIMITS.body)
    errors.body = `Please keep your message under ${MESSAGE_LIMITS.body} characters.`

  return errors
}

/** Trims every field so what is sent is exactly what was validated. */
export function normalizeMessage(draft: ContactMessageDraft): ContactMessageDraft {
  return {
    name: draft.name.trim(),
    contact: draft.contact.trim(),
    topic: draft.topic,
    body: draft.body.trim(),
  }
}

/**
 * Without a backend the app cannot deliver a message itself, so it hands the
 * family's own mail app a finished email instead — addressed, titled and
 * written — rather than pretending to send anything.
 */
export function messageMailto(academyEmail: string, draft: ContactMessageDraft): string {
  const clean = normalizeMessage(draft)
  const subject = `${MESSAGE_TOPIC_LABELS[clean.topic]} — from ${clean.name} (via the LMAA app)`
  const body = `${clean.body}\n\n— ${clean.name}\nReply to: ${clean.contact}`
  return `mailto:${academyEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

/** A reply link for staff: email addresses get a mail link, phone numbers a call link. */
export function replyHref(contact: string, subject?: string): string | undefined {
  const trimmed = contact.trim()
  if (EMAIL.test(trimmed)) {
    return subject
      ? `mailto:${trimmed}?subject=${encodeURIComponent(subject)}`
      : `mailto:${trimmed}`
  }
  const digits = trimmed.replace(/[\s().-]/g, '')
  if (PHONE_DIGITS.test(digits)) return `tel:${digits}`
  return undefined
}
