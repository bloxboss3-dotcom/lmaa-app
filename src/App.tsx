import { RouterProvider, createHashRouter } from 'react-router-dom'
import { AppProviders } from '@/app/providers'
import { routes } from '@/app/routes'

/**
 * HashRouter is deliberate.
 *
 * GitHub Pages serves static files only: a hard refresh on /schedule would ask
 * GitHub for a file that does not exist and return 404. Hash routes
 * (/#/schedule) are never sent to the server, so every screen survives a
 * refresh, a bookmark and a shared link — under a repository sub-path and
 * under a custom domain alike.
 */
const router = createHashRouter(routes)

export default function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  )
}
