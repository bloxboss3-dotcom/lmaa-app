import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useContent } from '@/app/context'
import { Screen, PageIntro } from '@/components/layout/PageIntro'
import { Badge, SampleBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState, Rows, Skeleton } from '@/components/ui/Card'
import { CATEGORY_LABELS, filterByCategory, visibleAnnouncements } from '@/domain/announcements'
import { ANNOUNCEMENT_CATEGORIES, type AnnouncementCategory } from '@/domain/types'
import { formatRelative } from '@/domain/format'
import { cx } from '@/lib/cx'
import { useDocumentTitle, useNow } from '@/lib/hooks'
import { markAllAnnouncementsRead, useReadAnnouncementIds } from './readState'

type CategoryFilter = AnnouncementCategory | 'all'

export function UpdatesScreen() {
  const { bundle, loading } = useContent()
  const now = useNow()
  const [category, setCategory] = useState<CategoryFilter>('all')
  const readIds = useReadAnnouncementIds()
  useDocumentTitle('Updates')

  const live = useMemo(
    () => visibleAnnouncements(bundle.announcements, now),
    [bundle.announcements, now],
  )
  const shown = useMemo(() => filterByCategory(live, category), [live, category])
  const unreadCount = live.filter((item) => !readIds.includes(item.id)).length

  const categories = ANNOUNCEMENT_CATEGORIES.filter((value) =>
    live.some((item) => item.category === value),
  )

  return (
    <Screen className="mx-auto max-w-2xl">
      <PageIntro
        title="Updates"
        description="News from the academy."
        action={
          unreadCount > 0 ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => markAllAnnouncementsRead(live.map((item) => item.id))}
            >
              Mark all read
            </Button>
          ) : undefined
        }
      />

      {categories.length > 1 ? (
        <div
          role="radiogroup"
          aria-label="Filter updates by category"
          className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 md:-mx-6 md:px-6"
        >
          {(['all', ...categories] as CategoryFilter[]).map((value) => {
            const active = value === category
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setCategory(value)}
                className={cx(
                  'shrink-0 rounded-lg px-3 py-1.5 text-[0.8125rem] transition-colors',
                  active
                    ? 'bg-crimson-600 font-medium text-white'
                    : 'bg-surface text-ink-600 ring-1 ring-ink-100 hover:bg-ink-50',
                )}
              >
                {value === 'all' ? 'All' : CATEGORY_LABELS[value]}
              </button>
            )
          })}
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : shown.length ? (
        <Rows>
          {shown.map((item) => {
            const unread = !readIds.includes(item.id)
            return (
              <Link
                key={item.id}
                to={`/updates/${item.id}`}
                className="block px-4 py-3.5 transition-colors hover:bg-ink-50"
              >
                <div className="flex items-center gap-2">
                  {unread ? (
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-crimson-600"
                      aria-hidden="true"
                    />
                  ) : null}
                  <span className="eyebrow">{CATEGORY_LABELS[item.category]}</span>
                  {item.pinned ? <Badge tone="red">Pinned</Badge> : null}
                  {item.priority === 'urgent' ? <Badge tone="red">Urgent</Badge> : null}
                  {item.isSample ? <SampleBadge /> : null}
                  <span className="ml-auto shrink-0 text-xs text-ink-400">
                    {formatRelative(item.publishedAt, now)}
                  </span>
                </div>
                <h2 className={cx('mt-1', unread ? 'font-semibold' : 'font-medium', 'text-ink-900')}>
                  {item.title}
                </h2>
                <p className="clamp-2 mt-0.5 text-sm text-ink-500">{item.body}</p>
                {unread ? <span className="sr-only">Unread</span> : null}
              </Link>
            )
          })}
        </Rows>
      ) : live.length ? (
        <EmptyState
          title="Nothing in this category"
          action={
            <Button size="sm" variant="secondary" onClick={() => setCategory('all')}>
              Show all updates
            </Button>
          }
        />
      ) : (
        <EmptyState
          title="No updates yet"
          description="Academy news, schedule changes and testing information will appear here."
        />
      )}
    </Screen>
  )
}
