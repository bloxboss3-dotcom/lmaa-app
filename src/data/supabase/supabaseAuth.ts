import type { StaffRole } from '@/domain/types'
import { getSupabaseClient } from './client'
import { AuthError, type AuthService, type StaffSession } from '../auth'

/**
 * Supabase Auth implementation.
 *
 * Lives in its own module so the main bundle never has to load the Supabase
 * client: `src/data/lazy.ts` imports this file dynamically, only for
 * deployments that are actually connected to a project.
 */

const ROLE_TABLE = 'user_roles'

export class SupabaseAuthService implements AuthService {
  readonly kind = 'supabase' as const

  constructor(private readonly client = getSupabaseClient()!) {}

  private async resolveRole(userId: string): Promise<StaffRole | null> {
    const { data, error } = await this.client
      .from(ROLE_TABLE)
      .select('role')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) return null
    const role = (data as { role?: string } | null)?.role
    return role === 'admin' || role === 'editor' ? role : null
  }

  private async buildSession(user: {
    id: string
    email?: string
    user_metadata?: Record<string, unknown>
  }): Promise<StaffSession | null> {
    const role = await this.resolveRole(user.id)
    if (!role) return null
    const displayName = user.user_metadata?.display_name
    return {
      userId: user.id,
      email: user.email ?? '',
      displayName: typeof displayName === 'string' ? displayName : undefined,
      role,
      isDemo: false,
    }
  }

  async getSession(): Promise<StaffSession | null> {
    const { data } = await this.client.auth.getSession()
    const user = data.session?.user
    if (!user) return null
    return this.buildSession(user)
  }

  async signIn({ email, password }: { email: string; password: string }): Promise<StaffSession> {
    const { data, error } = await this.client.auth.signInWithPassword({ email, password })
    if (error || !data.user) {
      throw new AuthError('That email address and password did not match. Please try again.')
    }
    const session = await this.buildSession(data.user)
    if (!session) {
      // Signed in to Supabase but not authorised for the academy's content.
      await this.client.auth.signOut()
      throw new AuthError(
        'This account is not set up for the LMAA admin area. Ask the academy owner to grant access.',
      )
    }
    return session
  }

  async signOut(): Promise<void> {
    await this.client.auth.signOut()
  }

  onChange(listener: (session: StaffSession | null) => void): () => void {
    const { data } = this.client.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        listener(null)
        return
      }
      void this.buildSession(session.user).then(listener)
    })
    return () => data.subscription.unsubscribe()
  }
}
