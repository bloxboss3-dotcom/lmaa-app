import { describe, expect, it } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { AppProviders } from './providers'
import { routes } from './routes'

/**
 * Navigation smoke tests.
 *
 * These mount the real app (demo repository, real router) and walk it the way
 * a parent would, which is the cheapest way to catch a broken route, a missing
 * provider or a screen that throws on first paint.
 */
function renderApp(path = '/') {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  return render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  )
}

/** Both the desktop header and the mobile bar are in the DOM under jsdom. */
function navLink(name: RegExp) {
  return screen.getAllByRole('link', { name })[0]
}

describe('family navigation', () => {
  it('opens on the home dashboard', async () => {
    renderApp('/')
    expect(await screen.findByText(/Welcome to Lee's Martial Arts Academy/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /classes today/i })).toBeInTheDocument()
  })

  it('moves between the five primary destinations', async () => {
    const user = userEvent.setup()
    renderApp('/')

    await user.click(navLink(/^schedule$/i))
    expect(await screen.findByRole('heading', { name: /class schedule/i })).toBeInTheDocument()

    await user.click(navLink(/^updates$/i))
    expect(await screen.findByRole('heading', { name: /^updates$/i })).toBeInTheDocument()

    await user.click(navLink(/^events$/i))
    expect(await screen.findByRole('heading', { name: /^events$/i })).toBeInTheDocument()

    await user.click(navLink(/^learn$/i))
    expect(await screen.findByRole('heading', { name: /^learn$/i })).toBeInTheDocument()

    await user.click(navLink(/^home$/i))
    expect(await screen.findByText(/Welcome to Lee's Martial Arts Academy/i)).toBeInTheDocument()
  })

  it('renders a deep link straight away, the way a refresh does', async () => {
    renderApp('/schedule')
    expect(await screen.findByRole('heading', { name: /class schedule/i })).toBeInTheDocument()
    // The real seeded LMAA classes are present.
    expect(await screen.findAllByText(/little tigers/i)).not.toHaveLength(0)
  })

  it('opens an announcement from the updates feed', async () => {
    const user = userEvent.setup()
    renderApp('/updates')
    const feed = await screen.findByRole('list')
    const firstPost = within(feed).getAllByRole('link')[0]
    await user.click(firstPost)
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /all updates/i })).toBeInTheDocument()
    })
  })

  it('shows a friendly not-found screen for an unknown address', async () => {
    renderApp('/this-does-not-exist')
    expect(await screen.findByText(/could not find that screen/i)).toBeInTheDocument()
  })

  it('shows the Learn hub with its five sections', async () => {
    renderApp('/learn')
    expect(await screen.findByText(/curriculum videos/i)).toBeInTheDocument()
    expect(screen.getByText(/lmaa binder & documents/i)).toBeInTheDocument()
    expect(screen.getByText(/^programs$/i)).toBeInTheDocument()
    expect(screen.getByText(/frequently asked questions/i)).toBeInTheDocument()
    expect(screen.getByText(/student resources/i)).toBeInTheDocument()
  })

  it('is honest when contact details have not been supplied', async () => {
    renderApp('/more/contact')
    expect(await screen.findByText(/contact details are coming soon/i)).toBeInTheDocument()
  })

  it('keeps the staff sign-in link discreet but reachable', async () => {
    renderApp('/more')
    const link = await screen.findByRole('link', { name: /staff sign in/i })
    expect(link).toHaveAttribute('href', '/admin')
  })
})

describe('events', () => {
  it('separates upcoming from past events', async () => {
    const user = userEvent.setup()
    renderApp('/events')
    expect(await screen.findByRole('radio', { name: /upcoming/i })).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: /past/i }))
    await waitFor(() => {
      expect(screen.getByRole('radio', { name: /past/i })).toHaveAttribute('aria-checked', 'true')
    })
  })
})

describe('schedule filters', () => {
  it('filters the week down to one program', async () => {
    const user = userEvent.setup()
    renderApp('/schedule')

    await user.click(await screen.findByRole('radio', { name: /this week/i }))
    await user.click(screen.getByRole('radio', { name: /little tigers/i }))

    // Class cards render their name as a heading; the filter chips do not.
    await waitFor(() => {
      expect(screen.queryAllByRole('heading', { name: /teen & adult/i })).toHaveLength(0)
    })
    expect(screen.getAllByRole('heading', { name: /little tigers/i }).length).toBeGreaterThan(0)
  })
})
