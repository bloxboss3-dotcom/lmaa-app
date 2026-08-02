import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useContent } from '@/app/context'
import { Screen, PageIntro } from '@/components/layout/PageIntro'
import { Badge, SampleBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState, Skeleton } from '@/components/ui/Card'
import { FilterChips, type ChipOption } from '@/components/ui/Chips'
import { Icon } from '@/components/ui/Icon'
import { CATEGORY_LABELS, filterByCategory, visibleAnnouncements } from '@/domain/announcements'
import { ANNOUNCEMENT_CATEGORIES, type AnnouncementCategory } from '@/domain/types'
import { formatRelative } from '@/domain/format'
import { useDocumentTitle, useNow } from '@/lib/hooks'
import { markAllAnnouncementsRead, useReadAnnouncementIds } from './readState'

type CategoryFilter = AnnouncementCategory | 'all'

export function UpdatesScreen() {
  const { bundle, loading } = useContent()
  const now = useNow()
  const [category, setCategory] = useState<CategoryFilter>('all')
  const readIds = useReadAnnouncementIds()
  useDocumentTitle('Updates')

  const live = useMemo(() => visibleAnnouncements(bundle.announcements, now), [bundle.announcements, now])
  const shown = useMemo(() => filterByCategory(live, category), [live, category])
  const unreadCount = live.filter((item) => !readIds.includes(item.id)).length

  const options: ChipOption<CategoryFilter>[] = [
    { value: 'all', label: 'All', count: live.length },
    ...ANNOUNCEMENT_CATEGORIES.filter((value) => live.some((item) => item.category === value)).map(
      (value) => ({
        value: value as CategoryFilter,
        label: CATEGORY_LABELS[value],
        count: live.filter((item) => item.category === value).length,
      }),
    ),
  ]

  return (
    <Screen className="mx-auto max-w-3xl">
      <PageIntro
        eyebrow="Academy news"
        title="Updates"
        description="Announcements from Lee's Martial Arts Academy."
        action={
          unreadCount > 0 ? (
            <Button
              size="sm"
              variant="secondary"
              icon="check"
              onClick={() => markAllAnnouncementsRead(live.map((item) => item.id))}
            >
              Mark all read
            </Button>
          ) : undefined
        }
      />

      {options.length > 1 ? (
        <FilterChips
          label="Filter updates by category"
          options={options}
          value={category}
          onChange={setCategory}
        />
      ) : null}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : shown.length ? (
        <ul className="space-y-3">
          {shown.map((item) => {
            const unread = !readIds.includes(item.id)
            return (
              <li key={item.id}>
                <Link
                  to={`/updates/${item.id}`}
                  className="block overflow-hidden rounded-[var(--radius-card)] border border-ink-100 bg-white shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-lift)]"
                >
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="h-40 w-full object-cover"
                      loading="lazy"
                    />
                  ) : null}
                  <div className="p-4 sm:p-5">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      {item.pinned ? (
                        <Badge tone="red" icon="bookmark">
                          Pinned
                        </Badge>
                      ) : null}
                      {item.priority === 'urgent' ? <Badge tone="red">Urgent</Badge> : null}
                      <Badge tone="neutral">{CATEGORY_LABELS[item.category]}</Badge>
                      {item.isSample ? <SampleBadge /> : null}
                      {unread ? (
                        <span className="ml-auto flex items-center gap-1.5 text-[0.68rem] font-bold tracking-wide text-crimson-600 uppercase">
                          <span className="h-2 w-2 rounded-full bg-crimson-600" aria-hidden="true" />
                          New
                        </span>
                      ) : null}
                    </div>
                    <h2 className="text-base font-bold text-ink-900">{item.title}</h2>
                    <p className="clamp-3 mt-1.5 text-sm leading-relaxed text-ink-600">
                      {item.body}
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs font-semibold text-ink-400">
                        {formatRelative(item.publishedAt, now)}
                      </span>
                      <span className="flex items-center gap-1 text-sm font-semibold text-crimson-700">
                        Read <Icon name="chevronRight" size={15} />
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      ) : live.length ? (
        <EmptyState
          icon="filter"
          title="Nothing in this category"
          description="Try a different category to see more academy news."
          action={
            <Button size="sm" variant="secondary" onClick={() => setCategory('all')}>
              Show all updates
            </Button>
          }
        />
      ) : (
        <EmptyState
          icon="megaphone"
          title="No updates yet"
          description="When the academy posts news, schedule changes or testing information, it will appear here."
        />
      )}
    </Screen>
  )
}
