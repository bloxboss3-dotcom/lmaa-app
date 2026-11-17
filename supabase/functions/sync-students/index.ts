/**
 * sync-students — lets the academy's own records (Dojang OS) send belts,
 * stripes and class counts to the family app.
 *
 * One way only: Dojang OS stays the source of truth and pushes here; the app
 * never writes back. A parent then signs in to the app and sees their own
 * child (migration 0006 decides who can see what).
 *
 * The caller sends a shared secret header. Without it the function refuses,
 * so nobody who finds the URL can read or change a student. The function
 * writes with the service role, which exists only as an Edge Function secret
 * and is never in the browser.
 *
 * Request:
 *   POST /functions/v1/sync-students
 *   x-sync-secret: <STUDENT_SYNC_SECRET>
 *   { "students": [ {
 *       "external_id": "the student's id in Dojang OS",
 *       "first_name": "Riley", "last_initial": "S",
 *       "rank": "white", "stripes": 2,
 *       "classes_attended": 14,            // optional
 *       "plan": "one_year",                // optional: one_year | black_belt_club
 *       "active": true,                    // optional, default true
 *       "guardian_emails": ["parent@example.com"]   // optional; replaces the links
 *   } ] }
 *
 * Students are matched on external_id: new ones are added, known ones updated.
 * A student left out of a call is not touched and never deleted. Send
 * "active": false when a student leaves.
 *
 * Response: { "saved": 12, "problems": [ { "index": 3, "external_id": "…", "problem": "…" } ] }
 *
 * Deploy:  supabase functions deploy sync-students --no-verify-jwt
 * Secrets: supabase secrets set STUDENT_SYNC_SECRET=<a long random value>
 * See FAMILY_ACCOUNTS_SETUP.md.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { parseSyncPayload } from './validate.ts'

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'POST only' }, 405)

  const expectedSecret = Deno.env.get('STUDENT_SYNC_SECRET')
  if (!expectedSecret) return json({ error: 'STUDENT_SYNC_SECRET is not set' }, 500)
  if (request.headers.get('x-sync-secret') !== expectedSecret) {
    return json({ error: 'Forbidden' }, 403)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) return json({ error: 'Supabase is not configured' }, 500)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const parsed = parseSyncPayload(body)
  if (typeof parsed === 'string') return json({ error: parsed }, 400)
  const { students, problems } = parsed
  if (!students.length) return json({ saved: 0, problems }, problems.length ? 422 : 200)

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: savedRows, error: saveError } = await admin
    .from('students')
    .upsert(
      students.map(({ guardian_emails: _emails, ...row }) => row),
      { onConflict: 'external_id' },
    )
    .select('id, external_id')
  if (saveError || !savedRows) {
    console.error('[sync-students] could not save students', saveError)
    return json({ error: 'Could not save the students' }, 502)
  }

  // Bring each student's parent links in line with what was sent. A student
  // sent without guardian_emails keeps the links it already has.
  const idByExternal = new Map(
    savedRows.map((row) => [row.external_id as string, row.id as string] as const),
  )
  const wanted = new Map<string, string[]>()
  for (const student of students) {
    const id = idByExternal.get(student.external_id)
    if (id && student.guardian_emails) wanted.set(id, student.guardian_emails)
  }

  if (wanted.size) {
    const { data: links, error: linkError } = await admin
      .from('student_guardians')
      .select('id, student_id, email')
      .in('student_id', [...wanted.keys()])
    if (linkError || !links) {
      console.error('[sync-students] could not read parent links', linkError)
      return json({ error: 'Students saved, but the parent emails could not be read' }, 502)
    }

    const remove = links
      .filter((link) => !wanted.get(link.student_id as string)?.includes(link.email as string))
      .map((link) => link.id as string)
    const existing = new Set(links.map((link) => `${link.student_id} ${link.email}`))
    const add = [...wanted].flatMap(([studentId, emails]) =>
      emails
        .filter((email) => !existing.has(`${studentId} ${email}`))
        .map((email) => ({ student_id: studentId, email })),
    )

    if (remove.length) {
      const { error } = await admin.from('student_guardians').delete().in('id', remove)
      if (error) {
        console.error('[sync-students] could not remove parent links', error)
        return json({ error: 'Students saved, but a parent email could not be removed' }, 502)
      }
    }
    if (add.length) {
      const { error } = await admin.from('student_guardians').insert(add)
      if (error) {
        console.error('[sync-students] could not add parent links', error)
        return json({ error: 'Students saved, but a parent email could not be added' }, 502)
      }
    }
  }

  return json({ saved: savedRows.length, problems })
})
