#!/usr/bin/env node
/**
 * Generates supabase/seed.sql from the demo seed data.
 *
 * The app ships the academy's real content twice: once as the TypeScript seed
 * that demo mode reads, and once as SQL for a fresh Supabase project. Keeping
 * two hand-written copies of a 34-row class timetable in step is a losing
 * game, so the SQL is generated from the TypeScript rather than transcribed.
 *
 * Usage: npm run seed:sql   (then commit the regenerated supabase/seed.sql)
 */
import { build } from 'esbuild'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'supabase', 'seed.sql')

/* Bundle the TypeScript seed so this script can simply import it. */
const tmp = mkdtempSync(join(tmpdir(), 'lmaa-seed-'))
const bundle = join(tmp, 'seed.mjs')
await build({
  entryPoints: [join(ROOT, 'src', 'data', 'demo', 'seed.ts')],
  outfile: bundle,
  bundle: true,
  format: 'esm',
  platform: 'node',
  logLevel: 'silent',
  alias: { '@': join(ROOT, 'src') },
})
const seed = await import(pathToFileURL(bundle).href)
rmSync(tmp, { recursive: true, force: true })

/* ------------------------------------------------------------- sql helpers */

/** Single-quoted SQL literal. Newlines become chr(10) concatenations so the
 *  generated file stays on readable single lines. */
function lit(value) {
  if (value === undefined || value === null || value === '') return 'null'
  const parts = String(value)
    .split('\n')
    .map((line) => `'${line.replace(/'/g, "''")}'`)
  return parts.length === 1 ? parts[0] : parts.join(" || chr(10) || ")
}

function bool(value) {
  return value ? 'true' : 'false'
}

function textArray(values) {
  if (!values?.length) return `'{}'`
  return `array[${values.map((value) => lit(value)).join(', ')}]`
}

function row(values) {
  return `  (${values.join(', ')})`
}

/* ------------------------------------------------------------------ output */

const settings = seed.seedSettings()
const programs = seed.seedPrograms()
const schedule = seed.seedSchedule()
const faqs = seed.seedFaqs()
const resources = seed.seedResources()
const pages = seed.seedPages()

const sql = `-- ===========================================================================
-- LMAA Family App — starter content
--
-- GENERATED FILE. Do not edit by hand: run \`npm run seed:sql\` instead, which
-- regenerates this from src/data/demo/seed.ts so the demo app and a fresh
-- Supabase project always show the same thing.
--
-- Optional. Run this after the migrations to load the academy's own published
-- information — contact details, the weekly class schedule, the programs, the
-- FAQ answers and the academy pages — so the app is useful from day one.
--
-- It invents nothing. Events and the photo gallery are deliberately absent
-- because LMAA has not published dates or supplied images; the privacy policy
-- is a draft that must be approved before launch. Everything here can be
-- edited afterwards from Admin.
-- ===========================================================================

-- -------------------------------------------------------------- settings --

update public.app_settings set
  academy_name  = ${lit(settings.academyName)},
  tagline       = ${lit(settings.tagline)},
  description   = ${lit(settings.description)},
  phone         = ${lit(settings.phone)},
  email         = ${lit(settings.email)},
  address_lines = ${textArray(settings.addressLines)},
  map_url       = ${lit(settings.mapUrl)},
  website_url   = ${lit(settings.websiteUrl)},
  support_email = ${lit(settings.supportEmail)},
  office_hours  = ${lit(settings.officeHours)},
  social        = ${lit(JSON.stringify(settings.social))}::jsonb
where id = 'default';

-- -------------------------------------------------------------- programs --

insert into public.programs (name, slug, age_range, summary, description, sort_order, published)
values
${programs
  .map((program) =>
    row([
      lit(program.name),
      lit(program.slug),
      lit(program.ageRange),
      lit(program.summary),
      lit(program.description),
      program.sortOrder,
      bool(program.published),
    ]),
  )
  .join(',\n')}
on conflict (slug) do nothing;

-- -------------------------------------------------------------- schedule --
-- The academy's published weekly timetable.
-- Weekday numbers are ISO: 1 = Monday … 7 = Sunday.

insert into public.schedule_entries
  (class_name, program_slug, day_of_week, start_time, end_time, age_range, level, sort_order, published)
values
${schedule
  .map((entry) =>
    row([
      lit(entry.className),
      lit(entry.programSlug),
      entry.dayOfWeek,
      lit(entry.startTime),
      lit(entry.endTime),
      lit(entry.ageRange),
      lit(entry.level),
      entry.sortOrder,
      bool(entry.published),
    ]),
  )
  .join(',\n')};

-- ------------------------------------------------------------------ FAQs --

insert into public.faqs (question, answer, category, sort_order, published)
values
${faqs
  .map((faq) =>
    row([lit(faq.question), lit(faq.answer), lit(faq.category), faq.sortOrder, bool(faq.published)]),
  )
  .join(',\n')};

-- ------------------------------------------------------- learning resources --

insert into public.learning_resources
  (title, description, type, collection, external_url, sort_order, published)
values
${resources
  .map((resource) =>
    row([
      lit(resource.title),
      lit(resource.description),
      lit(resource.type),
      lit(resource.collection),
      lit(resource.externalUrl),
      resource.sortOrder,
      bool(resource.published),
    ]),
  )
  .join(',\n')};

-- ----------------------------------------------------------------- pages --

insert into public.pages (slug, title, body, published)
values
${pages
  .map((page) => row([lit(page.slug), lit(page.title), lit(page.body), bool(page.published)]))
  .join(',\n')}
on conflict (slug) do nothing;
`

const previous = (() => {
  try {
    return readFileSync(OUT, 'utf8')
  } catch {
    return ''
  }
})()

writeFileSync(OUT, sql)
process.stdout.write(
  `${previous === sql ? 'unchanged' : 'written'}: supabase/seed.sql ` +
    `(${programs.length} programs, ${schedule.length} classes, ${faqs.length} FAQs, ` +
    `${resources.length} resources, ${pages.length} pages)\n`,
)
