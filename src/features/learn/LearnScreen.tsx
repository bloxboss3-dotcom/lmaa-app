import { Link } from 'react-router-dom'
import { useContent } from '@/app/context'
import { features } from '@/config/features'
import { Screen, PageIntro } from '@/components/layout/PageIntro'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Icon, type IconName } from '@/components/ui/Icon'
import { useDocumentTitle } from '@/lib/hooks'

interface HubItem {
  to: string
  title: string
  description: string
  icon: IconName
  /** Omitted for pages, which are one document rather than a collection. */
  count?: number
}

/** The Learn hub: clear doors, each with an honest item count. */
export function LearnScreen() {
  const { bundle } = useContent()
  useDocumentTitle('Learn')

  const hasPage = (slug: string) => bundle.pages.some((page) => page.slug === slug)

  const items: HubItem[] = [
    {
      to: '/learn/programs',
      title: 'Programs',
      description: 'Who each class is for and when it meets.',
      icon: 'medal',
      count: bundle.programs.length,
    },
    ...(hasPage('belts')
      ? [
          {
            to: '/more/page/belts',
            title: 'The belt journey',
            description: 'Thirteen steps from white to black, and what each one asks for.',
            icon: 'sparkle' as const,
          },
        ]
      : []),
    {
      to: '/learn/faq',
      title: 'Frequently asked questions',
      description: 'Answers to the questions families ask most.',
      icon: 'info',
      count: bundle.faqs.length,
    },
    ...(hasPage('tenets')
      ? [
          {
            to: '/more/page/tenets',
            title: 'Tenets & the LMAA Pledge',
            description: 'The five tenets, and the pledge students recite every class.',
            icon: 'shield' as const,
          },
        ]
      : []),
    {
      to: '/learn/curriculum',
      title: 'Curriculum videos',
      description: 'Technique and form videos for each program and level.',
      icon: 'play',
      count: bundle.resources.filter((item) => item.collection === 'curriculum').length,
    },
    {
      to: '/learn/binder',
      title: 'LMAA binder & documents',
      description: 'The student binder, terminology and printable handouts.',
      icon: 'file',
      count: bundle.resources.filter((item) => item.collection === 'binder').length,
    },
    {
      to: '/learn/resources',
      title: 'Student resources',
      description: 'Extra links and guides to support training at home.',
      icon: 'book',
      count: bundle.resources.filter((item) => item.collection === 'resources').length,
    },
  ]

  return (
    <Screen className="mx-auto max-w-3xl">
      <PageIntro
        eyebrow="Student hub"
        title="Learn"
        description="Everything students and parents need between classes."
      />

      <ul className="space-y-2.5">
        {items.map((item) => (
          <li key={item.to}>
            <Link
              to={item.to}
              className="flex items-center gap-3.5 rounded-[var(--radius-card)] border border-ink-100 bg-surface p-4 shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-lift)]"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-crimson-50 text-crimson-700">
                <Icon name={item.icon} size={21} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="font-semibold text-ink-900">{item.title}</span>
                  {item.count !== undefined ? <Badge tone="neutral">{item.count}</Badge> : null}
                </span>
                <span className="mt-0.5 block text-sm text-ink-500">{item.description}</span>
              </span>
              <Icon name="chevronRight" size={20} className="shrink-0 text-ink-300" />
            </Link>
          </li>
        ))}
      </ul>

      {features.leadership ? (
        <Card className="border-gold-300 bg-gold-100">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink-50 text-gold-700">
              <Icon name="sparkle" size={20} />
            </span>
            <div>
              <h2 className="font-semibold text-ink-900">Leadership Academy</h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-600">
                Missions, badges and instructor feedback for leadership students are coming in a
                later release. Nothing to do here yet.
              </p>
            </div>
          </div>
        </Card>
      ) : null}
    </Screen>
  )
}
