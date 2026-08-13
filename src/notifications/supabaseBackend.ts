import type { SendRequest, SendResult } from './provider'
import type { NotificationTopic, PushBackend } from './webPush'

/**
 * The Supabase half of Web Push.
 *
 * Device registration goes through two SECURITY DEFINER functions rather than
 * straight table access, so the browser never holds insert or delete rights on
 * the subscription list — see supabase/migrations/0004_push_and_staff.sql.
 *
 * Supabase is imported dynamically: families who never open the notification
 * screen should not pay for the client library on first load.
 */
export class SupabasePushBackend implements PushBackend {
  constructor(private readonly sendEndpoint: string) {}

  private async client() {
    const { getSupabaseClient } = await import('@/data/supabase/client')
    const client = getSupabaseClient()
    if (!client) throw new Error('The academy database is not connected.')
    return client
  }

  async register(input: {
    endpoint: string
    p256dh: string
    auth: string
    topics: NotificationTopic[]
  }): Promise<void> {
    const client = await this.client()
    const { error } = await client.rpc('register_push_device', {
      p_endpoint: input.endpoint,
      p_p256dh: input.p256dh,
      p_auth: input.auth,
      p_topics: input.topics,
      p_platform: 'web',
    })
    if (error) throw new Error(error.message)
  }

  async unregister(endpoint: string): Promise<void> {
    const client = await this.client()
    const { error } = await client.rpc('unregister_push_device', { p_endpoint: endpoint })
    if (error) throw new Error(error.message)
  }

  async audienceCount(topic?: NotificationTopic): Promise<number> {
    const client = await this.client()
    const { data, error } = await client.rpc('push_audience_count', { p_topic: topic ?? null })
    if (error) throw new Error(error.message)
    return typeof data === 'number' ? data : 0
  }

  async send(request: SendRequest, accessToken: string | null): Promise<SendResult> {
    if (!accessToken) {
      return { sent: false, reason: 'You are signed out. Sign in again and retry.' }
    }
    try {
      const response = await fetch(this.sendEndpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          title: request.title,
          message: request.message,
          url: request.url,
          topic: request.topics?.[0],
        }),
      })

      const payload = (await response.json().catch(() => null)) as {
        sent?: number
        failed?: number
        removed?: number
        message?: string
        error?: string
      } | null

      if (!response.ok) {
        return {
          sent: false,
          reason:
            payload?.error ??
            `The notification service replied with an error (${response.status}). Nothing was sent.`,
        }
      }

      // The function returns 200 with `sent: 0` when there is simply nobody to
      // send to. That is not a failure, but it is not a send either — say so.
      const sent = payload?.sent ?? 0
      return {
        sent: sent > 0,
        reason: payload?.message ?? (sent > 0 ? `Sent to ${sent} devices.` : 'Nothing was sent.'),
      }
    } catch {
      return {
        sent: false,
        reason: 'The notification service could not be reached. Nothing was sent.',
      }
    }
  }
}
