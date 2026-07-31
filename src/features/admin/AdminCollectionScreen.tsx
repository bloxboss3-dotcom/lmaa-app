import { useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useRepository } from '@/app/context'
import { Badge, SampleBadge } from '@/components/ui/Badge'
import { Button, LinkButton } from '@/components/ui/Button'
import { Card, EmptyState, Skeleton } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/Dialog'
import { TextField } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { useToast } from '@/components/ui/toastContext'
import { isAnnouncementVisible, isScheduled } from '@/domain/announcements'
import type { Announcement } from '@/domain/types'
import { useAdminContent } from './adminContext'
import { findCollection, type AdminRecord } from './collections'

/** List screen shared by every content type. */
export function AdminCollectionScreen() {
  const { collection: key } = useParams<{ collection: string }>()
  const collection = findCollection(key)
  const { bundle, loading, refresh } = useAdminContent()
  const { repository } = useRepository()
  const { notify } = useToast()
  const [query, setQuery] = useState('')
  const [pendingDelete, setPendingDelete] = useState<AdminRecord | null>(null)
  const [busy, setBusy] = useState(false)

  const records = useMemo(() => {
    if (!collection) return []
    const all = collection.list(bundle)
    const text = query.trim().toLowerCase()
    if (!text) return all
    return all.filter((record) =>
      `${collection.primaryText(record)} ${collection.secondaryText(record)}`
        .toLowerCase()
        .includes(text),
    )
  }, [collection, bundle, query])

  if (!collection) return <Navigate to="/admin" replace />

  const confirmDelete = async () => {
    if (!pendingDelete) return
    setBusy(true)
    try {
      await collection.remove(repository, pendingDelete.id)
      await refresh()
      notify(`The ${collection.singular} was deleted.`, 'success')
      setPendingDelete(null)
    } catch (error) {
      console.error(error)
      notify(`That ${collection.singular} could not be deleted. Please try again.`, 'error')
    } finally {
      setBusy(false)
    }
  }

  const togglePublished = async (record: AdminRecord) => {
    try {
      const draft = { ...collection.toDraft(collection.toValues(record), record) }
      await collection.save(repository, { ...draft, published: !record.published })
      await refresh()
      notify(
        record.published
          ? `Hidden from families. It is saved as a draft.`
          : `Published. Families can see it now.`,
        'success',
      )
    } catch (error) {
      console.error(error)
      notify('That change could not be saved. Please try again.', 'error')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">{collection.title}</h1>
          <p className="mt-1 text-sm text-ink-500">{collection.description}</p>
        </div>
        <LinkButton to={`/admin/${collection.key}/new`} icon="plus">
          New {collection.singular}
        </LinkButton>
      </div>

      {collection.list(bundle).length > 6 ? (
        <TextField
          label={`Search ${collection.title.toLowerCase()}`}
          type="search"
          placeholder="Type to filter…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      ) : null}

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : records.length ? (
        <ul className="space-y-2">
          {records.map((record) => (
            <li key={record.id}>
              <Card className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-1.5">
                    <StatusBadges record={record} collectionKey={collection.key} />
                  </div>
                  <p className="truncate font-bold text-ink-900">
                    {collection.primaryText(record)}
                  </p>
                  <p className="truncate text-sm text-ink-500">
                    {collection.secondaryText(record)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={record.published ? 'eyeOff' : 'eye'}
                    onClick={() => void togglePublished(record)}
                  >
                    {record.published ? 'Hide' : 'Publish'}
                  </Button>
                  <Link
                    to={`/admin/${collection.key}/${record.id}`}
                    className="flex min-h-9 items-center gap-1.5 rounded-lg border border-ink-200 px-3 text-sm font-semibold text-ink-800 hover:bg-ink-50"
                  >
                    <Icon name="pencil" size={15} /> Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(record)}
                    aria-label={`Delete ${collection.primaryText(record)}`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-400 hover:bg-crimson-50 hover:text-crimson-700"
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={collection.icon}
          title={query ? 'Nothing matches that search' : `No ${collection.title.toLowerCase()} yet`}
          description={
            query
              ? 'Try a different word.'
              : `Add your first ${collection.singular} — it takes less than a minute.`
          }
          action={
            query ? (
              <Button size="sm" variant="secondary" onClick={() => setQuery('')}>
                Clear search
              </Button>
            ) : (
              <LinkButton to={`/admin/${collection.key}/new`} size="sm" icon="plus">
                New {collection.singular}
              </LinkButton>
            )
          }
        />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title={`Delete this ${collection.singular}?`}
        description={
          pendingDelete
            ? `"${collection.primaryText(pendingDelete)}" will be removed for everyone. This cannot be undone.`
            : ''
        }
        confirmLabel={`Delete ${collection.singular}`}
        busy={busy}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}

function StatusBadges({
  record,
  collectionKey,
}: {
  record: AdminRecord
  collectionKey: string
}) {
  const now = new Date()
  const badges = []

  if (!record.published) {
    badges.push(
      <Badge key="draft" tone="neutral">
        Draft
      </Badge>,
    )
  } else if (collectionKey === 'announcements') {
    const announcement = record as unknown as Announcement
    if (isScheduled(announcement, now)) {
      badges.push(
        <Badge key="scheduled" tone="gold" icon="clock">
          Scheduled
        </Badge>,
      )
    } else if (!isAnnouncementVisible(announcement, now)) {
      badges.push(
        <Badge key="expired" tone="muted">
          Expired
        </Badge>,
      )
    } else {
      badges.push(
        <Badge key="live" tone="success">
          Live
        </Badge>,
      )
    }
  } else {
    badges.push(
      <Badge key="live" tone="success">
        Live
      </Badge>,
    )
  }

  if (record.isSample) badges.push(<SampleBadge key="sample" />)
  return <>{badges}</>
}
