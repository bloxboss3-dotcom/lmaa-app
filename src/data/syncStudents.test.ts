import { describe, expect, it } from 'vitest'
import { STUDENT_PLANS, STUDENT_RANKS } from '@/domain/students'
import {
  SYNC_PLANS,
  SYNC_RANKS,
  parseSyncPayload,
  type ParsedSync,
} from '../../supabase/functions/sync-students/validate'

/**
 * The checks the sync-students Edge Function runs on what Dojang OS sends.
 * Tested here because the function's own runtime (Deno) is not part of the
 * app's test run; the checking code is written to run in both.
 */
const good = {
  external_id: 'zz-1',
  first_name: ' Zz Readykid ',
  last_initial: 'a',
  rank: 'white',
  stripes: 2,
}

const parse = (students: unknown[]): ParsedSync => {
  const parsed = parseSyncPayload({ students })
  if (typeof parsed === 'string') throw new Error(parsed)
  return parsed
}

describe('what Dojang OS may send', () => {
  it('uses exactly the belts and plans the app does', () => {
    expect([...SYNC_RANKS]).toEqual([...STUDENT_RANKS])
    expect([...SYNC_PLANS]).toEqual([...STUDENT_PLANS])
  })

  it('accepts a student and tidies the name, initial and emails', () => {
    const { students, problems } = parse([
      { ...good, guardian_emails: ['Parent@Example.com ', 'parent@example.com'] },
    ])
    expect(problems).toEqual([])
    expect(students[0]).toEqual({
      external_id: 'zz-1',
      first_name: 'Zz Readykid',
      last_initial: 'A',
      rank: 'white',
      stripes: 2,
      classes_attended: null,
      plan: null,
      active: true,
      guardian_emails: ['parent@example.com'],
    })
  })

  it('leaves parent links alone when no emails are sent', () => {
    expect(parse([good]).students[0]).not.toHaveProperty('guardian_emails')
  })

  it('never stores anything it was not asked for', () => {
    const { students } = parse([
      { ...good, birthday: '2018-04-02', address: '1 Sample St', last_name: 'Sample' },
    ])
    expect(Object.keys(students[0]).sort()).toEqual(
      [
        'active',
        'classes_attended',
        'external_id',
        'first_name',
        'last_initial',
        'plan',
        'rank',
        'stripes',
      ].sort(),
    )
  })

  it('turns away a bad row with the reason and still keeps the good ones', () => {
    const { students, problems } = parse([
      good,
      { ...good, external_id: 'zz-2', last_initial: 'Sample' },
      { ...good, external_id: 'zz-3', rank: 'senior_yellow' },
      { ...good, external_id: 'zz-4', stripes: 4 },
      { ...good, external_id: 'zz-5', guardian_emails: ['nope'] },
      good,
    ])
    expect(students.map((student) => student.external_id)).toEqual(['zz-1'])
    expect(problems.map((problem) => [problem.index, problem.external_id])).toEqual([
      [1, 'zz-2'],
      [2, 'zz-3'],
      [3, 'zz-4'],
      [4, 'zz-5'],
      [5, 'zz-1'],
    ])
    expect(problems[0].problem).toMatch(/one letter/)
    expect(problems[4].problem).toMatch(/twice/)
  })

  it('refuses a body that is not a list of students, or is too long', () => {
    expect(parseSyncPayload(null)).toMatch(/students/)
    expect(parseSyncPayload({ students: 'all' })).toMatch(/students/)
    expect(parseSyncPayload({ students: Array.from({ length: 501 }, () => good) })).toMatch(
      /at most 500/i,
    )
  })
})
