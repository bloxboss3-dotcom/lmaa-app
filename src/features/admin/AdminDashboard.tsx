import { Link } from 'react-router-dom'
import { useAuth, useNotifications, useRepository } from '@/app/context'
import { Badge } from '@/components/ui/Badge'
import { LinkButton } from '@/components/ui/Button'
import { Card, SectionHeading } from '@/components/ui/Card'
import { Icon, type IconName } from '@/components/ui/Icon'
import { isAnnouncementVisible, isScheduled } from '@/domain/announcements'
import { partitionEvents } from '@/domain/events'
import { formatDateTime } from '@/domain/format'
import { useAdminContent } from './adminContext'
import { COLLECTIONS } from './collections'

export function AdminDashboard() {
  const { bundle, loading } = useAdminContent()
  const { session } = useAuth()
  const { mode } = useRepository()
  const notifications = useNotifications()
  const now = new Date()

  const liveUpdates = bundle.announcements.filter((item) => isAnnouncementVisible(item, now))
  const scheduledUpdates = bundle.announcements.filter((item) => isScheduled(item, now))
  const draftUpdates = bundle.announcements.filter((item) => !item.published)
  const { upcoming } = partitionEvents(
    bundle.events.filter((event) => event.published),
    now,
  )
  const cancelledClasses = bundle.schedule.filter((entry) => entry.status !== 'scheduled')

  const todo = buildTodoList(bundle, mode, notifications.isConfigured)

  const recent = [...bundle.announcements, ...bundle.events]
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, 5)

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[0.68rem] font-bold tracking-[0.16em] text-crimson-600 uppercase">
          {session?.role === 'admin' ? 'Administrator' : 'Editor'}
        </p>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">
          {session?.displayName ?? session?.email ?? 'Welcome'}
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Post updates, manage the schedule and keep academy information current.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Stat label="Live updates" value={liveUpdates.length} icon="megaphone" />
        <Stat label="Upcoming events" value={upcoming.length} icon="star" />
        <Stat label="Classes in the week" value={bundle.schedule.length} icon="calendar" />
        <Stat label="Learning resources" value={bundle.resources.length} icon="book" />
      </div>

      {(scheduledUpdates.length > 0 || draftUpdates.length > 0 || cancelledClasses.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {scheduledUpdates.length ? (
            <Badge tone="gold" icon="clock">
              {scheduledUpdates.length} scheduled to post later
            </Badge>
          ) : null}
          {draftUpdates.length ? (
            <Badge tone="neutral" icon="pencil">
              {draftUpdates.length} draft {draftUpdates.length === 1 ? 'update' : 'updates'}
            </Badge>
          ) : null}
          {cancelledClasses.length ? (
            <Badge tone="red" icon="alert">
              {cancelledClasses.length} class notice{cancelledClasses.length === 1 ? '' : 's'} active
            </Badge>
          ) : null}
        </div>
      )}

      <section>
        <SectionHeading title="Quick actions" />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <LinkButton to="/admin/announcements/new" icon="plus" fullWidth>
            Post an update
          </LinkButton>
          <LinkButton to="/admin/events/new" icon="plus" variant="secondary" fullWidth>
            Add an event
          </LinkButton>
          <LinkButton to="/admin/schedule" icon="calendar" variant="secondary" fullWidth>
            Change the schedule
          </LinkButton>
          <LinkButton to="/admin/settings" icon="sliders" variant="secondary" fullWidth>
            Academy information
          </LinkButton>
        </div>
      </section>

      {todo.length ? (
        <section>
          <SectionHeading title="Before you launch" />
          <Card>
            <ul className="space-y-3">
              {todo.map((item) => (
                <li key={item.text} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
                    <Icon name="alert" size={14} />
                  </span>
                  <span className="min-w-0 flex-1 text-sm leading-relaxed text-ink-700">
                    {item.text}
                  </span>
                  {item.to ? (
                    <Link
                      to={item.to}
                      className="shrink-0 text-sm font-semibold text-crimson-700 hover:underline"
                    >
                      Fix
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ) : null}

      <section>
        <SectionHeading title="Manage content" />
        <ul className="grid gap-2 sm:grid-cols-2">
          {COLLECTIONS.map((collection) => (
            <li key={collection.key}>
              <Link
                to={`/admin/${collection.key}`}
                className="flex items-center gap-3 rounded-2xl border border-ink-100 bg-white p-3.5 shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-lift)]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink-900 text-gold-400">
                  <Icon name={collection.icon} size={19} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-ink-900">{collection.title}</span>
                  <span className="block text-xs text-ink-500">{collection.description}</span>
                </span>
                <Badge tone="neutral">{collection.list(bundle).length}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {!loading && recent.length ? (
        <section>
          <SectionHeading title="Recently edited" />
          <Card padded={false}>
            <ul>
              {recent.map((item, index) => (
                <li
                  key={item.id}
                  className={`flex items-center gap-3 px-4 py-3 ${index > 0 ? 'border-t border-ink-100' : ''}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-ink-900">
                      {'title' in item ? item.title : ''}
                    </span>
                    <span className="block text-xs text-ink-400">
                      Updated {formatDateTime(item.updatedAt)}
                    </span>
                  </span>
                  {!item.published ? <Badge tone="neutral">Draft</Badge> : null}
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ) : null}
    </div>
  )
}

function Stat({ label, value, icon }: { label: string; value: number; icon: IconName }) {
  return (
    <Card className="flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-crimson-50 text-crimson-700">
        <Icon name={icon} size={19} />
      </span>
      <span className="min-w-0">
        <span className="block text-xl leading-none font-extrabold text-ink-900">{value}</span>
        <span className="mt-1 block text-xs font-medium text-ink-500">{label}</span>
      </span>
    </Card>
  )
}

interface TodoItem {
  text: string
  to?: string
}

/** Honest, specific launch checklist based on what is actually missing. */
function buildTodoList(
  bundle: ReturnType<typeof useAdminContent>['bundle'],
  mode: 'demo' | 'supabase',
  pushConfigured: boolean,
): TodoItem[] {
  const todo: TodoItem[] = []
  const { settings } = bundle

  if (!settings.phone || !settings.email || settings.addressLines.length === 0) {
    todo.push({
      text: 'Add the academy phone number, email address and street address so families can call, email and find you.',
      to: '/admin/settings',
    })
  }
  if (!settings.mapUrl) {
    todo.push({ text: 'Add a map link so the Directions buttons work.', to: '/admin/settings' })
  }
  const sampleCount = [
    ...bundle.announcements,
    ...bundle.events,
    ...bundle.faqs,
    ...bundle.resources,
    ...bundle.programs,
    ...bundle.pages,
  ].filter((item) => item.isSample).length
  if (sampleCount) {
    todo.push({
      text: `${sampleCount} pieces of sample content are still showing. Replace or delete them before families use the app.`,
    })
  }
  if (mode === 'demo') {
    todo.push({
      text: 'Connect Supabase so your changes reach families instead of staying in this browser. See SUPABASE_SETUP.md.',
    })
  }
  if (!pushConfigured) {
    todo.push({
      text: 'Push notifications are not connected. Families see updates when they open the app.',
    })
  }
  return todo
}
