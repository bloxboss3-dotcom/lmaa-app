import { useContent } from '@/app/context'
import { Screen, PageIntro } from '@/components/layout/PageIntro'
import { SampleBadge } from '@/components/ui/Badge'
import { LinkButton } from '@/components/ui/Button'
import { EmptyState, Skeleton } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { RichText } from '@/components/ui/RichText'
import type { Faq } from '@/domain/types'
import { useDocumentTitle } from '@/lib/hooks'

export function FaqScreen() {
  const { bundle, loading } = useContent()
  useDocumentTitle('Questions')

  const faqs = [...bundle.faqs].sort((a, b) => a.sortOrder - b.sortOrder)
  const categories = [...new Set(faqs.map((faq) => faq.category ?? 'General'))]

  return (
    <Screen className="mx-auto max-w-3xl">
      <PageIntro
        eyebrow="Academy"
        title="Frequently asked questions"
        description="If your question is not answered here, contact the academy — we are glad to help."
      />

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : faqs.length ? (
        <div className="space-y-6">
          {categories.map((category) => (
            <section key={category}>
              <h2 className="mb-2 text-[0.68rem] font-bold tracking-[0.16em] text-crimson-600 uppercase">
                {category}
              </h2>
              <ul className="space-y-2">
                {faqs
                  .filter((faq) => (faq.category ?? 'General') === category)
                  .map((faq) => (
                    <li key={faq.id}>
                      <FaqItem faq={faq} />
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="info"
          title="No questions posted yet"
          description="Common questions and answers will appear here."
        />
      )}

      <LinkButton to="/more/contact" variant="secondary" icon="mail">
        Ask the academy
      </LinkButton>
    </Screen>
  )
}

function FaqItem({ faq }: { faq: Faq }) {
  return (
    <details className="group rounded-[var(--radius-card)] border border-ink-100 bg-white shadow-[var(--shadow-soft)]">
      <summary className="flex min-h-[52px] cursor-pointer list-none items-center gap-3 px-4 py-3 font-semibold text-ink-900 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">{faq.question}</span>
        {faq.isSample ? <SampleBadge /> : null}
        <Icon
          name="chevronDown"
          size={18}
          className="shrink-0 text-ink-400 transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="px-4 pb-4">
        <RichText text={faq.answer} />
      </div>
    </details>
  )
}
