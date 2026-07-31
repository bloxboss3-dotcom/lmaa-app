import { useParams } from 'react-router-dom'
import { useContent } from '@/app/context'
import { Screen, PageIntro } from '@/components/layout/PageIntro'
import { SampleBadge } from '@/components/ui/Badge'
import { LinkButton } from '@/components/ui/Button'
import { EmptyState, Skeleton } from '@/components/ui/Card'
import { RichText } from '@/components/ui/RichText'
import { formatDate } from '@/domain/format'
import { useDocumentTitle } from '@/lib/hooks'

const FALLBACK_TITLES: Record<string, string> = {
  about: 'About LMAA',
  privacy: 'Privacy policy',
  support: 'Support',
}

/** Renders any editable information page (about, privacy, support, …). */
export function PageScreen({ slug: fixedSlug }: { slug?: string }) {
  const params = useParams<{ slug: string }>()
  const slug = fixedSlug ?? params.slug ?? ''
  const { bundle, loading } = useContent()

  const page = bundle.pages.find((item) => item.slug === slug)
  useDocumentTitle(page?.title ?? FALLBACK_TITLES[slug] ?? 'Academy')

  if (loading) {
    return (
      <Screen className="mx-auto max-w-2xl">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-40" />
      </Screen>
    )
  }

  if (!page) {
    return (
      <Screen className="mx-auto max-w-2xl">
        <EmptyState
          icon="file"
          title={`${FALLBACK_TITLES[slug] ?? 'This page'} is not available yet`}
          description="The academy has not published this page. Please check back soon."
          action={
            <LinkButton to="/more" variant="secondary" size="sm">
              Back to More
            </LinkButton>
          }
        />
      </Screen>
    )
  }

  return (
    <Screen className="mx-auto max-w-2xl">
      <PageIntro
        eyebrow="Academy"
        title={page.title}
        action={page.isSample ? <SampleBadge /> : undefined}
      />
      <RichText text={page.body} />
      <p className="text-xs text-ink-400">Last updated {formatDate(page.updatedAt)}</p>
      <LinkButton to="/more" variant="ghost" icon="arrowLeft" size="sm">
        Back to More
      </LinkButton>
    </Screen>
  )
}
