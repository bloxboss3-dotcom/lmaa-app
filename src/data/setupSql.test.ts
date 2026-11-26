import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * supabase/setup.sql is the one file the academy pastes into Supabase. It is
 * generated from the migrations and the starter content, so it must never
 * fall behind them: a setup that silently skips a migration is how a table
 * ends up without its security rules.
 */
const SUPABASE = join(process.cwd(), 'supabase')
const read = (...path: string[]) => readFileSync(join(SUPABASE, ...path), 'utf8')

describe('supabase/setup.sql', () => {
  const setup = read('setup.sql')
  const migrations = readdirSync(join(SUPABASE, 'migrations'))
    .filter((name) => name.endsWith('.sql'))
    .sort()

  it('contains every migration and the starter content, whole and in order', () => {
    const parts = [...migrations.map((name) => read('migrations', name)), read('seed.sql')].map(
      (sql) => sql.trimEnd(),
    )

    let cursor = 0
    for (const part of parts) {
      const at = setup.indexOf(part, cursor)
      // Run `npm run setup:sql` and commit the result if this fails.
      expect(at, 'setup.sql is out of date').toBeGreaterThanOrEqual(cursor)
      cursor = at + part.length
    }
  })

  it('ends with the explicit grants, so it works with auto-grant switched off', () => {
    expect(migrations.at(-1)).toBe('0007_explicit_grants.sql')
    expect(setup).toContain('grant execute on function public.is_staff() to anon, authenticated')
  })

  it('loads each list only while it is empty, so a second run adds nothing twice', () => {
    for (const table of ['schedule_entries', 'faqs', 'learning_resources']) {
      expect(setup).toContain(`if not exists (select 1 from public.${table}) then`)
    }
  })
})
