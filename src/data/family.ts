import { env } from '@/config/env'
import {
  clampStripes,
  normalizeEmail,
  type Student,
  type StudentDraft,
  type StudentRecord,
} from '@/domain/students'
import { STORAGE_KEYS, readJson, removeKey, writeJson } from '@/lib/storage'
import { newId, nowIso } from './repository'

/**
 * Family accounts boundary.
 *
 * Deliberately separate from the content repository: content is public and
 * cached on every phone, while a student's record is private and is only ever
 * requested for a signed-in parent (their own children) or a signed-in staff
 * member. In Supabase mode the database enforces both.
 *
 * Two implementations, like staff sign-in: a clearly-labelled sample with
 * invented students and no real sign-in, and Supabase.
 */

export interface FamilySession {
  email: string
  /** True for the sample family. The UI must say so. */
  isDemo: boolean
}

export interface FamilyService {
  readonly kind: 'demo' | 'supabase'

  /* ---- parents ---- */
  getSession(): Promise<FamilySession | null>
  /** Emails a one-time sign-in code. */
  requestCode(email: string): Promise<void>
  verifyCode(email: string, code: string): Promise<FamilySession>
  signOut(): Promise<void>
  /** The signed-in parent's own children. Never anyone else's. */
  listMyStudents(): Promise<Student[]>
  onChange(listener: (session: FamilySession | null) => void): () => void

  /* ---- staff ---- */
  listStudents(): Promise<StudentRecord[]>
  saveStudent(draft: StudentDraft): Promise<StudentRecord>
  deleteStudent(id: string): Promise<void>
}

/** Thrown with a message that is safe to show a parent or a staff member. */
export class FamilyError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'FamilyError'
  }
}

/* ------------------------------------------------------------------- demo */

const SAMPLE_EMAIL = 'sample.family@example.com'

/** Invented students. Nobody at the academy is called this. */
export function sampleStudents(now: string = nowIso()): StudentRecord[] {
  return [
    {
      id: 'sample-student-1',
      firstName: 'Riley',
      lastInitial: 'S',
      rank: 'white',
      stripes: 2,
      classesAttended: 14,
      plan: 'one_year',
      guardianEmails: [SAMPLE_EMAIL],
      active: true,
      updatedAt: now,
      isSample: true,
    },
    {
      id: 'sample-student-2',
      firstName: 'Juno',
      lastInitial: 'S',
      rank: 'tiger_yellow',
      stripes: 3,
      classesAttended: 31,
      plan: 'one_year',
      guardianEmails: [SAMPLE_EMAIL],
      active: true,
      updatedAt: now,
      isSample: true,
    },
    {
      id: 'sample-student-3',
      firstName: 'Quinn',
      lastInitial: 'T',
      rank: 'senior_orange',
      stripes: 1,
      plan: 'one_year',
      guardianEmails: ['another.sample@example.com'],
      active: true,
      updatedAt: now,
      isSample: true,
    },
  ]
}

function toStudent(record: StudentRecord): Student {
  const { guardianEmails: _emails, active: _active, ...student } = record
  return student
}

export class DemoFamilyService implements FamilyService {
  readonly kind = 'demo' as const
  private listeners = new Set<(session: FamilySession | null) => void>()

  private load(): StudentRecord[] {
    return readJson<StudentRecord[] | null>(STORAGE_KEYS.demoStudents, null) ?? sampleStudents()
  }

  private persist(students: StudentRecord[]): void {
    writeJson(STORAGE_KEYS.demoStudents, students)
  }

  async getSession(): Promise<FamilySession | null> {
    return readJson<FamilySession | null>(STORAGE_KEYS.demoFamilySession, null)
  }

  /** There is nothing to sign in to without a database, and the app says so. */
  async requestCode(): Promise<void> {
    throw new FamilyError('Family sign-in is not switched on yet.')
  }

  async verifyCode(): Promise<FamilySession> {
    throw new FamilyError('Family sign-in is not switched on yet.')
  }

  /** Explicit entry point for the "See a sample family" button. */
  async startSample(): Promise<FamilySession> {
    const session: FamilySession = { email: SAMPLE_EMAIL, isDemo: true }
    writeJson(STORAGE_KEYS.demoFamilySession, session)
    this.listeners.forEach((listener) => listener(session))
    return session
  }

  async signOut(): Promise<void> {
    removeKey(STORAGE_KEYS.demoFamilySession)
    this.listeners.forEach((listener) => listener(null))
  }

  async listMyStudents(): Promise<Student[]> {
    const session = await this.getSession()
    if (!session) return []
    return this.load()
      .filter((record) => record.active && record.guardianEmails.includes(session.email))
      .map(toStudent)
  }

  onChange(listener: (session: FamilySession | null) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  async listStudents(): Promise<StudentRecord[]> {
    return [...this.load()].sort((a, b) => a.firstName.localeCompare(b.firstName))
  }

  async saveStudent(draft: StudentDraft): Promise<StudentRecord> {
    const students = this.load()
    const record: StudentRecord = {
      ...draft,
      id: draft.id ?? newId(),
      firstName: draft.firstName.trim(),
      lastInitial: draft.lastInitial.trim().toUpperCase(),
      stripes: clampStripes(draft.stripes),
      guardianEmails: [...new Set(draft.guardianEmails.map(normalizeEmail))],
      updatedAt: nowIso(),
    }
    const index = students.findIndex((student) => student.id === record.id)
    if (index >= 0) {
      // A sample stays labelled as a sample however it is edited.
      record.isSample = students[index].isSample
      students[index] = record
    } else {
      students.push(record)
    }
    this.persist(students)
    return record
  }

  async deleteStudent(id: string): Promise<void> {
    this.persist(this.load().filter((student) => student.id !== id))
  }
}

/* ------------------------------------------------------------------- lazy */

/** Keeps the Supabase client out of the bundle a demo deployment downloads. */
class LazySupabaseFamilyService implements FamilyService {
  readonly kind = 'supabase' as const
  private pending: Promise<FamilyService> | null = null

  private service(): Promise<FamilyService> {
    if (!this.pending) {
      this.pending = import('./supabase/supabaseFamily')
        .then(({ SupabaseFamilyService }) => new SupabaseFamilyService())
        .catch((error) => {
          this.pending = null
          throw error
        })
    }
    return this.pending
  }

  async getSession() {
    return (await this.service()).getSession()
  }
  async requestCode(email: string) {
    return (await this.service()).requestCode(email)
  }
  async verifyCode(email: string, code: string) {
    return (await this.service()).verifyCode(email, code)
  }
  async signOut() {
    return (await this.service()).signOut()
  }
  async listMyStudents() {
    return (await this.service()).listMyStudents()
  }
  async listStudents() {
    return (await this.service()).listStudents()
  }
  async saveStudent(draft: StudentDraft) {
    return (await this.service()).saveStudent(draft)
  }
  async deleteStudent(id: string) {
    return (await this.service()).deleteStudent(id)
  }

  onChange(listener: (session: FamilySession | null) => void): () => void {
    let unsubscribe: (() => void) | null = null
    let cancelled = false
    void this.service().then((service) => {
      if (cancelled) return
      unsubscribe = service.onChange(listener)
    })
    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }
}

let instance: FamilyService | null = null

/** One instance app-wide, so a sign-in on one screen is seen by the others. */
export function getFamilyService(): FamilyService {
  if (!instance) {
    instance = env.isSupabaseConfigured ? new LazySupabaseFamilyService() : new DemoFamilyService()
  }
  return instance
}

/** Tests only. */
export function resetFamilyService(): void {
  instance = null
}
