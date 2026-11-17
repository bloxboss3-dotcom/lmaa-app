import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { FamilyError } from '../family'
import { SupabaseFamilyService } from './supabaseFamily'

/**
 * A small in-memory stand-in for the Supabase client: just enough of the
 * query builder for the family service, so its own logic (which email it
 * filters by, which parent links it adds and removes) can be checked without
 * a network. The database's side of the bargain is checked separately, in
 * supabase/tests/security.sql.
 */
type Row = Record<string, unknown>

function fakeClient(tables: Record<string, Row[]>, user: { email: string } | null) {
  let nextId = 1
  const calls = { otp: [] as unknown[], verify: [] as unknown[] }

  class Query implements PromiseLike<{ data: unknown; error: unknown; count?: number }> {
    private filters: ((row: Row) => boolean)[] = []
    private mode: 'select' | 'insert' | 'update' | 'delete' = 'select'
    private payload: Row | Row[] | null = null
    private one = false
    constructor(private readonly table: string) {}

    select() {
      return this
    }
    insert(values: Row | Row[]) {
      this.mode = 'insert'
      this.payload = values
      return this
    }
    update(values: Row) {
      this.mode = 'update'
      this.payload = values
      return this
    }
    delete() {
      this.mode = 'delete'
      return this
    }
    eq(column: string, value: unknown) {
      this.filters.push((row) => row[column] === value)
      return this
    }
    in(column: string, values: unknown[]) {
      this.filters.push((row) => values.includes(row[column]))
      return this
    }
    order() {
      return this
    }
    single() {
      this.one = true
      return this
    }

    private run(): { data: unknown; error: unknown; count?: number } {
      const rows = (tables[this.table] ??= [])
      const matches = (row: Row) => this.filters.every((filter) => filter(row))
      let result: Row[]
      if (this.mode === 'insert') {
        result = (Array.isArray(this.payload) ? this.payload : [this.payload!]).map((values) => ({
          id: `new-${nextId++}`,
          updated_at: '2026-11-17T00:00:00Z',
          ...values,
        }))
        rows.push(...result)
      } else if (this.mode === 'update') {
        result = rows.filter(matches)
        result.forEach((row) => Object.assign(row, this.payload))
      } else if (this.mode === 'delete') {
        result = rows.filter(matches)
        tables[this.table] = rows.filter((row) => !matches(row))
      } else {
        result = rows.filter(matches)
      }
      return { data: this.one ? (result[0] ?? null) : result, error: null, count: result.length }
    }

    then<A, B>(
      resolve?: (value: { data: unknown; error: unknown; count?: number }) => A | PromiseLike<A>,
      reject?: (reason: unknown) => B | PromiseLike<B>,
    ) {
      return Promise.resolve(this.run()).then(resolve, reject)
    }
  }

  const client = {
    from: (table: string) => new Query(table),
    auth: {
      getSession: async () => ({ data: { session: user ? { user } : null } }),
      signInWithOtp: vi.fn(async (args: unknown) => {
        calls.otp.push(args)
        return { error: null }
      }),
      verifyOtp: vi.fn(async (args: { email: string; token: string }) => {
        calls.verify.push(args)
        return args.token === '123456'
          ? { data: { user: { email: args.email } }, error: null }
          : { data: { user: null }, error: { status: 403 } }
      }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
  }
  return { client: client as unknown as SupabaseClient, calls, tables }
}

const student = (id: string, firstName: string, patch: Row = {}): Row => ({
  id,
  first_name: firstName,
  last_initial: 'A',
  rank: 'white',
  stripes: 1,
  classes_attended: null,
  plan: null,
  active: true,
  updated_at: '2026-11-01T00:00:00Z',
  ...patch,
})

describe('family sign-in against Supabase', () => {
  it('asks for a code for the lower-cased address', async () => {
    const { client, calls } = fakeClient({}, null)
    await new SupabaseFamilyService(client).requestCode('  Parent@Example.COM ')
    expect(calls.otp).toEqual([
      { email: 'parent@example.com', options: { shouldCreateUser: true } },
    ])
  })

  it('signs in with the right code and explains a wrong one', async () => {
    const { client } = fakeClient({}, null)
    const service = new SupabaseFamilyService(client)
    await expect(service.verifyCode('Parent@Example.com', ' 123456 ')).resolves.toEqual({
      email: 'parent@example.com',
      isDemo: false,
    })
    await expect(service.verifyCode('parent@example.com', '000000')).rejects.toBeInstanceOf(
      FamilyError,
    )
  })

  it("lists only the signed-in parent's own active students", async () => {
    const { client } = fakeClient(
      {
        students: [
          student('s1', 'Zz Mine'),
          student('s2', 'Zz Theirs'),
          student('s3', 'Zz Left', { active: false }),
        ],
        student_guardians: [
          { student_id: 's1', email: 'parent@example.com' },
          { student_id: 's3', email: 'parent@example.com' },
          { student_id: 's2', email: 'other@example.com' },
        ],
      },
      { email: 'Parent@Example.com' },
    )
    const mine = await new SupabaseFamilyService(client).listMyStudents()
    expect(mine.map((item) => item.firstName)).toEqual(['Zz Mine'])
    expect(mine[0]).not.toHaveProperty('guardianEmails')
  })

  it('shows nothing to someone who is not signed in', async () => {
    const { client } = fakeClient({ students: [student('s1', 'Zz Mine')] }, null)
    expect(await new SupabaseFamilyService(client).listMyStudents()).toEqual([])
  })
})

describe('staff saving a student against Supabase', () => {
  it('adds the new parent links and removes the ones staff took out', async () => {
    const { client, tables } = fakeClient(
      {
        students: [student('s1', 'Zz Mine')],
        student_guardians: [
          { student_id: 's1', email: 'old@example.com' },
          { student_id: 's1', email: 'keep@example.com' },
          { student_id: 's2', email: 'old@example.com' },
        ],
      },
      { email: 'staff@example.com' },
    )
    const saved = await new SupabaseFamilyService(client).saveStudent({
      id: 's1',
      firstName: 'Zz Mine',
      lastInitial: 'a',
      rank: 'yellow',
      stripes: 0,
      guardianEmails: ['Keep@example.com', 'new@example.com'],
      active: true,
    })

    expect(saved.rank).toBe('yellow')
    expect(saved.guardianEmails).toEqual(['keep@example.com', 'new@example.com'])
    const links = tables.student_guardians
      .filter((row) => row.student_id === 's1')
      .map((row) => row.email)
      .sort()
    expect(links).toEqual(['keep@example.com', 'new@example.com'])
    // Another student's link to the same address is untouched.
    expect(tables.student_guardians.some((row) => row.student_id === 's2')).toBe(true)
    expect(tables.students[0]).toMatchObject({ rank: 'yellow', last_initial: 'A' })
  })

  it('explains that only an administrator can remove a student', async () => {
    const { client } = fakeClient({ students: [] }, { email: 'editor@example.com' })
    await expect(new SupabaseFamilyService(client).deleteStudent('s1')).rejects.toThrow(
      /only an administrator/i,
    )
  })
})
