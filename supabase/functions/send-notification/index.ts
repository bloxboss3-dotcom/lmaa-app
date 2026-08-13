/**
 * send-notification — the only thing that may send a push to LMAA families.
 *
 * Why this exists as a server function rather than in the app: signing a Web
 * Push message requires the VAPID *private* key. Anything in the browser
 * bundle is public, so the private key lives here as an Edge Function secret
 * and the app can only ever ask this function to send on its behalf.
 *
 * What it does:
 *   1. Verifies the caller is signed in AND has an academy staff role. A valid
 *      Supabase token is not enough — anyone can sign up for a Supabase
 *      project, and only staff may message every family at once.
 *   2. Loads the devices subscribed to the requested topic.
 *   3. Sends each one an encrypted Web Push message (RFC 8291) signed with
 *      VAPID (RFC 8292).
 *   4. Deletes subscriptions the push service reports as gone (404/410), which
 *      is how a browser tells you the user uninstalled or revoked permission.
 *   5. Returns real counts. It never reports success it did not have.
 *
 * Deploy:  supabase functions deploy send-notification
 * Secrets: supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:...
 * See PUSH_NOTIFICATIONS_SETUP.md.
 */
import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'jsr:@supabase/supabase-js@2'

/** Topics a family can choose between in the app. */
const TOPICS = ['updates', 'schedule', 'events'] as const
type Topic = (typeof TOPICS)[number]

interface SendBody {
  title?: string
  message?: string
  /** Deep link inside the app, e.g. "#/updates/abc123". */
  url?: string
  topic?: string
}

interface SubscriptionRow {
  id: string
  provider_id: string
  p256dh: string | null
  auth: string | null
}

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'content-type': 'application/json' },
  })
}

/** Web Push caps the encrypted payload at 4096 octets; keep well inside it. */
const MAX_TITLE = 120
const MAX_MESSAGE = 400

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY')
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  const subject = Deno.env.get('VAPID_SUBJECT')

  if (!supabaseUrl || !serviceKey) {
    return json({ error: 'The function is missing its Supabase configuration.' }, 500)
  }
  if (!publicKey || !privateKey || !subject) {
    // Explicitly NOT a success. A missing key must never look like a send.
    return json(
      {
        error:
          'Push notifications are not configured: the VAPID keys are missing. ' +
          'Nothing was sent. See PUSH_NOTIFICATIONS_SETUP.md.',
      },
      503,
    )
  }

  /* ------------------------------------------------ 1. authorise caller -- */

  const authHeader = request.headers.get('Authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return json({ error: 'Sign in first.' }, 401)

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: userData, error: userError } = await admin.auth.getUser(token)
  if (userError || !userData?.user) {
    return json({ error: 'That sign-in is no longer valid. Sign in again.' }, 401)
  }

  const { data: roleRow } = await admin
    .from('user_roles')
    .select('role')
    .eq('user_id', userData.user.id)
    .maybeSingle()

  if (!roleRow?.role) {
    return json({ error: 'Only academy staff can send notifications.' }, 403)
  }

  /* ------------------------------------------------- 2. validate input -- */

  let body: SendBody
  try {
    body = (await request.json()) as SendBody
  } catch {
    return json({ error: 'The request body was not valid JSON.' }, 400)
  }

  const title = (body.title ?? '').trim()
  const message = (body.message ?? '').trim()
  if (!title || !message) {
    return json({ error: 'A notification needs both a title and a message.' }, 400)
  }
  if (title.length > MAX_TITLE || message.length > MAX_MESSAGE) {
    return json(
      { error: `Keep the title under ${MAX_TITLE} and the message under ${MAX_MESSAGE} characters.` },
      400,
    )
  }

  const topic: Topic | null = TOPICS.includes(body.topic as Topic) ? (body.topic as Topic) : null

  /* ---------------------------------------------------- 3. load devices -- */

  // Deliberately a database function rather than a filter built here: the same
  // function backs the "reaches N devices" count the admin screen shows, so
  // the two can never drift apart and promise a different audience.
  const { data: rows, error: rowsError } = await admin
    .rpc('push_audience', { p_topic: topic })
    .returns<SubscriptionRow[]>()
  if (rowsError) {
    return json({ error: `Could not read the device list: ${rowsError.message}` }, 500)
  }
  if (!rows?.length) {
    return json({
      sent: 0,
      failed: 0,
      removed: 0,
      message: 'Nobody has turned notifications on yet, so nothing was sent.',
    })
  }

  /* ------------------------------------------------------- 4. send them -- */

  webpush.setVapidDetails(subject, publicKey, privateKey)

  const payload = JSON.stringify({
    title,
    body: message,
    url: body.url ?? '#/updates',
    topic: topic ?? 'updates',
  })

  const expired: string[] = []
  let sent = 0
  let failed = 0

  // Sent in batches so a large roll does not open hundreds of sockets at once.
  const BATCH = 25
  for (let index = 0; index < rows.length; index += BATCH) {
    const batch = rows.slice(index, index + BATCH)
    const results = await Promise.allSettled(
      batch.map((row) =>
        webpush.sendNotification(
          {
            endpoint: row.provider_id,
            keys: { p256dh: row.p256dh as string, auth: row.auth as string },
          },
          payload,
          {
            // A class cancellation is worthless an hour late.
            TTL: 60 * 60 * 6,
            urgency: 'high',
          },
        ),
      ),
    )

    results.forEach((result, offset) => {
      if (result.status === 'fulfilled') {
        sent += 1
        return
      }
      failed += 1
      const statusCode = (result.reason as { statusCode?: number })?.statusCode
      // 404/410 is the push service saying this device is gone for good.
      if (statusCode === 404 || statusCode === 410) {
        expired.push(batch[offset].id)
      }
    })
  }

  /* ------------------------------------------- 5. prune dead endpoints -- */

  let removed = 0
  if (expired.length) {
    const { error: deleteError, count } = await admin
      .from('notification_subscriptions')
      .delete({ count: 'exact' })
      .in('id', expired)
    if (!deleteError) removed = count ?? expired.length
  }

  return json({
    sent,
    failed,
    removed,
    message:
      sent > 0
        ? `Sent to ${sent} device${sent === 1 ? '' : 's'}.` +
          (removed ? ` ${removed} old device${removed === 1 ? '' : 's'} removed.` : '')
        : 'Nothing was delivered. No device accepted the message.',
  })
})
