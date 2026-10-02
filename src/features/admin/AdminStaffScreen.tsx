import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth, useRepository } from '@/app/context'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, EmptyState, Skeleton } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/Dialog'
import { SelectField } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { useToast } from '@/components/ui/toastContext'
import type { StaffRole } from '@/domain/types'
import { useDocumentTitle } from '@/lib/hooks'
import { ROLE_SUMMARY, createStaffDirectory, type StaffMember } from './staffDirectory'

/**
 * Who can get in, and what they can do.
 *
 * Administrators only. Two guardrails are enforced by the database, not just
 * hidden here: an administrator cannot change their own role and cannot remove
 * their own access, so the academy can never lock itself out and nobody can
 * quietly promote themselves.
 */
export function AdminStaffScreen() {
  const { session } = useAuth()
  const { mode } = useRepository()
  const { notify } = useToast()
  const directory = useMemo(() => createStaffDirectory(mode), [mode])
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingRevoke, setPendingRevoke] = useState<StaffMember | null>(null)
  const [busy, setBusy] = useState(false)
  useDocumentTitle('Staff access')

  const load = useCallback(async () => {
    if (!directory.canManage) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      setStaff(await directory.list())
      setError(null)
    } catch (cause) {
      console.error('[LMAA] Staff list failed', cause)
      setError('The staff list could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [directory])

  useEffect(() => {
    void load()
  }, [load])

  const isAdmin = session?.role === 'admin'

  const changeRole = async (member: StaffMember, role: StaffRole) => {
    setBusy(true)
    try {
      await directory.setRole(member.userId, role)
      await load()
      notify(`${member.email} is now ${ROLE_SUMMARY[role].label.toLowerCase()}.`, 'success')
    } catch (cause) {
      console.error(cause)
      notify('That change could not be saved. Please try again.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const revoke = async () => {
    if (!pendingRevoke) return
    setBusy(true)
    try {
      await directory.revoke(pendingRevoke.userId)
      await load()
      notify(`${pendingRevoke.email} can no longer sign in to the admin area.`, 'success')
      setPendingRevoke(null)
    } catch (cause) {
      console.error(cause)
      notify('That change could not be saved. Please try again.', 'error')
    } finally {
      setBusy(false)
    }
  }

  if (!isAdmin) {
    return (
      <EmptyState
        title="Administrators only"
        description="Ask an academy administrator if you need access to staff settings."
      />
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[1.375rem] font-semibold tracking-tight text-ink-900">Staff access</h1>
        <p className="mt-1 text-sm text-ink-500">
          Who can sign in to the content manager, and what they are allowed to change.
        </p>
      </div>

      {!directory.canManage ? (
        <Card className="border-amber-200 bg-amber-50">
          <div className="flex gap-3">
            <Icon name="info" size={20} className="mt-0.5 shrink-0 text-amber-800" />
            <div>
              <h2 className="font-bold text-amber-800">No real accounts in demo mode</h2>
              <p className="mt-1 text-sm leading-relaxed text-amber-800">
                Demo mode has no sign-in and no staff list. Connect the academy database and this
                screen will show everyone who has access.
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      {error ? (
        <Card className="border-crimson-200 bg-crimson-50">
          <div className="flex flex-wrap items-center gap-3">
            <Icon name="alert" size={18} className="shrink-0 text-crimson-700" />
            <p className="min-w-0 flex-1 text-sm font-medium text-crimson-700">{error}</p>
            <Button size="sm" variant="secondary" onClick={() => void load()}>
              Try again
            </Button>
          </div>
        </Card>
      ) : null}

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : staff.length ? (
        <ul className="space-y-2">
          {staff.map((member) => {
            const isSelf = member.userId === session?.userId
            return (
              <li key={member.userId}>
                <Card className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="min-w-0 flex-1 truncate font-semibold text-ink-900">
                      {member.displayName || member.email}
                    </p>
                    {isSelf ? <Badge tone="neutral">You</Badge> : null}
                    <Badge tone={member.role === 'admin' ? 'red' : 'muted'}>
                      {ROLE_SUMMARY[member.role].label}
                    </Badge>
                  </div>
                  {member.displayName ? (
                    <p className="-mt-2 truncate text-sm text-ink-500">{member.email}</p>
                  ) : null}

                  {isSelf ? (
                    <p className="flex items-start gap-2 text-sm text-ink-500">
                      <Icon name="lock" size={15} className="mt-0.5 shrink-0" />
                      You cannot change your own role or remove your own access. Another
                      administrator can do it for you — that is what stops the academy locking
                      itself out.
                    </p>
                  ) : (
                    <div className="flex flex-wrap items-end gap-2">
                      <SelectField
                        label="Role"
                        className="min-w-48 flex-1"
                        value={member.role}
                        disabled={busy}
                        onChange={(event) =>
                          void changeRole(member, event.target.value as StaffRole)
                        }
                        options={(Object.keys(ROLE_SUMMARY) as StaffRole[]).map((role) => ({
                          value: role,
                          label: ROLE_SUMMARY[role].label,
                        }))}
                        hint={ROLE_SUMMARY[member.role].description}
                      />
                      <Button
                        variant="secondary"
                        icon="logout"
                        disabled={busy}
                        onClick={() => setPendingRevoke(member)}
                      >
                        Remove access
                      </Button>
                    </div>
                  )}
                </Card>
              </li>
            )
          })}
        </ul>
      ) : directory.canManage ? (
        <EmptyState
          title="No staff yet"
          description="Nobody has been given access to the content manager."
        />
      ) : null}

      <Card className="bg-ink-50">
        <h2 className="text-sm font-semibold text-ink-900">Adding someone new</h2>
        <p className="mt-1 text-sm leading-relaxed text-ink-600">
          There is no public sign-up — that is deliberate. To add an instructor, create their
          account in the Supabase dashboard under <strong>Authentication → Users</strong>, then come
          back here and give them a role. Full steps are in <strong>SUPABASE_SETUP.md</strong>.
        </p>
        <ul className="mt-3 space-y-1.5 text-sm text-ink-600">
          {(Object.keys(ROLE_SUMMARY) as StaffRole[]).map((role) => (
            <li key={role} className="flex gap-2">
              <span className="font-semibold text-ink-900">{ROLE_SUMMARY[role].label}:</span>
              <span className="min-w-0 flex-1">{ROLE_SUMMARY[role].description}</span>
            </li>
          ))}
        </ul>
      </Card>

      <ConfirmDialog
        open={pendingRevoke !== null}
        title="Remove this person's access?"
        description={
          pendingRevoke
            ? `${pendingRevoke.email} will no longer be able to sign in to the content manager. Their account still exists and access can be given back later.`
            : ''
        }
        confirmLabel="Remove access"
        busy={busy}
        onConfirm={() => void revoke()}
        onCancel={() => setPendingRevoke(null)}
      />
    </div>
  )
}
