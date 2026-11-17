import type { AcademyEvent, IsoDateTime, Sampleable } from './types'
import { isUpcoming } from './events'

/**
 * Students and their belts, for the family accounts.
 *
 * This is the only part of the app that holds anything about a child, so it
 * holds as little as it can: a first name, a last initial, the belt, the
 * stripes on it, a class count and the membership plan. No birthday, no
 * address, no photograph. The ladder and the rules below are the academy's
 * own; nothing here decides what a belt requires.
 */

/** White to black, in the academy's order. A senior belt follows its colour. */
export const MAIN_RANKS = [
  'white',
  'yellow',
  'orange',
  'senior_orange',
  'green',
  'senior_green',
  'blue',
  'senior_blue',
  'brown',
  'senior_brown',
  'red',
  'senior_red',
  'black',
] as const

/** Little Tigers wear a white belt, then a white belt with one coloured stripe. */
export const LITTLE_TIGER_RANKS = [
  'tiger_white',
  'tiger_yellow',
  'tiger_green',
  'tiger_blue',
  'tiger_red',
  'tiger_black',
] as const

export const STUDENT_RANKS = [...LITTLE_TIGER_RANKS, ...MAIN_RANKS] as const
export type StudentRank = (typeof STUDENT_RANKS)[number]

export const STUDENT_PLANS = ['one_year', 'black_belt_club'] as const
export type StudentPlan = (typeof STUDENT_PLANS)[number]

/** A student needs this many stripes on their belt before they can test. */
export const STRIPES_TO_TEST = 3

/** What a signed-in parent sees about their own child. */
export interface Student extends Sampleable {
  id: string
  firstName: string
  /** One letter. The app never holds a child's full surname. */
  lastInitial: string
  rank: StudentRank
  /** Stripes on the current belt, 0 to 3. */
  stripes: number
  /** Absent until the academy's records supply it. */
  classesAttended?: number
  plan?: StudentPlan
  updatedAt: IsoDateTime
}

/** A student as staff see it: the same record plus who may view it. */
export interface StudentRecord extends Student {
  /** Parents' sign-in emails, lower case. */
  guardianEmails: string[]
  /** False once a student has left; hidden from parents, kept for staff. */
  active: boolean
}

export type StudentDraft = Omit<StudentRecord, 'id' | 'updatedAt' | 'isSample'> & { id?: string }

const MAIN_LABELS: Record<(typeof MAIN_RANKS)[number], string> = {
  white: 'White belt',
  yellow: 'Yellow belt',
  orange: 'Orange belt',
  senior_orange: 'Senior orange belt',
  green: 'Green belt',
  senior_green: 'Senior green belt',
  blue: 'Blue belt',
  senior_blue: 'Senior blue belt',
  brown: 'Brown belt',
  senior_brown: 'Senior brown belt',
  red: 'Red belt',
  senior_red: 'Senior red belt',
  black: 'Black belt',
}

const TIGER_LABELS: Record<(typeof LITTLE_TIGER_RANKS)[number], string> = {
  tiger_white: 'Little Tigers white belt',
  tiger_yellow: 'Little Tigers yellow stripe',
  tiger_green: 'Little Tigers green stripe',
  tiger_blue: 'Little Tigers blue stripe',
  tiger_red: 'Little Tigers red stripe',
  tiger_black: 'Little Tigers black stripe',
}

export function isStudentRank(value: unknown): value is StudentRank {
  return typeof value === 'string' && (STUDENT_RANKS as readonly string[]).includes(value)
}

export function isLittleTiger(rank: StudentRank): boolean {
  return rank.startsWith('tiger_')
}

export function rankLabel(rank: StudentRank): string {
  return isLittleTiger(rank)
    ? TIGER_LABELS[rank as (typeof LITTLE_TIGER_RANKS)[number]]
    : MAIN_LABELS[rank as (typeof MAIN_RANKS)[number]]
}

export const PLAN_LABELS: Record<StudentPlan, string> = {
  one_year: '1-year plan',
  black_belt_club: 'Black Belt Club',
}

/**
 * The belt after this one, within the same ladder.
 *
 * A Little Tiger with a black stripe has no "next" here on purpose: moving up
 * to the main white belt is the instructors' decision, never an automatic step.
 */
export function nextRank(rank: StudentRank): StudentRank | null {
  const ladder: readonly StudentRank[] = isLittleTiger(rank) ? LITTLE_TIGER_RANKS : MAIN_RANKS
  const index = ladder.indexOf(rank)
  return index >= 0 && index < ladder.length - 1 ? ladder[index + 1] : null
}

/** "3 of 13": where this belt sits on its own ladder. */
export function ladderPosition(rank: StudentRank): { step: number; of: number } {
  const ladder: readonly StudentRank[] = isLittleTiger(rank) ? LITTLE_TIGER_RANKS : MAIN_RANKS
  return { step: ladder.indexOf(rank) + 1, of: ladder.length }
}

export function clampStripes(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(STRIPES_TO_TEST, Math.max(0, Math.round(value)))
}

/** All three stripes on the belt. The stripe forms are checked at the desk. */
export function isReadyToTest(student: Pick<Student, 'rank' | 'stripes'>): boolean {
  return student.rank !== 'black' && student.stripes >= STRIPES_TO_TEST
}

