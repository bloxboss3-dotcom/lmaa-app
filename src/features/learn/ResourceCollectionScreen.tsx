import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useContent } from '@/app/context'
import { Screen, PageIntro } from '@/components/layout/PageIntro'
import { Badge, SampleBadge } from '@/components/ui/Badge'
import { Button, ExternalButton, LinkButton } from '@/components/ui/Button'
import { Card, EmptyState, Skeleton } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import { Icon } from '@/components/ui/Icon'
import { RichText } from '@/components/ui/RichText'
import type { LearningResource, ResourceCollection } from '@/domain/types'
import { useDocumentTitle } from '@/lib/hooks'
import { parseVideoUrl } from '@/lib/video'
import { groupCurriculum } from '@/domain/curriculum'

const COLLECTION_META: Record<
  ResourceCollection,
  { title: string; eyebrow: string; description: string; empty: string }
> = {
  curriculum: {
    title: 'Curriculum videos',
    eyebrow: 'Learn',
    description: 'Videos posted by the academy for each program and level.',
    empty: 'The academy has not posted curriculum videos yet. They will appear here once added.',
  },
  binder: {
    title: 'LMAA binder & documents',
    eyebrow: 'Learn',
    description: 'The student binder and printable academy documents.',
    empty: 'No documents have been posted yet.',
  },
  resources: {
    title: 'Student resources',
    eyebrow: 'Learn',
    description: 'Extra material to support training between classes.',
    empty: 'No student resources have been posted yet.',
  },
}

export function ResourceCollectionScreen() {
  const { collection } = useParams<{ collection: string }>()
  const { bundle, loading } = useContent()
  const [videoResource, setVideoResource] = useState<LearningResource | null>(null)

  const key = (collection ?? 'curriculum') as ResourceCollection
  const meta = COLLECTION_META[key] ?? COLLECTION_META.curriculum
  useDocumentTitle(meta.title)

  const items = bundle.resources
    .filter((item) => item.collection === key)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  const embed = parseVideoUrl(videoResource?.videoUrl)
  // Curriculum is read by belt: group it so a family lands on their own level.
  const groups = key === 'curriculum' ? groupCurriculum(items) : null

  return (
    <Screen className="mx-auto max-w-3xl">
      <PageIntro eyebrow={meta.eyebrow} title={meta.title} description={meta.description} />

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : groups && groups.length > 1 ? (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.label} aria-labelledby={`level-${slugify(group.label)}`}>
              <h2
                id={`level-${slugify(group.label)}`}
                className="mb-2 flex items-center gap-2 px-1 eyebrow"
              >
                {group.label}
                <Badge tone="neutral">{group.items.length}</Badge>
              </h2>
              <ul className="space-y-2.5">
                {group.items.map((item) => (
                  <li key={item.id}>
                    <ResourceCard resource={item} onPlay={() => setVideoResource(item)} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : items.length ? (
        <ul className="space-y-2.5">
          {items.map((item) => (
            <li key={item.id}>
              <ResourceCard resource={item} onPlay={() => setVideoResource(item)} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Nothing here yet" description={meta.empty} />
      )}

      <LinkButton to="/learn" variant="ghost" icon="arrowLeft" size="sm">
        Back to Learn
      </LinkButton>

      <Dialog
        open={videoResource !== null}
        title={videoResource?.title ?? ''}
        onClose={() => setVideoResource(null)}
        className="sm:max-w-2xl"
      >
        {embed ? (
          <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
            <iframe
              src={embed.embedUrl}
              title={videoResource?.title ?? 'Video'}
              className="h-full w-full"
              allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-ink-600">
            This video is hosted somewhere the app cannot play directly. Use the button below to
            open it.
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <ExternalButton
            href={videoResource?.videoUrl ?? videoResource?.externalUrl}
            icon="external"
            variant="secondary"
            disabledReason="No video link has been added yet"
          >
            Open video
          </ExternalButton>
          <Button variant="ghost" onClick={() => setVideoResource(null)}>
            Close
          </Button>
        </div>
      </Dialog>
    </Screen>
  )
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

function ResourceCard({ resource, onPlay }: { resource: LearningResource; onPlay: () => void }) {
  const link = resource.videoUrl ?? resource.documentUrl ?? resource.externalUrl
  const hasLink = Boolean(link)
  // A still from the video itself when the academy did not upload one. The
  // image comes from a cookieless CDN; nothing talks to YouTube until play.
  const thumbnail = resource.thumbnailUrl ?? parseVideoUrl(resource.videoUrl)?.thumbnailUrl

  return (
    <Card className="flex gap-3.5">
      {thumbnail && resource.type === 'video' && hasLink ? (
        <button
          type="button"
          onClick={onPlay}
          aria-label={`Watch ${resource.title}`}
          className="group relative h-[4.5rem] w-32 shrink-0 overflow-hidden rounded-xl bg-ink-900"
        >
          <img
            src={thumbnail}
            alt=""
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.04]"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-crimson-600 shadow">
              <Icon name="play" size={16} />
            </span>
          </span>
        </button>
      ) : thumbnail ? (
        <img
          src={thumbnail}
          alt=""
          className="h-16 w-24 shrink-0 rounded-xl object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-ink-50 text-ink-400">
          <Icon
            name={
              resource.type === 'video' ? 'play' : resource.type === 'document' ? 'file' : 'link'
            }
            size={22}
          />
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-1.5">
          {resource.program ? <Badge tone="neutral">{resource.program}</Badge> : null}
          {resource.level && resource.level !== resource.program ? (
            <Badge tone="muted">{resource.level}</Badge>
          ) : null}
          {resource.isSample ? <SampleBadge /> : null}
        </div>
        <h2 className="font-semibold text-ink-900">{resource.title}</h2>
        {resource.description ? (
          <RichText text={resource.description} className="mt-1 text-sm text-ink-600" />
        ) : null}

        <div className="mt-3 flex flex-wrap gap-2">
          {resource.type === 'video' ? (
            hasLink ? (
              <Button size="sm" icon="play" onClick={onPlay}>
                Watch
              </Button>
            ) : (
              <Button size="sm" variant="secondary" disabled title="No video link added yet">
                Video coming soon
              </Button>
            )
          ) : (
            <ExternalButton
              size="sm"
              href={link}
              icon={resource.type === 'document' ? 'file' : 'external'}
              variant={hasLink ? 'secondary' : 'secondary'}
              disabledReason="This link has not been added yet"
            >
              {resource.type === 'document' ? 'Open document' : 'Open link'}
            </ExternalButton>
          )}
        </div>
      </div>
    </Card>
  )
}
