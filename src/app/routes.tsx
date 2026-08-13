import type { RouteObject } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { HomeScreen } from '@/features/home/HomeScreen'
import { UpdatesScreen } from '@/features/updates/UpdatesScreen'
import { UpdateDetailScreen } from '@/features/updates/UpdateDetailScreen'
import { ScheduleScreen } from '@/features/schedule/ScheduleScreen'
import { EventsScreen } from '@/features/events/EventsScreen'
import { EventDetailScreen } from '@/features/events/EventDetailScreen'
import { LearnScreen } from '@/features/learn/LearnScreen'
import { ResourceCollectionScreen } from '@/features/learn/ResourceCollectionScreen'
import { ProgramsScreen } from '@/features/learn/ProgramsScreen'
import { FaqScreen } from '@/features/learn/FaqScreen'
import { MoreScreen } from '@/features/more/MoreScreen'
import { ContactScreen } from '@/features/more/ContactScreen'
import { GalleryScreen } from '@/features/more/GalleryScreen'
import { InstallScreen } from '@/features/more/InstallScreen'
import { NotificationsScreen } from '@/features/more/NotificationsScreen'
import { PageScreen } from '@/features/more/PageScreen'
import { NotFoundScreen, RouteErrorScreen } from '@/features/system/NotFoundScreen'

/**
 * Route table.
 *
 * Exported separately from the router so tests can mount any screen with an
 * in-memory router and no browser history.
 *
 * The admin area is loaded on demand: a parent opening the app should never
 * download the content-management tools they will never use.
 */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    errorElement: <RouteErrorScreen />,
    children: [
      { index: true, element: <HomeScreen /> },

      { path: 'updates', element: <UpdatesScreen /> },
      { path: 'updates/:id', element: <UpdateDetailScreen /> },

      { path: 'schedule', element: <ScheduleScreen /> },

      { path: 'events', element: <EventsScreen /> },
      { path: 'events/:id', element: <EventDetailScreen /> },

      { path: 'learn', element: <LearnScreen /> },
      { path: 'learn/programs', element: <ProgramsScreen /> },
      { path: 'learn/faq', element: <FaqScreen /> },
      { path: 'learn/:collection', element: <ResourceCollectionScreen /> },

      { path: 'more', element: <MoreScreen /> },
      { path: 'more/contact', element: <ContactScreen /> },
      { path: 'more/programs', element: <ProgramsScreen /> },
      { path: 'more/faq', element: <FaqScreen /> },
      { path: 'more/gallery', element: <GalleryScreen /> },
      { path: 'more/notifications', element: <NotificationsScreen /> },
      { path: 'more/install', element: <InstallScreen /> },
      { path: 'more/about', element: <PageScreen slug="about" /> },
      { path: 'more/privacy', element: <PageScreen slug="privacy" /> },
      { path: 'more/support', element: <PageScreen slug="support" /> },
      { path: 'more/page/:slug', element: <PageScreen /> },

      { path: '*', element: <NotFoundScreen /> },
    ],
  },
  {
    path: '/admin',
    lazy: async () => {
      const { AdminLayout } = await import('@/features/admin/AdminLayout')
      return { Component: AdminLayout }
    },
    errorElement: <RouteErrorScreen />,
    children: [
      {
        index: true,
        lazy: async () => {
          const { AdminDashboard } = await import('@/features/admin/AdminDashboard')
          return { Component: AdminDashboard }
        },
      },
      {
        path: 'settings',
        lazy: async () => {
          const { AdminSettingsScreen } = await import('@/features/admin/AdminSettingsScreen')
          return { Component: AdminSettingsScreen }
        },
      },
      // Declared before `:collection` so these names are not swallowed by the
      // catch-all content route.
      {
        path: 'notify',
        lazy: async () => {
          const { AdminNotifyScreen } = await import('@/features/admin/AdminNotifyScreen')
          return { Component: AdminNotifyScreen }
        },
      },
      {
        path: 'staff',
        lazy: async () => {
          const { AdminStaffScreen } = await import('@/features/admin/AdminStaffScreen')
          return { Component: AdminStaffScreen }
        },
      },
      {
        path: ':collection',
        lazy: async () => {
          const { AdminCollectionScreen } = await import('@/features/admin/AdminCollectionScreen')
          return { Component: AdminCollectionScreen }
        },
      },
      {
        path: ':collection/:id',
        lazy: async () => {
          const { AdminEditorScreen } = await import('@/features/admin/AdminEditorScreen')
          return { Component: AdminEditorScreen }
        },
      },
    ],
  },
]
