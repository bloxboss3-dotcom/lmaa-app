import { minutesOfDay } from '@/domain/schedule'

/**
 * Admin form definitions and validation.
 *
 * Pure functions on purpose: form rules are the easiest thing in an app to get
 * subtly wrong, and they are worth testing directly.
 */

export type FieldType =
  'text' | 'textarea' | 'select' | 'checkbox' | 'number' | 'datetime' | 'date' | 'time' | 'url'

export type FormValues = Record<string, string | number | boolean | undefined>

export interface FieldDef {
  name: string
  label: string
  type: FieldType
  required?: boolean
  hint?: string
  placeholder?: string
  options?: { value: string; label: string }[]
  rows?: number
  /** Hide the field unless the form is in a particular state. */
  visibleWhen?: (values: FormValues) => boolean
  /** Field-level check that needs the whole form. Return a message to fail. */
  validate?: (values: FormValues) => string | undefined
  /** Full-width in the two column layout. */
  wide?: boolean
}

export type ValidationErrors = Record<string, string>

const URL_PATTERN = /^https?:\/\/.+/i
/** Images bundled with the app itself, e.g. `images/belts.jpg`. */
const APP_IMAGE_PATTERN = /^images\/[a-z0-9/_-]+\.(?:jpe?g|png|webp|svg)$/i
const TIME_PATTERN = /^([01]?\d|2[0-3]):[0-5]\d$/

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || String(value).trim() === ''
}

/**
 * Validates a set of values against field definitions.
 * Hidden fields are skipped so a conditional field can never block a save.
 */
export function validateValues(fields: FieldDef[], values: FormValues): ValidationErrors {
  const errors: ValidationErrors = {}

  for (const field of fields) {
    if (field.visibleWhen && !field.visibleWhen(values)) continue
    const value = values[field.name]

    if (field.required && field.type !== 'checkbox' && isBlank(value)) {
      errors[field.name] = `${field.label} is required.`
      continue
    }

    if (!isBlank(value)) {
      switch (field.type) {
        case 'url': {
          const text = String(value).trim()
          // Internal app links (used by announcement buttons) are allowed.
          if (!URL_PATTERN.test(text) && !text.startsWith('#/') && !APP_IMAGE_PATTERN.test(text)) {
            errors[field.name] = 'Enter a full web address starting with https://'
          }
          break
        }
        case 'number': {
          if (Number.isNaN(Number(value))) errors[field.name] = 'Enter a number.'
          break
        }
        case 'datetime':
        case 'date': {
          if (Number.isNaN(Date.parse(String(value)))) {
            errors[field.name] = 'Enter a valid date.'
          }
          break
        }
        case 'time': {
          if (!TIME_PATTERN.test(String(value))) errors[field.name] = 'Enter a time like 16:25.'
          break
        }
        default:
          break
      }
    }

    if (!errors[field.name] && field.validate) {
      const message = field.validate(values)
      if (message) errors[field.name] = message
    }
  }

  return errors
}

export function hasErrors(errors: ValidationErrors): boolean {
  return Object.keys(errors).length > 0
}

/* ------------------------------------------------- reusable cross-checks */

/** End time must come after start time. */
export function endAfterStart(startKey: string, endKey: string) {
  return (values: FormValues): string | undefined => {
    const start = values[startKey]
    const end = values[endKey]
    if (isBlank(start) || isBlank(end)) return undefined
    if (minutesOfDay(String(end)) <= minutesOfDay(String(start))) {
      return 'The end time must be after the start time.'
    }
    return undefined
  }
}

/** End date/time must come after the start date/time. */
export function endDateAfterStart(startKey: string, endKey: string) {
  return (values: FormValues): string | undefined => {
    const start = values[startKey]
    const end = values[endKey]
    if (isBlank(start) || isBlank(end)) return undefined
    const startMs = Date.parse(String(start))
    const endMs = Date.parse(String(end))
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) return undefined
    if (endMs <= startMs) return 'The end must be after the start.'
    return undefined
  }
}

/** Expiry, when set, has to be later than the publish time. */
export function expiresAfterPublish(publishKey: string, expiresKey: string) {
  return (values: FormValues): string | undefined => {
    const publish = values[publishKey]
    const expires = values[expiresKey]
    if (isBlank(publish) || isBlank(expires)) return undefined
    const publishMs = Date.parse(String(publish))
    const expiresMs = Date.parse(String(expires))
    if (Number.isNaN(publishMs) || Number.isNaN(expiresMs)) return undefined
    if (expiresMs <= publishMs) return 'The removal date must be after the posting date.'
    return undefined
  }
}

/** Lower-case, dash-separated key used in URLs. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
