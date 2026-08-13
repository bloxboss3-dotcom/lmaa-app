import type { NotificationSubscription } from '@/domain/types'
import {
  detectCapabilities,
  type NotificationProvider,
  type PermissionState,
  type SendRequest,
  type SendResult,
} from './provider'

/**
 * Real Web Push, using the browser's own push service (FCM on Chrome, Mozilla
 * autopush on Firefox, APNs on Safari) via the standard protocol.
 *
 * The device registers itself here; only the Edge Function can actually send,
 * because only it holds the VAPID private key.
 */

/** The kinds of message a family can opt into separately. */
export const NOTIFICATION_TOPICS = [
  {
    id: 'schedule',
    label: 'Class changes',
    description: 'A class is cancelled or moved. The one worth interrupting you for.',
  },
  {
    id: 'events',
    label: 'Events',
    description: 'Belt testing, camps, tournaments and parties.',
  },
  {
    id: 'updates',
    label: 'Academy news',
    description: 'General announcements from the academy.',
  },
] as const

export type NotificationTopic = (typeof NOTIFICATION_TOPICS)[number]['id']

export const ALL_TOPIC_IDS: NotificationTopic[] = NOTIFICATION_TOPICS.map((topic) => topic.id)

/**
 * A VAPID public key travels as base64url and has to reach `pushManager` as
 * raw bytes. Chrome rejects a malformed key with a generic error, so this is
 * strict about padding and the URL-safe alphabet rather than guessing.
 */
export function vapidKeyToBytes(base64Url: string): Uint8Array {
  const trimmed = base64Url.trim()
  if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) {
    throw new Error('The push key contains characters that are not valid base64url.')
  }
  const padding = '='.repeat((4 - (trimmed.length % 4)) % 4)
  const base64 = (trimmed + padding).replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  // An uncompressed P-256 point: 0x04 followed by two 32-byte coordinates.
  if (bytes.length !== 65 || bytes[0] !== 0x04) {
    throw new Error('That does not look like a VAPID public key (expected 65 bytes starting 0x04).')
  }
  return bytes
}

/**
 * ArrayBuffer -> base64url, the encoding the push protocol expects.
 *
 * Takes `ArrayBufferLike` so both `subscription.getKey()` (an ArrayBuffer) and
 * a `Uint8Array`'s own `.buffer` can be passed without a cast at each call.
 */
export function bufferToBase64Url(buffer: ArrayBufferLike | null): string {
  if (!buffer) return ''
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export interface PushBackend {
  /** Store or refresh this device. */
  register(input: {
    endpoint: string
    p256dh: string
    auth: string
    topics: NotificationTopic[]
  }): Promise<void>
  /** Forget this device. */
  unregister(endpoint: string): Promise<void>
  /** How many devices would receive a message on this topic. */
  audienceCount(topic?: NotificationTopic): Promise<number>
  /** Ask the Edge Function to send. */
  send(request: SendRequest, accessToken: string | null): Promise<SendResult>
}

export interface WebPushOptions {
  vapidPublicKey: string
  backend: PushBackend
  getAccessToken: () => Promise<string | null>
  /** True only when a deployed sender exists. */
  canSend: boolean
}

export class WebPushNotificationProvider implements NotificationProvider {
  readonly id = 'web-push'
  readonly isConfigured = true

  constructor(private readonly options: WebPushOptions) {}

  get canSend(): boolean {
    return this.options.canSend
  }

  getPermission(): PermissionState {
    const capabilities = detectCapabilities()
    if (!capabilities.supportsNotifications) return 'unsupported'
    return (Notification.permission as PermissionState) ?? 'default'
  }

  async requestPermission(): Promise<PermissionState> {
    const capabilities = detectCapabilities()
    if (!capabilities.supportsPush) return 'unsupported'
    // Safari only honours this inside a user gesture, which is why every caller
    // is a click handler and never an effect.
    return (await Notification.requestPermission()) as PermissionState
  }

  private async registration(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) return null
    return navigator.serviceWorker.ready
  }

  async subscribe(topics: string[] = ALL_TOPIC_IDS): Promise<NotificationSubscription | null> {
    const capabilities = detectCapabilities()
    if (!capabilities.supportsPush) return null

    const registration = await this.registration()
    if (!registration) return null

    const applicationServerKey = vapidKeyToBytes(this.options.vapidPublicKey)

    // Reuse the existing browser subscription when there is one: re-subscribing
    // with the same key is a no-op, but with a *different* key it throws, so
    // an old subscription from a previous key has to be cleared first.
    let subscription = await registration.pushManager.getSubscription()
    if (subscription) {
      const existingKey = bufferToBase64Url(subscription.options?.applicationServerKey ?? null)
      const wantedKey = bufferToBase64Url(applicationServerKey.buffer)
      if (existingKey && wantedKey && existingKey !== wantedKey) {
        await subscription.unsubscribe()
        subscription = null
      }
    }

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        // Required by every browser: a push must always show something.
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as BufferSource,
      })
    }

    const p256dh = bufferToBase64Url(subscription.getKey('p256dh'))
    const auth = bufferToBase64Url(subscription.getKey('auth'))
    if (!p256dh || !auth) return null

    const chosen = topics.filter((topic): topic is NotificationTopic =>
      ALL_TOPIC_IDS.includes(topic as NotificationTopic),
    )

    await this.options.backend.register({
      endpoint: subscription.endpoint,
      p256dh,
      auth,
      topics: chosen,
    })

    return {
      id: subscription.endpoint,
      platform: 'web',
      providerId: subscription.endpoint,
      topics: chosen,
      createdAt: new Date().toISOString(),
    }
  }

  async unsubscribe(): Promise<void> {
    const registration = await this.registration()
    const subscription = await registration?.pushManager.getSubscription()
    if (!subscription) return
    // Tell the server first: if the browser forgets the endpoint before the
    // row is deleted, that row becomes an undeliverable orphan.
    await this.options.backend.unregister(subscription.endpoint)
    await subscription.unsubscribe()
  }

  async getSubscription(): Promise<NotificationSubscription | null> {
    const registration = await this.registration()
    const subscription = await registration?.pushManager.getSubscription()
    if (!subscription) return null
    return {
      id: subscription.endpoint,
      platform: 'web',
      providerId: subscription.endpoint,
      topics: [],
      createdAt: new Date().toISOString(),
    }
  }

  async audienceCount(topic?: NotificationTopic): Promise<number> {
    return this.options.backend.audienceCount(topic)
  }

  async send(request: SendRequest): Promise<SendResult> {
    if (!this.options.canSend) {
      return {
        sent: false,
        reason:
          'The notification sender is not deployed yet, so nothing was sent. ' +
          'Your post is still published in the app.',
      }
    }
    const token = await this.options.getAccessToken()
    return this.options.backend.send(request, token)
  }
}
