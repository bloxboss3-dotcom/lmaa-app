import type { NotificationSubscription } from '@/domain/types'

/**
 * Notification boundary.
 *
 * v1 ships the interface, the preference screen and an honest
 * "not configured yet" provider. It deliberately does NOT pretend to send
 * anything: a family that thinks they will be notified about a cancelled class
 * and is not, is worse than no notifications at all.
 *
 * See SECURITY_AND_PRIVACY.md and SUPABASE_SETUP.md for the production plan
 * (OneSignal or Web Push, sent from a Supabase Edge Function that holds the
 * REST secret server-side).
 */

export type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported'

export interface SendRequest {
  title: string
  message: string
  /** Deep link inside the app, e.g. `#/updates/abc123`. */
  url?: string
  topics?: string[]
}

export interface SendResult {
  sent: boolean
  /** Plain-language explanation shown to an administrator. */
  reason: string
}

export interface NotificationProvider {
  readonly id: string
  /** True only when a real provider AND a secure server sender are wired up. */
  readonly isConfigured: boolean
  /** True when the admin UI is allowed to attempt a send. */
  readonly canSend: boolean
  getPermission(): PermissionState
  requestPermission(): Promise<PermissionState>
  subscribe(topics?: string[]): Promise<NotificationSubscription | null>
  unsubscribe(): Promise<void>
  getSubscription(): Promise<NotificationSubscription | null>
  send(request: SendRequest): Promise<SendResult>
}

/** Browser capability facts the preference screen explains to families. */
export interface NotificationCapabilities {
  supportsNotifications: boolean
  supportsPush: boolean
  isIos: boolean
  isStandalone: boolean
  /** iPhone/iPad only deliver web push once the app is on the Home Screen. */
  requiresHomeScreenInstall: boolean
}

export function detectCapabilities(): NotificationCapabilities {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      supportsNotifications: false,
      supportsPush: false,
      isIos: false,
      isStandalone: false,
      requiresHomeScreenInstall: false,
    }
  }
  const ua = navigator.userAgent || ''
  const isIos =
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS 13+ reports as a Mac; the touch points give it away.
    (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
  const isStandalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as { standalone?: boolean }).standalone === true

  const supportsNotifications = 'Notification' in window
  const supportsPush = 'serviceWorker' in navigator && 'PushManager' in window

  return {
    supportsNotifications,
    supportsPush,
    isIos,
    isStandalone,
    requiresHomeScreenInstall: isIos && !isStandalone,
  }
}
