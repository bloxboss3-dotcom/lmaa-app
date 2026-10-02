import type { NotificationSubscription } from '@/domain/types'
import { env } from '@/config/env'
import {
  detectCapabilities,
  type NotificationProvider,
  type PermissionState,
  type SendRequest,
  type SendResult,
} from './provider'

import { SupabasePushBackend } from './supabaseBackend'
import { WebPushNotificationProvider } from './webPush'

export * from './provider'
export * from './webPush'

/**
 * The provider used until a real push service is connected.
 *
 * It answers every question truthfully and never claims success.
 */
export class UnconfiguredNotificationProvider implements NotificationProvider {
  readonly id = 'unconfigured'
  readonly isConfigured = false
  readonly canSend = false

  getPermission(): PermissionState {
    const capabilities = detectCapabilities()
    if (!capabilities.supportsNotifications) return 'unsupported'
    return (Notification.permission as PermissionState) ?? 'default'
  }

  async requestPermission(): Promise<PermissionState> {
    // Asking for permission we cannot yet act on would be misleading.
    return this.getPermission()
  }

  async subscribe(): Promise<NotificationSubscription | null> {
    return null
  }

  async unsubscribe(): Promise<void> {
    /* nothing to undo */
  }

  async getSubscription(): Promise<NotificationSubscription | null> {
    return null
  }

  async send(): Promise<SendResult> {
    return {
      sent: false,
      reason:
        'Push notifications are not connected yet, so nothing was sent. ' +
        'Your post is still published in the app.',
    }
  }
}

/**
 * Talks to a server-side sender (a Supabase Edge Function) that holds the push
 * provider's REST secret. No secret ever exists in this bundle.
 *
 * Wire-up instructions: SUPABASE_SETUP.md → "Push notifications".
 */
export class ServerFunctionNotificationProvider implements NotificationProvider {
  readonly id = 'server-function'
  readonly isConfigured = true
  readonly canSend = true

  constructor(
    private readonly endpoint: string,
    private readonly getAccessToken: () => Promise<string | null>,
  ) {}

  getPermission(): PermissionState {
    const capabilities = detectCapabilities()
    if (!capabilities.supportsNotifications) return 'unsupported'
    return (Notification.permission as PermissionState) ?? 'default'
  }

  async requestPermission(): Promise<PermissionState> {
    const capabilities = detectCapabilities()
    if (!capabilities.supportsNotifications) return 'unsupported'
    return (await Notification.requestPermission()) as PermissionState
  }

  async subscribe(): Promise<NotificationSubscription | null> {
    // Device registration is completed by the push SDK (web) or Capacitor
    // (native). Until that SDK is added, report honestly that there is no
    // subscription rather than inventing one.
    return null
  }

  async unsubscribe(): Promise<void> {
    /* handled by the push SDK once installed */
  }

  async getSubscription(): Promise<NotificationSubscription | null> {
    return null
  }

  async send(request: SendRequest): Promise<SendResult> {
    try {
      const token = await this.getAccessToken()
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(request),
      })
      if (!response.ok) {
        return {
          sent: false,
          reason: `The notification service replied with an error (${response.status}). Nothing was sent.`,
        }
      }
      return { sent: true, reason: 'Notification sent.' }
    } catch {
      return {
        sent: false,
        reason: 'The notification service could not be reached. Nothing was sent.',
      }
    }
  }
}

export function createNotificationProvider(
  getAccessToken: () => Promise<string | null> = async () => null,
): NotificationProvider {
  // Real Web Push: a device can register as soon as there is a VAPID public
  // key and a database to record it in. Sending is gated separately, because
  // registering families for notifications nobody can send is a promise the
  // app would be breaking the first time a class was cancelled.
  if (env.push.enabled) {
    return new WebPushNotificationProvider({
      vapidPublicKey: env.push.vapidPublicKey,
      backend: new SupabasePushBackend(env.push.functionUrl),
      getAccessToken,
      canSend: env.push.canSend,
    })
  }
  return new UnconfiguredNotificationProvider()
}
