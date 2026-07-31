/**
 * Feature flags.
 *
 * Flags are how future LMAA modules land safely: ship the extension point
 * dark, turn it on when the content and the Dojang OS side are ready.
 */

function flag(value: string | undefined, fallback = false): boolean {
  if (value === undefined || value === '') return fallback
  return value === 'true' || value === '1'
}

export interface FeatureFlags {
  /**
   * Leadership Academy module (missions, badges, scenarios, instructor
   * feedback). NOT implemented in v1 — see ARCHITECTURE.md "Extension points".
   * When enabled, the app only shows a "Coming later" placeholder.
   */
  leadership: boolean
}

export const features: FeatureFlags = {
  leadership: flag(import.meta.env.VITE_FEATURE_LEADERSHIP, false),
}
