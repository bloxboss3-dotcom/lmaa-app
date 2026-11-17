import { describe, expect, it } from 'vitest'
import type { AcademyEvent } from './types'
import {
  LITTLE_TIGER_RANKS,
  MAIN_RANKS,
  beltColours,
  isBlackBeltClubCandidate,
  isNewStudent,
  isReadyToTest,
  ladderPosition,
  nextRank,
  nextTestEvent,
  parseEmailList,
  rankLabel,
  studentDisplayName,
  validateStudent,
  type StudentDraft,
} from './students'

const draft = (patch: Partial<StudentDraft> = {}): StudentDraft => ({
  firstName: 'Zz Readykid',
  lastInitial: 'A',
  rank: 'white',
  stripes: 0,
  guardianEmails: [],
  active: true,
  ...patch,
})

describe('the belt ladders', () => {
  it('has thirteen belts from white to black, with no senior yellow', () => {
    expect(MAIN_RANKS).toHaveLength(13)
    expect(MAIN_RANKS[0]).toBe('white')
    expect(MAIN_RANKS.at(-1)).toBe('black')
    expect(MAIN_RANKS).not.toContain('senior_yellow')
  })

  it('moves up one belt at a time and stops at black', () => {
    expect(nextRank('white')).toBe('yellow')
    expect(nextRank('orange')).toBe('senior_orange')
    expect(nextRank('senior_red')).toBe('black')
    expect(nextRank('black')).toBeNull()
  })

  it('never moves a Little Tiger onto the main ladder by itself', () => {
    expect(LITTLE_TIGER_RANKS).toHaveLength(6)
    expect(nextRank('tiger_red')).toBe('tiger_black')
    expect(nextRank('tiger_black')).toBeNull()
  })

  it('names belts the way the academy does', () => {
    expect(rankLabel('senior_green')).toBe('Senior green belt')
    expect(rankLabel('tiger_yellow')).toBe('Little Tigers yellow stripe')
    expect(ladderPosition('yellow')).toEqual({ step: 2, of: 13 })
    expect(ladderPosition('tiger_white')).toEqual({ step: 1, of: 6 })
  })

  it('draws a senior belt with the next colour and a Little Tigers belt on white', () => {
    expect(beltColours('green').stripe).toBeUndefined()
    expect(beltColours('senior_orange').stripe).toBe(beltColours('green').belt)
    expect(beltColours('tiger_blue').belt).toBe(beltColours('white').belt)
    expect(beltColours('tiger_blue').stripe).toBe(beltColours('blue').belt)
  })
})

describe('what a belt and its stripes mean', () => {
  it('is ready to test only with all three stripes', () => {
    expect(isReadyToTest({ rank: 'white', stripes: 2 })).toBe(false)
    expect(isReadyToTest({ rank: 'white', stripes: 3 })).toBe(true)
    expect(isReadyToTest({ rank: 'black', stripes: 3 })).toBe(false)
  })

  it('treats a white belt and a Little Tigers white belt as new', () => {
    expect(isNewStudent({ rank: 'white' })).toBe(true)
    expect(isNewStudent({ rank: 'tiger_white' })).toBe(true)
    expect(isNewStudent({ rank: 'yellow' })).toBe(false)
  })

  it('mentions Black Belt Club only to orange, senior orange and green on the 1-year plan', () => {
    expect(isBlackBeltClubCandidate({ rank: 'orange', plan: 'one_year' })).toBe(true)
    expect(isBlackBeltClubCandidate({ rank: 'green', plan: 'one_year' })).toBe(true)
    expect(isBlackBeltClubCandidate({ rank: 'green', plan: 'black_belt_club' })).toBe(false)
    expect(isBlackBeltClubCandidate({ rank: 'yellow', plan: 'one_year' })).toBe(false)
    expect(isBlackBeltClubCandidate({ rank: 'orange' })).toBe(false)
  })

  it('shows a first name and a last initial, never a surname', () => {
    expect(studentDisplayName({ firstName: ' Zz Readykid ', lastInitial: 'a' })).toBe(
      'Zz Readykid A.',
    )
  })
})

describe('validating what staff type', () => {
  it('accepts a complete student', () => {
    expect(validateStudent(draft({ guardianEmails: ['parent@example.com'] }))).toEqual({})
  })

  it('refuses a surname in either name box', () => {
    expect(validateStudent(draft({ lastInitial: 'Smith' })).lastInitial).toBeDefined()
    expect(validateStudent(draft({ firstName: 'Zz Mary Jane Smith' })).firstName).toBeDefined()
  })

  it('refuses a fourth stripe and a belt the academy does not use', () => {
    expect(validateStudent(draft({ stripes: 4 })).stripes).toBeDefined()
    expect(validateStudent(draft({ rank: 'senior_yellow' as never })).rank).toBeDefined()
  })

  it('names the address that is not an email', () => {
    expect(
      validateStudent(draft({ guardianEmails: ['ok@example.com', 'nope'] })).guardianEmails,
    ).toMatch(/nope/)
  })

  it('cleans a pasted list of parent emails', () => {
    expect(parseEmailList(' Mum@Example.com,\ndad@example.com  mum@example.com ')).toEqual([
      'mum@example.com',
      'dad@example.com',
    ])
  })
})

describe('the next test date', () => {
  const event = (title: string, startAt: string, published = true): AcademyEvent => ({
    id: title,
    title,
    startAt,
    allDay: true,
    description: '',
    featured: false,
    published,
    publishedAt: '2026-01-01T00:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  })
  const now = new Date('2026-11-17T12:00:00Z')

  it('finds the soonest published test that has not happened yet', () => {
    const events = [
      event('Holiday potluck', '2026-12-18T00:00:00Z'),
      event('Belt testing', '2027-03-13T00:00:00Z'),
      event('Belt testing', '2026-12-12T00:00:00Z'),
      event('Belt Testing', '2026-09-12T00:00:00Z'),
      event('Black belt test', '2026-11-20T00:00:00Z', false),
    ]
    expect(nextTestEvent(events, now)?.startAt).toBe('2026-12-12T00:00:00Z')
  })

  it('says nothing when the academy has not posted a test', () => {
    expect(nextTestEvent([event('Holiday potluck', '2026-12-18T00:00:00Z')], now)).toBeUndefined()
  })
})
