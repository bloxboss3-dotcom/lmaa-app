import {
  clampStripes,
  isStudentRank,
  normalizeEmail,
  type Student,
  type StudentDraft,
  type StudentPlan,
  type StudentRecord,
} from '@/domain/students'
import { getSupabaseClient } from './client'
import { FamilyError, type FamilyService, type FamilySession } from '../family'

/**
 * Supabase implementation of family accounts.
 *
 * Parents sign in with a six-digit code sent to their email rather than a
 * link: a link opens in the phone's browser, not in the installed app, and
 * would sign in the wrong place. Row Level Security (migration 0006) decides
 * what each account can read; nothing here is trusted to do that.
 */

const STUDENTS = 'students'
const GUARDIANS = 'student_guardians'
const STUDENT_COLUMNS =
  'id, first_name, last_initial, rank, stripes, classes_attended, plan, active, updated_at'

interface StudentRow {
  id: string
  first_name: string
  last_initial: string
  rank: string
  stripes: number
  classes_attended: number | null
  plan: string | null
  active: boolean
  updated_at: string
}

function toRecord(row: StudentRow, guardianEmails: string[] = []): StudentRecord {
  return {
    id: row.id,
    firstName: row.first_name,
    lastInitial: row.last_initial,
    rank: isStudentRank(row.rank) ? row.rank : 'white',
    stripes: clampStripes(row.stripes),
    classesAttended: row.classes_attended ?? undefined,
    plan: (row.plan as StudentPlan | null) ?? undefined,
    active: row.active,
    updatedAt: row.updated_at,
    guardianEmails,
  }
}

function toStudent(row: StudentRow): Student {
  const { guardianEmails: _emails, active: _active, ...student } = toRecord(row)
  return student
}

function fromDraft(draft: StudentDraft) {
  return {
    first_name: draft.firstName.trim(),
    last_initial: draft.lastInitial.trim().toUpperCase(),
    rank: draft.rank,
    stripes: clampStripes(draft.stripes),
    classes_attended: draft.classesAttended ?? null,
    plan: draft.plan ?? null,
    active: draft.active,
  }
}

export class SupabaseFamilyService implements FamilyService {
  readonly kind = 'supabase' as const

  constructor(private readonly client = getSupabaseClient()!) {}

  async getSession(): Promise<FamilySession | null> {
    const { data } = await this.client.auth.getSession()
    const email = data.session?.user.email
    return email ? { email: normalizeEmail(email), isDemo: false } : null
  }

  async requestCode(email: string): Promise<void> {
    const { error } = await this.client.auth.signInWithOtp({
      email: normalizeEmail(email),
      // An account alone opens nothing: the database shows a parent only the
      // students staff have linked to their email.
      options: { shouldCreateUser: true },
    })
    if (error) {
      throw new FamilyError(
        error.status === 429
          ? 'A code was sent a moment ago. Please wait a minute before asking for another.'
          : 'We could not send a code just now. Please check the address and try again.',
        error,
      )
    }
  }

  async verifyCode(email: string, code: string): Promise<FamilySession> {
    const { data, error } = await this.client.auth.verifyOtp({
      email: normalizeEmail(email),
      token: code.trim(),
      type: 'email',
    })
    if (error || !data.user?.email) {
      throw new FamilyError(
        'That code did not work. Check the newest email from the academy, or ask for a new code.',
        error,
      )
    }
    return { email: normalizeEmail(data.user.email), isDemo: false }
  }

  async signOut(): Promise<void> {
    await this.client.auth.signOut()
  }

  async listMyStudents(): Promise<Student[]> {
    const session = await this.getSession()
    if (!session) return []
    // Filtered by the parent's own email as well as by the database, so a
    // staff member opening this screen sees their own children, not everyone's.
    const links = await this.client.from(GUARDIANS).select('student_id').eq('email', session.email)
    if (links.error)
      throw new FamilyError('Could not load your family. Please try again.', links.error)
    const ids = (links.data ?? []).map((row) => (row as { student_id: string }).student_id)
    if (!ids.length) return []
    const { data, error } = await this.client
      .from(STUDENTS)
      .select(STUDENT_COLUMNS)
      .in('id', ids)
      .eq('active', true)
      .order('first_name')
    if (error) throw new FamilyError('Could not load your family. Please try again.', error)
    return (data ?? []).map((row) => toStudent(row as StudentRow))
  }

  onChange(listener: (session: FamilySession | null) => void): () => void {
    const { data } = this.client.auth.onAuthStateChange((_event, session) => {
      const email = session?.user.email
      listener(email ? { email: normalizeEmail(email), isDemo: false } : null)
    })
    return () => data.subscription.unsubscribe()
  }

  /* ---------------------------------------------------------------- staff */

  private async guardiansByStudent(): Promise<Map<string, string[]>> {
    const { data, error } = await this.client.from(GUARDIANS).select('student_id, email')
    if (error) throw new FamilyError('Could not load the parent emails.', error)
    const map = new Map<string, string[]>()
    for (const row of (data ?? []) as { student_id: string; email: string }[]) {
      map.set(row.student_id, [...(map.get(row.student_id) ?? []), row.email])
    }
    return map
  }

  async listStudents(): Promise<StudentRecord[]> {
    const [{ data, error }, guardians] = await Promise.all([
      this.client.from(STUDENTS).select(STUDENT_COLUMNS).order('first_name'),
      this.guardiansByStudent(),
    ])
    if (error) throw new FamilyError('Could not load the students.', error)
    return (data ?? []).map((row) =>
      toRecord(row as StudentRow, (guardians.get((row as StudentRow).id) ?? []).sort()),
    )
  }

  async saveStudent(draft: StudentDraft): Promise<StudentRecord> {
    const values = fromDraft(draft)
    const query = draft.id
      ? this.client.from(STUDENTS).update(values).eq('id', draft.id)
      : this.client.from(STUDENTS).insert(values)
    const { data, error } = await query.select(STUDENT_COLUMNS).single()
    if (error || !data) throw new FamilyError('Could not save this student.', error)
    const row = data as StudentRow

    // Bring the parent links in line with what staff typed.
    const wanted = [...new Set(draft.guardianEmails.map(normalizeEmail))]
    const current = await this.client.from(GUARDIANS).select('email').eq('student_id', row.id)
    if (current.error)
      throw new FamilyError('Saved, but the parent emails could not be read.', current.error)
    const existing = ((current.data ?? []) as { email: string }[]).map((link) => link.email)
    const toAdd = wanted.filter((email) => !existing.includes(email))
    const toRemove = existing.filter((email) => !wanted.includes(email))
    if (toAdd.length) {
      const { error: addError } = await this.client
        .from(GUARDIANS)
        .insert(toAdd.map((email) => ({ student_id: row.id, email })))
      if (addError)
        throw new FamilyError('Saved, but the parent emails could not be updated.', addError)
    }
    if (toRemove.length) {
      const { error: removeError } = await this.client
        .from(GUARDIANS)
        .delete()
        .eq('student_id', row.id)
        .in('email', toRemove)
      if (removeError)
        throw new FamilyError('Saved, but a parent email could not be removed.', removeError)
    }
    return toRecord(row, wanted.sort())
  }

  async deleteStudent(id: string): Promise<void> {
    const { error, count } = await this.client
      .from(STUDENTS)
      .delete({ count: 'exact' })
      .eq('id', id)
    if (error) throw new FamilyError('Could not remove this student.', error)
    // Row Level Security filters a delete it refuses down to zero rows.
    if (count === 0)
      throw new FamilyError(
        'Only an administrator can remove a student. Mark them inactive instead.',
      )
  }
}
