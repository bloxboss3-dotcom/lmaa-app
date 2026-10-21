import { afterEach, describe, expect, it, vi } from 'vitest'
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

    expect(
      await screen.findByText(/editors can manage content but not academy information/i),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /save academy information/i }),
    ).not.toBeInTheDocument()
  })
})

describe('messages from families', () => {
  it('shows the inbox with the sample message and lets staff mark it handled', async () => {
    const user = userEvent.setup()
    renderApp('/admin')
    await user.click(await screen.findByRole('button', { name: /explore as administrator/i }))
    await user.click((await screen.findAllByRole('link', { name: /messages from families/i }))[0])

    expect(
      await screen.findByRole('heading', { name: /messages from families/i }),
    ).toBeInTheDocument()
    expect(await screen.findByText(/sample parent/i)).toBeInTheDocument()
    // Demo mode says plainly that real messages do not arrive here.
    expect(
      screen.getByText(/open their own mail app instead of arriving here/i),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /mark as handled/i }))
    // The "New" filter is on, so the handled message leaves the list.
    await waitFor(() => {
      expect(screen.queryByText(/sample parent/i)).not.toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /^all/i }))
    expect(await screen.findByText(/sample parent/i)).toBeInTheDocument()
    expect(screen.getByText(/^handled$/i)).toBeInTheDocument()
  })
})

describe('adding videos', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fills the title in from a pasted YouTube link and says it will play in the app', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ title: 'Taegeuk 1 Jang', author_name: 'LMAA Wilsonville' }),
            { status: 200 },
          ),
      ),
    )
    const user = userEvent.setup()
    renderApp('/admin')
    await user.click(await screen.findByRole('button', { name: /explore as administrator/i }))
    await user.click((await screen.findAllByRole('link', { name: /learning resources/i }))[0])
    await user.click(await screen.findByRole('link', { name: /new resource/i }))

    await user.type(await screen.findByLabelText(/video link/i), 'https://youtu.be/dQw4w9WgXcQ')

    expect(await screen.findByText(/plays inside the app/i)).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByLabelText(/^title/i)).toHaveValue('Taegeuk 1 Jang')
    })
  })

  it('warns when a link is not one the app can play', async () => {
    const user = userEvent.setup()
    renderApp('/admin')
    await user.click(await screen.findByRole('button', { name: /explore as administrator/i }))
    await user.click((await screen.findAllByRole('link', { name: /learning resources/i }))[0])
    await user.click(await screen.findByRole('link', { name: /new resource/i }))

    await user.type(await screen.findByLabelText(/video link/i), 'https://example.com/forms.mp4')
    expect(await screen.findByText(/will open outside the app/i)).toBeInTheDocument()
  })

  it('adds a whole batch of videos from pasted links', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        const id = decodeURIComponent(String(url)).includes('AAAAAAAAAAA')
          ? 'Taegeuk 1 Jang'
          : 'Taegeuk 2 Jang'
        return new Response(JSON.stringify({ title: id }), { status: 200 })
      }),
    )
    const user = userEvent.setup()
    renderApp('/admin')
    await user.click(await screen.findByRole('button', { name: /explore as administrator/i }))
    await user.click((await screen.findAllByRole('link', { name: /learning resources/i }))[0])
    await user.click(await screen.findByRole('link', { name: /add several videos/i }))

    await user.type(await screen.findByLabelText(/^level/i), 'Yellow belt')
    await user.type(
      screen.getByLabelText(/^links/i),
      'https://youtu.be/AAAAAAAAAAA\nhttps://www.youtube.com/watch?v=BBBBBBBBBBB\nhttps://example.com/nope',
    )
    await user.click(screen.getByRole('button', { name: /check links/i }))

    expect(await screen.findByDisplayValue('Taegeuk 1 Jang')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Taegeuk 2 Jang')).toBeInTheDocument()
    expect(screen.getByText(/not a youtube or vimeo link/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /add 2 videos/i }))

    // Back on the list, both videos are there and filed under the level.
    expect(await screen.findByText('Taegeuk 1 Jang')).toBeInTheDocument()
    expect(screen.getByText('Taegeuk 2 Jang')).toBeInTheDocument()
  })
})
