import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useContent } from '@/app/context'
import { Screen } from '@/components/layout/PageIntro'
import { Badge, SampleBadge } from '@/components/ui/Badge'
import { Button, ExternalButton, LinkButton } from '@/components/ui/Button'
import { UPDATE_CATEGORY_IMAGES } from '@/content/images'
import { useToast } from '@/components/ui/toastContext'
import { getPlatform } from '@/native/platform'
import { EmptyState, Skeleton } from '@/components/ui/Card'
import { RichText } from '@/components/ui/RichText'
import { CATEGORY_LABELS, isAnnouncementVisible } from '@/domain/announcements'
import { formatLongDate } from '@/domain/format'
import { useDocumentTitle, useNow } from '@/lib/hooks'
import { markAnnouncementRead } from './readState'

export function UpdateDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const { bundle, loading } = useContent()
  const now = useNow()

  const announcement = bundle.announcements.find((item) => item.id === id)
  const visible = announcement ? isAnnouncementVisible(announcement, now) : false

  useDocumentTitle(announcement?.title ?? 'Update')

  useEffect(() => {
    if (announcement && visible) markAnnouncementRead(announcement.id)
  }, [announcement, visible])

  if (loading) {
    return (
      <Screen className="mx-auto max-w-2xl">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-52" />
      </Screen>
    )
  }

  if (!announcement || !visible) {
    return (
      <Screen className="mx-auto max-w-2xl">
        <EmptyState
          title="This update is not available"
          description="It may have been removed or is no longer current."
          action={
            <LinkButton to="/updates" variant="secondary" size="sm">
              Back to updates
            </LinkButton>
          }
        />
      </Screen>
    )
  }

  // Only allow http(s) and in-app hash links from admin-entered action URLs.
  const actionUrl = announcement.actionUrl
  // A post's own picture wins; otherwise the category's illustrative header.
  const heroUrl = announcement.imageUrl || UPDATE_CATEGORY_IMAGES[announcement.category]
  const { notify } = useToast()

  // Updates get forwarded between parents constantly; make that one tap.
  const share = async () => {
    const shared = await getPlatform().share({
      title: announcement.title,
      text: `${announcement.title} — Lee's Martial Arts Academy`,
      url: window.location.href,
    })
    if (!shared) {
      try {
        await navigator.clipboard.writeText(window.location.href)
        notify('Link copied.', 'success')
      } catch {
        notify('Sharing is not available on this device.', 'info')
      }
    }
  }
  const isInternal = actionUrl?.startsWith('#/')
  const isExternal = actionUrl ? /^https?:\/\//i.test(actionUrl) : false

  return (
    <article className="mx-auto max-w-2xl">
      {heroUrl ? (
        <img src={heroUrl} alt="" className="h-52 w-full object-cover sm:h-64 sm:rounded-b-3xl" />
      ) : null}
      <Screen>
        <header>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {announcement.pinned ? (
              <Badge tone="red" icon="bookmark">
                Pinned
              </Badge>
            ) : null}
            {announcement.priority === 'urgent' ? <Badge tone="red">Urgent</Badge> : null}
            {announcement.priority === 'high' ? <Badge tone="gold">Important</Badge> : null}
            <Badge tone="neutral">{CATEGORY_LABELS[announcement.category]}</Badge>
            {announcement.isSample ? <SampleBadge /> : null}
          </div>
          <h1 className="text-[1.375rem] font-semibold tracking-tight text-ink-900">
            {announcement.title}
          </h1>
          <p className="mt-2 text-sm font-medium text-ink-400">
            Posted {formatLongDate(announcement.publishedAt)}
          </p>
        </header>

        <RichText text={announcement.body} />

        {actionUrl && announcement.actionLabel ? (
          isInternal ? (
            <LinkButton to={actionUrl.slice(1)} icon="chevronRight">
              {announcement.actionLabel}
            </LinkButton>
          ) : isExternal ? (
            <ExternalButton href={actionUrl} variant="primary" icon="external">
              {announcement.actionLabel}
            </ExternalButton>
          ) : null
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" icon="share" onClick={() => void share()}>
            Share
          </Button>
          <LinkButton to="/updates" variant="ghost" icon="arrowLeft" size="sm">
            All updates
          </LinkButton>
        </div>
      </Screen>
    </article>
  )
}