/** A brand-new white belt or Little Tiger: the family the guide is written for. */
export function isNewStudent(student: Pick<Student, 'rank'>): boolean {
  return student.rank === 'white' || student.rank === 'tiger_white'
}

/**
 * Orange, senior orange and green belts on the 1-year plan: the students the
 * academy invites to Black Belt Club, because that plan ends at green belt.
 */
export function isBlackBeltClubCandidate(student: Pick<Student, 'rank' | 'plan'>): boolean {
  return (
    student.plan === 'one_year' &&
    (student.rank === 'orange' || student.rank === 'senior_orange' || student.rank === 'green')
  )
}

export function studentDisplayName(student: Pick<Student, 'firstName' | 'lastInitial'>): string {
  const initial = student.lastInitial.trim().charAt(0).toUpperCase()
  return initial ? `${student.firstName.trim()} ${initial}.` : student.firstName.trim()
}

/* ------------------------------------------------------------- belt colours */

export interface BeltColours {
  /** The belt itself. */
  belt: string
  /** The stripe running along it, for senior and Little Tigers belts. */
  stripe?: string
}

const COLOUR = {
  white: '#f4f1ea',
  yellow: '#f2c230',
  orange: '#ea7a1e',
  green: '#2f8f4e',
  blue: '#1e4f9e',
  brown: '#6b4226',
  red: '#c8102e',
  black: '#14161c',
} as const

/**
 * A senior belt carries a stripe of the next colour; a Little Tigers belt is
 * white with one coloured stripe. Both confirmed by the academy.
 */
export function beltColours(rank: StudentRank): BeltColours {
  switch (rank) {
    case 'tiger_white':
      return { belt: COLOUR.white }
    case 'tiger_yellow':
      return { belt: COLOUR.white, stripe: COLOUR.yellow }
    case 'tiger_green':
      return { belt: COLOUR.white, stripe: COLOUR.green }
    case 'tiger_blue':
      return { belt: COLOUR.white, stripe: COLOUR.blue }
    case 'tiger_red':
      return { belt: COLOUR.white, stripe: COLOUR.red }
    case 'tiger_black':
      return { belt: COLOUR.white, stripe: COLOUR.black }
    case 'senior_orange':
      return { belt: COLOUR.orange, stripe: COLOUR.green }
    case 'senior_green':
      return { belt: COLOUR.green, stripe: COLOUR.blue }
    case 'senior_blue':
      return { belt: COLOUR.blue, stripe: COLOUR.brown }
    case 'senior_brown':
      return { belt: COLOUR.brown, stripe: COLOUR.red }
    case 'senior_red':
      return { belt: COLOUR.red, stripe: COLOUR.black }
    default:
      return { belt: COLOUR[rank] }
  }
}

/* -------------------------------------------------------------- validation */

export const EMAIL_MAX = 254
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

export function isValidEmail(value: string): boolean {
  const email = normalizeEmail(value)
  return email.length <= EMAIL_MAX && EMAIL_PATTERN.test(email)
}

/** Splits what staff typed (commas, spaces or new lines) into clean addresses. */
export function parseEmailList(value: string): string[] {
  return [
    ...new Set(
      value
        .split(/[\s,;]+/)
        .map(normalizeEmail)
        .filter(Boolean),
    ),
  ]
}

export type StudentErrors = Partial<
  Record<
    'firstName' | 'lastInitial' | 'rank' | 'stripes' | 'classesAttended' | 'guardianEmails',
    string
  >
>

export function validateStudent(draft: StudentDraft): StudentErrors {
  const errors: StudentErrors = {}
  const firstName = draft.firstName.trim()
  if (!firstName) errors.firstName = 'First name is required.'
  else if (firstName.length > 40) errors.firstName = 'Keep the first name under 40 characters.'
  else if (/\s\S+\s\S/.test(firstName) || /\d/.test(firstName))
    errors.firstName = 'First name only, please. No surnames or numbers.'

  if (!/^[A-Za-z]$/.test(draft.lastInitial.trim()))
    errors.lastInitial = 'One letter: the first letter of the last name.'

  if (!isStudentRank(draft.rank)) errors.rank = 'Choose a belt.'

  if (!Number.isInteger(draft.stripes) || draft.stripes < 0 || draft.stripes > STRIPES_TO_TEST)
    errors.stripes = 'Stripes are 0 to 3.'

  if (
    draft.classesAttended !== undefined &&
    (!Number.isInteger(draft.classesAttended) ||
      draft.classesAttended < 0 ||
      draft.classesAttended > 100000)
  )
    errors.classesAttended = 'Classes attended must be a whole number.'

  const bad = draft.guardianEmails.filter((email) => !isValidEmail(email))
  if (bad.length) errors.guardianEmails = `Not an email address: ${bad.join(', ')}`
  else if (draft.guardianEmails.length > 6)
    errors.guardianEmails = 'A student can have up to 6 parent emails.'

  return errors
}

/* ---------------------------------------------------------------- testing */

/** The next published event with "test" in its title, if the academy has posted one. */
export function nextTestEvent(
  events: AcademyEvent[],
  now: Date = new Date(),
): AcademyEvent | undefined {
  return events
    .filter((event) => event.published && /\btest/i.test(event.title) && isUpcoming(event, now))
    .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt))[0]
}
