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
  /**
   * Family accounts: a parent signs in with an emailed code and sees their own
   * child's belt, stripes and class count. Off until the academy has connected
   * its database, approved the updated privacy policy, and asked for it.
   */
  familyAccounts: boolean
}

export const features: FeatureFlags = {
  leadership: flag(import.meta.env.VITE_FEATURE_LEADERSHIP, false),
  familyAccounts: flag(import.meta.env.VITE_FEATURE_FAMILY_ACCOUNTS, false),
}
