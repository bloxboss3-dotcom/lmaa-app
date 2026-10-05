import { Link } from 'react-router-dom'
import { useContent, useRepository } from '@/app/context'
import { env } from '@/config/env'
import { Screen, PageIntro } from '@/components/layout/PageIntro'
import { Button } from '@/components/ui/Button'
import { Icon, type IconName } from '@/components/ui/Icon'
import { useToast } from '@/components/ui/toastContext'
import { getPlatform } from '@/native/platform'
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
      { to: '/more/about', label: 'About the academy', icon: 'shield' },
      { to: '/more/contact', label: 'Contact & directions', icon: 'phone' },
      { to: '/more/message', label: 'Message the academy', icon: 'mail' },
      { to: '/more/page/beyond-class', label: 'Camps, parties & events', icon: 'sparkle' },
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
  const { notify } = useToast()
  useDocumentTitle('More')

  const websiteUrl = bundle.settings.websiteUrl
  const invite = async () => {
    if (!websiteUrl) return
    const shared = await getPlatform().share({
      title: bundle.settings.academyName,
      text: 'Taekwondo for ages 4 to adult in Wilsonville. New families can try two weeks free.',
      url: websiteUrl,
    })
    if (!shared) {
      try {
        await navigator.clipboard.writeText(websiteUrl)
        notify('Link copied — paste it to a friend.', 'success')
      } catch {
        notify('Sharing is not available on this device.', 'info')
      }
    }
  }

  return (
    <Screen className="mx-auto max-w-3xl">
      <PageIntro eyebrow="Academy & app" title="More" />

      {GROUPS.map((group) => (
        <section key={group.title}>
          <h2 className="mb-2 px-1 eyebrow">{group.title}</h2>
          <ul className="overflow-hidden rounded-[var(--radius-card)] border border-ink-100 bg-surface shadow-[var(--shadow-soft)]">
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

      {/* Word of mouth is how a small academy grows; make passing it on one tap. */}
      {websiteUrl ? (
        <section className="flex flex-wrap items-center gap-3 rounded-[var(--radius-card)] border border-ink-100 bg-surface p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-crimson-50 text-crimson-700">
            <Icon name="users" size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-ink-900">
              Know a family who would love it here?
            </h2>
            <p className="mt-0.5 text-sm text-ink-500">
              Send them the academy&rsquo;s free-trial page.
            </p>
          </div>
          <Button size="sm" variant="secondary" icon="share" onClick={() => void invite()}>
            Invite a friend
          </Button>
        </section>
      ) : null}

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
