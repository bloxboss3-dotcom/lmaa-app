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
  it('leads with class times rather than a welcome banner', async () => {
    renderApp('/')
    // The first heading answers "when is class?", not "hello". Which branch it
    // lands on depends on the day and time the suite runs.
    const heading = await screen.findByRole('heading', { level: 1 })
    expect(heading.textContent).toMatch(/left today|classes are done|closed today|no classes/i)
    // …and the classes themselves follow, either today's or the next day's.
    expect(screen.getByRole('heading', { name: /^today$|^next classes/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /latest update/i })).toBeInTheDocument()
  })

  it('hides the events section entirely when nothing is scheduled', async () => {
    renderApp('/')
    await screen.findByRole('heading', { level: 1 })
    // A box announcing "no events" advertises an empty app instead of telling a
    // parent something they can act on, so the section is dropped altogether.
    expect(screen.queryByRole('heading', { name: /next event/i })).not.toBeInTheDocument()
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
    expect(await screen.findByRole('heading', { name: /latest update/i })).toBeInTheDocument()
  })

  it('renders a deep link straight away, the way a refresh does', async () => {
    const user = userEvent.setup()
    renderApp('/schedule')
    expect(await screen.findByRole('heading', { name: /class schedule/i })).toBeInTheDocument()

    // The real seeded LMAA classes are present somewhere in the week.
    await user.click(screen.getByRole('button', { name: /all week/i }))
    expect(await screen.findAllByRole('heading', { name: /little tigers/i })).not.toHaveLength(0)
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

  it('offers the academy’s real phone number and address as actions', async () => {
    renderApp('/more/contact')
    expect(await screen.findByText(/8263 SW Wilsonville Rd/i)).toBeInTheDocument()
    // A phone number that is only text is a phone number a parent has to
    // re-type one-handed in a car park — it must be a tel: link.
    const call = screen.getByRole('link', { name: /call/i })
    expect(call).toHaveAttribute('href', 'tel:+15036822318')
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

  it('keeps the schedule readable without opening any filters', async () => {
    renderApp('/schedule')
    // Day strip + list only: no stacked control rows before the content.
    expect(await screen.findByRole('button', { name: /all week/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^filter$/i })).toBeInTheDocument()
    expect(screen.queryByLabelText(/program/i)).not.toBeInTheDocument()
  })
})

describe('schedule filters', () => {
  it('filters the week down to one program', async () => {
    const user = userEvent.setup()
    renderApp('/schedule')

    await user.click(await screen.findByRole('button', { name: /all week/i }))
    await user.click(screen.getByRole('button', { name: /^filter$/i }))
    await user.selectOptions(await screen.findByLabelText(/program/i), 'little-tigers')

    await waitFor(() => {
      expect(screen.queryAllByRole('heading', { name: /teen & adult/i })).toHaveLength(0)
    })
    expect(screen.getAllByRole('heading', { name: /little tigers/i }).length).toBeGreaterThan(0)
  })
})
