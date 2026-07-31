import { createContext, useContext } from 'react'
import type { ContentBundle, ContentRepository } from '@/data'
import type { AuthService, StaffSession } from '@/data/auth'
import type { NotificationProvider } from '@/notifications'
import type { StaffRole } from '@/domain/types'
import { seedSettings } from '@/data/demo/seed'

/**
 * App-wide contexts.
 *
 * Kept free of components so the providers file can stay component-only
 * (nicer for fast refresh, and it keeps the dependency direction obvious).
 */

export const EMPTY_BUNDLE: ContentBundle = {
  settings: seedSettings(),
  announcements: [],
  events: [],
  schedule: [],
  resources: [],
  programs: [],
  faqs: [],
  pages: [],
  gallery: [],
}

export interface RepositoryValue {
  repository: ContentRepository
  mode: 'demo' | 'supabase'
  /** True when the live backend failed and built-in content is being shown. */
  degraded: boolean
}

export const RepositoryContext = createContext<RepositoryValue | null>(null)

export function useRepository(): RepositoryValue {
  const value = useContext(RepositoryContext)
  if (!value) throw new Error('useRepository must be used inside <AppProviders>')
  return value
}

export interface ContentValue {
  bundle: ContentBundle
  loading: boolean
  /** Family-friendly message; never a stack trace. */
  error: string | null
  refresh: () => Promise<void>
}

export const ContentContext = createContext<ContentValue | null>(null)

export function useContent(): ContentValue {
  const value = useContext(ContentContext)
  if (!value) throw new Error('useContent must be used inside <AppProviders>')
  return value
}

export interface AuthValue {
  session: StaffSession | null
  loading: boolean
  service: AuthService
  signIn: (credentials: { email: string; password: string }) => Promise<void>
  /** Demo mode only — starts the clearly-labelled local preview session. */
  startDemo: (role: StaffRole) => Promise<void>
  signOut: () => Promise<void>
  error: string | null
  clearError: () => void
}

export const AuthContext = createContext<AuthValue | null>(null)

export function useAuth(): AuthValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside <AppProviders>')
  return value
}

export const NotificationContext = createContext<NotificationProvider | null>(null)

export function useNotifications(): NotificationProvider {
  const value = useContext(NotificationContext)
  if (!value) throw new Error('useNotifications must be used inside <AppProviders>')
  return value
}
