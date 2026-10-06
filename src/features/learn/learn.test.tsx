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
})
