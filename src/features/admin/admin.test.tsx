import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { AppProviders } from '@/app/providers'
import { routes } from '@/app/routes'

/**
 * End-to-end check of the admin experience in demo mode: sign in, publish an
 * update, and confirm it reaches the family-facing feed. This also proves the
 * lazily-loaded admin routes resolve correctly.
 */
function renderApp(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  return render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  )
}

describe('admin area', () => {
  it('requires a session before showing the content tools', async () => {
    renderApp('/admin')
    expect(await screen.findByText(/this is a demonstration/i)).toBeInTheDocument()
    expect(screen.queryByText(/post an update/i)).not.toBeInTheDocument()
  })

  it('never suggests the demo login is real security', async () => {
    renderApp('/admin')
    expect(await screen.findByText(/no real sign-in and no real security/i)).toBeInTheDocument()
  })

  it('opens the dashboard after entering the demo', async () => {
    const user = userEvent.setup()
    renderApp('/admin')

    await user.click(await screen.findByRole('button', { name: /explore as administrator/i }))

    expect(await screen.findByText(/demo administrator/i)).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: /post an update/i })).toBeInTheDocument()
    // The demo warning has to stay visible while working.
    expect(screen.getByText(/changes are saved in this browser only/i)).toBeInTheDocument()
  })

  it('refuses to save an update with no headline or message', async () => {
    const user = userEvent.setup()
    renderApp('/admin')
    await user.click(await screen.findByRole('button', { name: /explore as administrator/i }))
    await user.click((await screen.findAllByRole('link', { name: /post an update/i }))[0])

    await user.click(await screen.findByRole('button', { name: /save & publish/i }))

    expect(await screen.findByText(/headline is required/i)).toBeInTheDocument()
    expect(screen.getByText(/message is required/i)).toBeInTheDocument()
  })

  it('publishes an update that families can then read', async () => {
    const user = userEvent.setup()
    renderApp('/admin')
    await user.click(await screen.findByRole('button', { name: /explore as administrator/i }))
    await user.click((await screen.findAllByRole('link', { name: /post an update/i }))[0])

    await user.type(await screen.findByLabelText(/headline/i), 'Dojang closed Friday')
    await user.type(screen.getByLabelText(/message/i), 'We are closed this Friday for maintenance.')
    await user.click(screen.getByRole('button', { name: /save & publish/i }))

    // Back on the list screen, the new update is there.
    await waitFor(() => {
      expect(screen.getByText('Dojang closed Friday')).toBeInTheDocument()
    })

    // And it is visible to families.
    await user.click(screen.getAllByRole('link', { name: /view app/i })[0])
    await user.click(screen.getAllByRole('link', { name: /^updates$/i })[0])
    expect(await screen.findByText('Dojang closed Friday')).toBeInTheDocument()
  })

  it('tells the truth about push notifications instead of faking a send', async () => {
    const user = userEvent.setup()
    renderApp('/admin')
    await user.click(await screen.findByRole('button', { name: /explore as administrator/i }))
    await user.click((await screen.findAllByRole('link', { name: /post an update/i }))[0])

    const pushToggle = await screen.findByLabelText(/also send a push notification/i)
    expect(pushToggle).toBeDisabled()
    expect(screen.getByText(/not connected yet, so nothing will be sent/i)).toBeInTheDocument()
  })

  it('asks before deleting something', async () => {
    const user = userEvent.setup()
    renderApp('/admin')
    await user.click(await screen.findByRole('button', { name: /explore as administrator/i }))
    await user.click((await screen.findAllByRole('link', { name: /questions/i }))[0])

    const deleteButtons = await screen.findAllByRole('button', { name: /^delete /i })
    await user.click(deleteButtons[0])

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument()
  })

  it('keeps academy information read-only for editors', async () => {
    const user = userEvent.setup()
    renderApp('/admin')
    await user.click(await screen.findByRole('button', { name: /explore as editor/i }))
    await user.click((await screen.findAllByRole('link', { name: /academy info/i }))[0])

    expect(await screen.findByText(/editors can manage content but not academy information/i))
      .toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /save academy information/i })).not.toBeInTheDocument()
  })
})
