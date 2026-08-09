import { Outlet, ScrollRestoration } from 'react-router-dom'
import { useContent } from '@/app/context'
import { StatusBanners } from '@/components/feedback/StatusBanners'
import { visibleAnnouncements } from '@/domain/announcements'
import { useReadAnnouncementIds } from '@/features/updates/readState'
import { AppHeader } from './AppHeader'
import { BottomNav } from './BottomNav'

/** Family-facing layout: header, scrollable content, bottom navigation. */
export function AppShell() {
  const { bundle } = useContent()
  const readIds = useReadAnnouncementIds()
  const unread = visibleAnnouncements(bundle.announcements).filter(
    (item) => !readIds.includes(item.id),
  ).length

  return (
    <div className="min-h-dvh bg-canvas">
      <a
        href="#main"
        className="sr-only rounded-lg bg-crimson-600 px-4 py-2 font-semibold text-white focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
      >
        Skip to content
      </a>
      <AppHeader />
      <main id="main" className="mx-auto w-full max-w-5xl pb-24 md:pb-12">
        <div className="px-4 pt-3 md:px-6">
          <StatusBanners />
        </div>
        <Outlet />
      </main>
      <BottomNav unreadCount={unread} />
      <ScrollRestoration />
    </div>
  )
}
