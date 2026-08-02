import type { StaffRole } from '@/domain/types'
import { env } from '@/config/env'
import { STORAGE_KEYS, readJson, removeKey, writeJson } from '@/lib/storage'
import { LazySupabaseAuthService } from './lazy'

/**
 * Staff authentication boundary.
 *
 * Two implementations: a clearly-labelled local demo (no security, no server)
 * and Supabase Auth. The admin screens only ever see this interface, so
 * turning on real authentication changes no UI code.
 *
 * Public sign-up does not exist by design — staff accounts are created by an
 * owner in the Supabase dashboard (see SUPABASE_SETUP.md).
 */

export interface StaffSession {
  userId: string
  email: string
  displayName?: string
  role: StaffRole
  /** True for the local demo session. The UI must say so, loudly. */
  isDemo: boolean
}

export interface AuthService {
  readonly kind: 'demo' | 'supabase'
  getSession(): Promise<StaffSession | null>
  signIn(credentials: { email: string; password: string }): Promise<StaffSession>
  signOut(): Promise<void>
  /** Subscribe to session changes; returns an unsubscribe function. */
  onChange(listener: (session: StaffSession | null) => void): () => void
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

/* --------------------------------------------------------------- demo auth */

interface DemoSessionRecord {
  role: StaffRole
  startedAt: string
}

export class DemoAuthService implements AuthService {
  readonly kind = 'demo' as const
  private listeners = new Set<(session: StaffSession | null) => void>()

  private toSession(record: DemoSessionRecord): StaffSession {
    return {
      userId: 'demo-user',
      email: 'demo@localhost',
      displayName: record.role === 'admin' ? 'Demo Administrator' : 'Demo Editor',
      role: record.role,
      isDemo: true,
    }
  }

  async getSession(): Promise<StaffSession | null> {
    const record = readJson<DemoSessionRecord | null>(STORAGE_KEYS.demoSession, null)
    return record ? this.toSession(record) : null
  }

  /** The demo ignores credentials entirely — it is a preview, not a login. */
  async signIn(): Promise<StaffSession> {
    return this.startDemo('admin')
  }

  /** Explicit entry point used by the "Explore the demo" buttons. */
  async startDemo(role: StaffRole): Promise<StaffSession> {
    const record: DemoSessionRecord = { role, startedAt: new Date().toISOString() }
    writeJson(STORAGE_KEYS.demoSession, record)
    const session = this.toSession(record)
    this.listeners.forEach((listener) => listener(session))
    return session
  }

  async signOut(): Promise<void> {
    removeKey(STORAGE_KEYS.demoSession)
    this.listeners.forEach((listener) => listener(null))
  }

  onChange(listener: (session: StaffSession | null) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
}

export function createAuthService(): AuthService {
  return env.isSupabaseConfigured ? new LazySupabaseAuthService() : new DemoAuthService()
}

/** Editors can manage content; only admins can touch roles and security. */
export function canManageRoles(session: StaffSession | null): boolean {
  return session?.role === 'admin'
}

export function canEditContent(session: StaffSession | null): boolean {
  return session?.role === 'admin' || session?.role === 'editor'
}
