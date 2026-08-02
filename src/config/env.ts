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

function bool(value: string | undefined, fallback = false): boolean {
  if (value === undefined || value === '') return fallback
  return value === 'true' || value === '1'
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
    /** Only true when a secure server-side sender is deployed. */
    enabled: boolean
    functionUrl: string
    appId: string
  }
}

export const env: AppEnvironment = {
  supabaseUrl: rawSupabaseUrl,
  supabasePublishableKey: secretKeyMisconfigured ? '' : rawSupabaseKey,
  isSupabaseConfigured: Boolean(rawSupabaseUrl) && Boolean(rawSupabaseKey) && !secretKeyMisconfigured,
  secretKeyMisconfigured,
  basePath: import.meta.env.BASE_URL ?? '/',
  appVersion: str(import.meta.env.VITE_APP_VERSION) || '1.0.0',
  buildMode:
    Boolean(rawSupabaseUrl) && Boolean(rawSupabaseKey) && !secretKeyMisconfigured
      ? 'supabase'
      : 'demo',
  push: {
    enabled: bool(import.meta.env.VITE_PUSH_ENABLED) && str(import.meta.env.VITE_PUSH_FUNCTION_URL) !== '',
    functionUrl: str(import.meta.env.VITE_PUSH_FUNCTION_URL),
    appId: str(import.meta.env.VITE_PUSH_APP_ID),
  },
}

export const isDemoMode = !env.isSupabaseConfigured
