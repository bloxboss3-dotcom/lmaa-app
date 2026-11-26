#!/usr/bin/env node
/**
 * Generates supabase/setup.sql: every migration, in order, followed by the
 * starter content, as ONE file.
 *
 * Setting up a new Supabase project used to mean pasting seven files into the
 * SQL Editor in the right order. This is the same SQL as a single paste. The
 * migrations stay the source of truth; a test fails if this file falls behind
 * them.
 *
 * Usage: npm run setup:sql   (then commit the regenerated supabase/setup.sql)
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const MIGRATIONS = join(ROOT, 'supabase', 'migrations')
const OUT = join(ROOT, 'supabase', 'setup.sql')

export function buildSetupSql() {
  const files = readdirSync(MIGRATIONS)
    .filter((name) => name.endsWith('.sql'))
    .sort()
  const parts = [
    ...files.map((name) => ({ name: `migrations/${name}`, path: join(MIGRATIONS, name) })),
    { name: 'seed.sql', path: join(ROOT, 'supabase', 'seed.sql') },
  ]
  const header = `-- ===========================================================================
-- LMAA Family App — complete database setup, in one file
--
-- GENERATED FILE. Do not edit by hand: run \`npm run setup:sql\`, which joins
-- the files in supabase/migrations (in order) and supabase/seed.sql.
--
-- How to use it: in Supabase, open SQL Editor, New query, paste this whole
-- file, and press Run. It should end with "Success. No rows returned".
--
-- It creates the tables, the security rules, the storage buckets and the
-- family-accounts tables, then loads the academy's published information
-- (contact details, class schedule, programs, FAQs, pages).
--
-- Safe to run again: it never loads anything twice and never overwrites what
-- the academy has since changed.
--
-- Contains: ${parts.map((part) => part.name).join(', ')}
-- ===========================================================================
`
  const body = parts
    .map(
      (part) =>
        `\n-- >>>>>>>>>> ${part.name} >>>>>>>>>>\n\n${readFileSync(part.path, 'utf8').trimEnd()}\n`,
    )
    .join('')
  return header + body
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const sql = buildSetupSql()
  writeFileSync(OUT, sql)
  process.stdout.write(`written: supabase/setup.sql (${sql.split('\n').length} lines)\n`)
}
