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

/** The default: the academy has not switched family accounts on. */
describe('family accounts switched off', () => {
  it('offers no way in from Home or More', async () => {
    renderApp('/')
    await screen.findByText(/try two weeks free/i)
    expect(screen.queryByRole('link', { name: /my family/i })).not.toBeInTheDocument()
  })

  it('says so plainly if someone opens the address anyway', async () => {
    renderApp('/family')
    expect(await screen.findByText(/family sign-in is not available yet/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /sample family/i })).not.toBeInTheDocument()
  })
})
