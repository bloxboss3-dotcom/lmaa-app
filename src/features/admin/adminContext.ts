import { createContext, useContext } from 'react'
import type { ContentBundle } from '@/data'

export interface AdminContentValue {
  /** Includes drafts and scheduled items — the admin's view of everything. */
  bundle: ContentBundle
  loading: boolean
  error: string | null
  /** Reloads admin content and the family-facing content together. */
  refresh: () => Promise<void>
}

export const AdminContentContext = createContext<AdminContentValue | null>(null)

export function useAdminContent(): AdminContentValue {
  const value = useContext(AdminContentContext)
  if (!value) throw new Error('useAdminContent must be used inside the admin layout')
  return value
}
