/**
 * Checks what the academy's own records (Dojang OS) send to sync-students.
 *
 * Kept free of Deno and Node APIs so the same file runs inside the Edge
 * Function and under the app's test runner. The rules mirror the database's
 * (migration 0006): a first name, ONE letter of the last name, a belt the
 * academy uses, 0 to 3 stripes. Anything else on a student is ignored, so a
 * birthday or an address sent by mistake is never stored.
 */

export const SYNC_RANKS = [
  'tiger_white',
  'tiger_yellow',
  'tiger_green',
  'tiger_blue',
  'tiger_red',
  'tiger_black',
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

export const SYNC_PLANS = ['one_year', 'black_belt_club'] as const

/** One call carries at most this many students. Send more in several calls. */
export const SYNC_MAX_STUDENTS = 500

export interface SyncStudent {
  external_id: string
  first_name: string
  last_initial: string
  rank: (typeof SYNC_RANKS)[number]
  stripes: number
  classes_attended: number | null
  plan: (typeof SYNC_PLANS)[number] | null
  active: boolean
  /** Absent = leave this student's parent links as they are. */
  guardian_emails?: string[]
}

export interface SyncProblem {
  index: number
  external_id?: string
  problem: string
}

export interface ParsedSync {
  students: SyncStudent[]
  problems: SyncProblem[]
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function checkStudent(value: unknown): SyncStudent | string {
  if (!isRecord(value)) return 'not an object'

  const externalId = typeof value.external_id === 'string' ? value.external_id.trim() : ''
  if (!externalId || externalId.length > 64) return 'external_id must be 1 to 64 characters'

  const firstName = typeof value.first_name === 'string' ? value.first_name.trim() : ''
  if (!firstName || firstName.length > 40) return 'first_name must be 1 to 40 characters'

  const lastInitial =
    typeof value.last_initial === 'string' ? value.last_initial.trim().toUpperCase() : ''
  if (!/^[A-Z]$/.test(lastInitial)) return 'last_initial must be exactly one letter'

  const rank = value.rank
  if (typeof rank !== 'string' || !(SYNC_RANKS as readonly string[]).includes(rank))
    return `rank must be one of: ${SYNC_RANKS.join(', ')}`

  const stripes = value.stripes ?? 0
  if (typeof stripes !== 'number' || !Number.isInteger(stripes) || stripes < 0 || stripes > 3)
    return 'stripes must be a whole number from 0 to 3'

  const classes = value.classes_attended ?? null
  if (
    classes !== null &&
    (typeof classes !== 'number' || !Number.isInteger(classes) || classes < 0 || classes > 100000)
  )
    return 'classes_attended must be a whole number, or left out'

  const plan = value.plan ?? null
  if (
    plan !== null &&
    (typeof plan !== 'string' || !(SYNC_PLANS as readonly string[]).includes(plan))
  )
    return `plan must be one of: ${SYNC_PLANS.join(', ')}, or left out`

  const active = value.active ?? true
  if (typeof active !== 'boolean') return 'active must be true or false'

  const student: SyncStudent = {
    external_id: externalId,
    first_name: firstName,
    last_initial: lastInitial,
    rank: rank as SyncStudent['rank'],
    stripes,
    classes_attended: classes,
    plan: plan as SyncStudent['plan'],
    active,
  }

  if (value.guardian_emails !== undefined) {
    if (!Array.isArray(value.guardian_emails)) return 'guardian_emails must be a list'
    const emails = [
      ...new Set(
        value.guardian_emails.map((email) =>
          typeof email === 'string' ? email.trim().toLowerCase() : '',
        ),
      ),
    ]
    if (emails.length > 6) return 'a student can have at most 6 guardian_emails'
    const bad = emails.find((email) => email.length > 254 || !EMAIL.test(email))
    if (bad !== undefined) return `not an email address: ${bad || '(empty)'}`
    student.guardian_emails = emails
  }

  return student
}

/**
 * Splits a request body into the students that can be saved and the ones that
 * cannot, with the reason. One bad row never blocks the good ones.
 */
export function parseSyncPayload(body: unknown): ParsedSync | string {
  if (!isRecord(body) || !Array.isArray(body.students))
    return 'Send a JSON object with a "students" list.'
  if (body.students.length > SYNC_MAX_STUDENTS)
    return `At most ${SYNC_MAX_STUDENTS} students per call.`

  const students: SyncStudent[] = []
  const problems: SyncProblem[] = []
  const seen = new Set<string>()

  body.students.forEach((value, index) => {
    const checked = checkStudent(value)
    const externalId =
      isRecord(value) && typeof value.external_id === 'string' ? value.external_id : undefined
    if (typeof checked === 'string') {
      problems.push({ index, external_id: externalId, problem: checked })
    } else if (seen.has(checked.external_id)) {
      problems.push({
        index,
        external_id: checked.external_id,
        problem: 'external_id appears twice',
      })
    } else {
      seen.add(checked.external_id)
      students.push(checked)
    }
  })

  return { students, problems }
}
