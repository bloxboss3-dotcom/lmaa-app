import type { StaffRole } from '@/domain/types'

/**
 * Who can get into the admin area, and what they may do.
 *
 * Kept out of ContentRepository on purpose: this is about people and access,
 * not academy content, and it has security rules the content tables do not.
 * Both writes go through RLS policies that make two things impossible — an
 * editor cannot promote themselves, and an administrator cannot change or
 * remove their own row (see supabase/migrations/0004_push_and_staff.sql).
 */

export interface StaffMember {
  userId: string
  email: string
  displayName?: string
  role: StaffRole
}

export interface StaffDirectory {
  readonly canManage: boolean
  list(): Promise<StaffMember[]>
  setRole(userId: string, role: StaffRole): Promise<void>
  revoke(userId: string): Promise<void>
}

/** Demo mode has no real accounts; say so rather than invent a staff list. */
export class DemoStaffDirectory implements StaffDirectory {
  readonly canManage = false

  async list(): Promise<StaffMember[]> {
    return []
  }

  async setRole(): Promise<void> {
    throw new Error('Staff cannot be managed in demo mode.')
  }

  async revoke(): Promise<void> {
    throw new Error('Staff cannot be managed in demo mode.')
  }
}

interface RoleRow {
  user_id: string
  role: StaffRole
  staff_profiles: { email: string | null; display_name: string | null } | null
}

export class SupabaseStaffDirectory implements StaffDirectory {
  readonly canManage = true

  private async client() {
    const { getSupabaseClient } = await import('@/data/supabase/client')
    const client = getSupabaseClient()
    if (!client) throw new Error('The academy database is not connected.')
    return client
  }

  async list(): Promise<StaffMember[]> {
    const client = await this.client()
    const { data, error } = await client
      .from('user_roles')
      .select('user_id, role, staff_profiles(email, display_name)')
      .returns<RoleRow[]>()
    if (error) throw new Error(error.message)

    return (data ?? []).map((row) => ({
      userId: row.user_id,
      // A role can exist before the profile row is filled in; showing the id is
      // better than showing nothing.
      email: row.staff_profiles?.email ?? row.user_id,
      displayName: row.staff_profiles?.display_name ?? undefined,
      role: row.role,
    }))
  }

  async setRole(userId: string, role: StaffRole): Promise<void> {
    const client = await this.client()
    const { error } = await client
      .from('user_roles')
      .upsert({ user_id: userId, role }, { onConflict: 'user_id' })
    if (error) throw new Error(error.message)
  }

  async revoke(userId: string): Promise<void> {
    const client = await this.client()
    const { error } = await client.from('user_roles').delete().eq('user_id', userId)
    if (error) throw new Error(error.message)
  }
}

export function createStaffDirectory(mode: 'demo' | 'supabase'): StaffDirectory {
  return mode === 'supabase' ? new SupabaseStaffDirectory() : new DemoStaffDirectory()
}

/** What each role is allowed to do, in words an academy owner can check. */
export const ROLE_SUMMARY: Record<StaffRole, { label: string; description: string }> = {
  admin: {
    label: 'Administrator',
    description:
      'Everything an editor can do, plus academy information, notifications and staff access.',
  },
  editor: {
    label: 'Editor',
    description:
      'Can add and edit updates, events, the schedule, resources, programs, FAQs and pages.',
  },
}
