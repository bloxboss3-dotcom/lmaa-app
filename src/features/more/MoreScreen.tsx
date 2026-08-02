import { Link } from 'react-router-dom'
import { useContent, useRepository } from '@/app/context'
import { env } from '@/config/env'
import { Screen, PageIntro } from '@/components/layout/PageIntro'
import { Icon, type IconName } from '@/components/ui/Icon'
import { useDocumentTitle } from '@/lib/hooks'

interface Row {
  to: string
  label: string
  icon: IconName
  hint?: string
}

const GROUPS: { title: string; rows: Row[] }[] = [
  {
    title: 'The academy',
    rows: [
      { to: '/more/about', label: 'About LMAA', icon: 'shield' },
      { to: '/more/contact', label: 'Contact & directions', icon: 'phone' },
      { to: '/more/programs', label: 'Programs', icon: 'medal' },
      { to: '/more/faq', label: 'Frequently asked questions', icon: 'info' },
      { to: '/more/gallery', label: 'Photo gallery', icon: 'image' },
    ],
  },
  {
    title: 'This app',
    rows: [
      { to: '/more/notifications', label: 'Notification preferences', icon: 'bell' },
      { to: '/more/install', label: 'Install the app', icon: 'download' },
      { to: '/more/privacy', label: 'Privacy policy', icon: 'lock' },
      { to: '/more/support', label: 'Support', icon: 'users' },
    ],
  },
]

export function MoreScreen() {
  const { bundle } = useContent()
  const { mode } = useRepository()
  useDocumentTitle('More')

  return (
    <Screen className="mx-auto max-w-3xl">
      <PageIntro eyebrow="Academy & app" title="More" />

      {GROUPS.map((group) => (
        <section key={group.title}>
          <h2 className="mb-2 px-1 eyebrow">
            {group.title}
          </h2>
          <ul className="overflow-hidden rounded-[var(--radius-card)] border border-ink-100 bg-white shadow-[var(--shadow-soft)]">
            {group.rows.map((row, index) => (
              <li key={row.to}>
                <Link
                  to={row.to}
                  className={`flex min-h-[56px] items-center gap-3.5 px-4 py-3 transition-colors hover:bg-ink-50 ${
                    index > 0 ? 'border-t border-ink-100' : ''
                  }`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink-50 text-ink-600">
                    <Icon name={row.icon} size={18} />
                  </span>
                  <span className="min-w-0 flex-1 font-semibold text-ink-900">{row.label}</span>
                  <Icon name="chevronRight" size={18} className="shrink-0 text-ink-300" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <footer className="space-y-3 border-t border-ink-100 pt-5 text-center">
        <p className="text-sm font-semibold text-ink-700">{bundle.settings.academyName}</p>
        <p className="text-xs text-ink-400">
          App version {env.appVersion}
          {mode === 'demo' ? ' · Demo content' : ''}
        </p>
        {/* Discreet by design: families have no reason to sign in. */}
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-400 underline-offset-4 hover:text-ink-600 hover:underline"
        >
          <Icon name="lock" size={13} />
          Staff sign in
        </Link>
      </footer>
    </Screen>
  )
}
