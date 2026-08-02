import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env } from '@/config/env'

/**
 * Single Supabase browser client.
 *
 * Only the browser-safe publishable/anon key is ever used here; every table is
 * protected by Row Level Security (see supabase/migrations). If the project is
 * not configured this returns `null` and the app runs on demo content.
 */

let client: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient | null {
  if (!env.isSupabaseConfigured) return null
  if (!client) {
    client = createClient(env.supabaseUrl, env.supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // The app uses HashRouter, so the URL hash belongs to the router.
        // Staff sign in with email + password rather than magic links.
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
      global: {
        headers: { 'x-application-name': 'lmaa-family-app' },
      },
    })
  }
  return client
}

export function isSupabaseAvailable(): boolean {
  return getSupabaseClient() !== null
}
