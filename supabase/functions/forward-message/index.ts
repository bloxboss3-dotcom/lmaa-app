/**
 * forward-message — emails the academy when a family sends a message in the app.
 *
 * Messages always land in the staff inbox inside the app (the
 * `contact_messages` table, readable by staff only). This function is the
 * optional extra that also delivers each one to the academy's email address,
 * so nobody has to remember to open the inbox.
 *
 * How it is triggered: a Supabase Database Webhook on INSERT into
 * `contact_messages` calls this function with the new row. The webhook is
 * configured to send a shared secret header, and the function refuses any
 * call without it — otherwise anyone who found the URL could make the
 * academy's inbox send email.
 *
 * Email goes out through Resend (https://resend.com) using an API key that
 * exists only as an Edge Function secret. Nothing here is ever in the browser.
 *
 * Deploy:  supabase functions deploy forward-message --no-verify-jwt
 * Secrets: supabase secrets set RESEND_API_KEY=... FORWARD_WEBHOOK_SECRET=... \
 *            MESSAGE_FORWARD_TO=lmaa.wilsonville@gmail.com \
 *            MESSAGE_FROM="LMAA Family App <app@yourdomain.com>"
 * See SUPABASE_SETUP.md, "Messages from families".
 */

interface MessageRecord {
  id: string
  name: string
  contact: string
  topic: string
  body: string
  created_at: string
}

interface WebhookPayload {
  type?: string
  table?: string
  record?: MessageRecord
}

const TOPIC_LABELS: Record<string, string> = {
  general: 'A general question',
  trial: 'Trying a class',
  schedule: 'The class schedule',
  events: 'Events, camps & parties',
  other: 'Something else',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'POST only' }, 405)

  const expectedSecret = Deno.env.get('FORWARD_WEBHOOK_SECRET')
  if (!expectedSecret) return json({ error: 'FORWARD_WEBHOOK_SECRET is not set' }, 500)
  if (request.headers.get('x-webhook-secret') !== expectedSecret) {
    return json({ error: 'Forbidden' }, 403)
  }

  const apiKey = Deno.env.get('RESEND_API_KEY')
  const to = Deno.env.get('MESSAGE_FORWARD_TO')
  const from = Deno.env.get('MESSAGE_FROM') ?? 'LMAA Family App <onboarding@resend.dev>'
  if (!apiKey || !to)
    return json({ error: 'RESEND_API_KEY and MESSAGE_FORWARD_TO are required' }, 500)

  let payload: WebhookPayload
  try {
    payload = (await request.json()) as WebhookPayload
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }
  const record = payload.record
  if (payload.type !== 'INSERT' || payload.table !== 'contact_messages' || !record) {
    return json({ ignored: true })
  }

  const topic = TOPIC_LABELS[record.topic] ?? record.topic
  const subject = `${topic} — from ${record.name} (via the LMAA app)`
  const text =
    `${record.body}\n\n— ${record.name}\nReply to: ${record.contact}\n\n` +
    `Sent from the LMAA Family App on ${new Date(record.created_at).toLocaleString('en-US', {
      timeZone: 'America/Los_Angeles',
    })}. It is also in the app's staff inbox.`
  const html =
    `<p style="white-space:pre-wrap">${escapeHtml(record.body)}</p>` +
    `<p>— ${escapeHtml(record.name)}<br>Reply to: ${escapeHtml(record.contact)}</p>` +
    `<p style="color:#666;font-size:12px">Sent from the LMAA Family App. It is also in the app's staff inbox.</p>`

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [to],
      // Replying in the mail client goes straight to the family when they gave
      // an email address; a phone number is left in the body to dial.
      ...(record.contact.includes('@') ? { reply_to: record.contact } : {}),
      subject,
      text,
      html,
    }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    console.error('[forward-message] Resend refused the email', response.status, detail)
    return json({ forwarded: false, status: response.status }, 502)
  }
  return json({ forwarded: true })
})
