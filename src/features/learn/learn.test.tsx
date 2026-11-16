import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { AppProviders } from '@/app/providers'
import { routes } from '@/app/routes'

function renderApp(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  return render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  )
}

describe('learn hub and information pages', () => {
  it('says "Coming soon" instead of showing a zero for sections with nothing in them yet', async () => {
    renderApp('/learn')
    const curriculum = await screen.findByRole('link', { name: /curriculum videos/i })
    expect(curriculum).toHaveTextContent(/coming soon/i)
    expect(curriculum).not.toHaveTextContent(/\b0\b/)
    expect(screen.getByRole('link', { name: /frequently asked questions/i })).toHaveTextContent(
      /14/,
    )
  })

  it('does not stamp a never-edited page with a made-up "last updated" date', async () => {
    renderApp('/more/page/belts')
    await screen.findByRole('heading', { name: /the belt journey/i })
    expect(screen.queryByText(/last updated/i)).not.toBeInTheDocument()
  })

  it('leads the hub with the new-family guide and the testing page', async () => {
    renderApp('/learn')
    await screen.findByRole('link', { name: /new to lmaa\? start here/i })
    const links = screen.getAllByRole('link')
    const titles = links.map((link) => link.textContent ?? '')
    const guide = titles.findIndex((text) => /new to lmaa\? start here/i.test(text))
    const testing = titles.findIndex((text) => /getting ready for a belt test/i.test(text))
    const programs = titles.findIndex((text) => /^programs/i.test(text))
    expect(guide).toBeGreaterThan(-1)
    expect(testing).toBeGreaterThan(guide)
    expect(programs).toBeGreaterThan(testing)
  })

  it('shows the testing page with its sections as headings', async () => {
    renderApp('/more/page/testing')
    await screen.findByRole('heading', { level: 1, name: /getting ready for a belt test/i })
    expect(screen.getByRole('heading', { level: 2, name: /before the test/i })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: /little tigers tests/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/basic form #1/i)).toBeInTheDocument()
    expect(screen.queryByText(/^## /)).not.toBeInTheDocument()
  })
})
