/**
 * Central place where the app reads its environment.
 *
 * Nothing else in the codebase touches `import.meta.env` directly, which keeps
 * "how is this deployment configured?" answerable in one file — and makes it
 * possible to guard against the single most dangerous mistake in a static app:
 * pasting a SECRET key into a browser build.
 */

/**
 * Detects keys that must never reach a browser: Supabase secret keys
 * (`sb_secret_…`) and legacy service-role JWTs.
 */
export function looksLikeSecretKey(key: string): boolean {
  const value = key.trim()
  if (!value) return false
  if (value.startsWith('sb_secret_')) return true
  if (value.startsWith('service_role')) return true
  // Legacy Supabase keys are JWTs; inspect the payload's `role` claim.
  const parts = value.split('.')
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))) as {
        role?: string
      }
      if (payload.role && payload.role !== 'anon') return true
    } catch {
      // Not decodable — treat as opaque, the network layer will reject it.
      return false
    }
  }
  return false
}

function str(value: string | undefined): string {
  return (value ?? '').trim()
}

const rawSupabaseUrl = str(import.meta.env.VITE_SUPABASE_URL)
const rawSupabaseKey = str(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)

/** True only when a *browser-safe* key was supplied. */
const secretKeyMisconfigured = rawSupabaseKey !== '' && looksLikeSecretKey(rawSupabaseKey)

if (secretKeyMisconfigured) {
  // Loud for developers, invisible to families — the app falls back to demo
  // content rather than shipping a privileged key to the browser.
  console.error(
    '[LMAA] VITE_SUPABASE_PUBLISHABLE_KEY looks like a SECRET (service-role) key. ' +
      'Refusing to use it. Replace it with the browser-safe publishable/anon key ' +
      'and rotate the leaked key in Supabase immediately.',
  )
}

export interface AppEnvironment {
  supabaseUrl: string
  supabasePublishableKey: string
  /** True when the app can talk to a real Supabase project. */
  isSupabaseConfigured: boolean
  /** True when someone pasted a secret key into the browser build. */
  secretKeyMisconfigured: boolean
  /** Public path the app is served from (`/` or `/repo-name/`). */
  basePath: string
  appVersion: string
  buildMode: 'demo' | 'supabase'
  push: {
    /** True when a device can subscribe (a VAPID public key is present). */
    enabled: boolean
    /** True when a deployed sender exists, so staff may actually send. */
    canSend: boolean
    /** Browser-safe VAPID public key. The private half lives only in Supabase. */
    vapidPublicKey: string
    functionUrl: string
  }
}

export const env: AppEnvironment = {
  supabaseUrl: rawSupabaseUrl,
  supabasePublishableKey: secretKeyMisconfigured ? '' : rawSupabaseKey,
  isSupabaseConfigured:
    Boolean(rawSupabaseUrl) && Boolean(rawSupabaseKey) && !secretKeyMisconfigured,
  secretKeyMisconfigured,
  basePath: import.meta.env.BASE_URL ?? '/',
  appVersion: str(import.meta.env.VITE_APP_VERSION) || '1.0.0',
  buildMode:
    Boolean(rawSupabaseUrl) && Boolean(rawSupabaseKey) && !secretKeyMisconfigured
      ? 'supabase'
      : 'demo',
  push: {
    // Subscribing needs the public key and a database to record the device in.
    enabled:
      str(import.meta.env.VITE_VAPID_PUBLIC_KEY) !== '' &&
      Boolean(rawSupabaseUrl) &&
      Boolean(rawSupabaseKey) &&
      !secretKeyMisconfigured,
    // Sending additionally needs the deployed Edge Function. Kept separate so
    // the app never offers families a subscription it cannot deliver on, and
    // never offers staff a Send button that would silently do nothing.
    canSend:
      str(import.meta.env.VITE_VAPID_PUBLIC_KEY) !== '' &&
      str(import.meta.env.VITE_PUSH_FUNCTION_URL) !== '',
    vapidPublicKey: str(import.meta.env.VITE_VAPID_PUBLIC_KEY),
    functionUrl: str(import.meta.env.VITE_PUSH_FUNCTION_URL),
  },
}

export const isDemoMode = !env.isSupabaseConfigured
