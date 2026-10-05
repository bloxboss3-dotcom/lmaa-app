import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

describe('message the academy (demo mode)', () => {
  it('is one tap from Home, Contact and More', async () => {
    const user = userEvent.setup()
    renderApp('/')
    await user.click(await screen.findByRole('link', { name: /^message$/i }))
    expect(await screen.findByRole('heading', { name: /message the academy/i })).toBeInTheDocument()

    renderApp('/more/contact')
    expect(
      (await screen.findAllByRole('link', { name: /message the academy/i })).length,
    ).toBeGreaterThan(0)
  })

  it('will not hand an empty message to the mail app', async () => {
    const user = userEvent.setup()
    renderApp('/more/message')
    const send = await screen.findByRole('link', { name: /open in my mail app/i })

    await user.click(send)

    expect(await screen.findByText(/tell us your name/i)).toBeInTheDocument()
    expect(screen.getByText(/email address or phone number so we can reply/i)).toBeInTheDocument()
    expect(screen.getByText(/few more words/i)).toBeInTheDocument()
    expect(screen.queryByText(/mail app should now be open/i)).not.toBeInTheDocument()
  })

  it('writes the whole email for the family, addressed to the academy', async () => {
    const user = userEvent.setup()
    renderApp('/more/message')

    await user.type(await screen.findByLabelText(/your name/i), 'Jordan Rivera')
    await user.type(screen.getByLabelText(/email or phone number/i), '(503) 555-0100')
    await user.selectOptions(screen.getByLabelText(/what is it about/i), 'trial')
    await user.type(
      screen.getByLabelText(/your message/i),
      'My son is seven and would like to try a class. Which day suits a beginner?',
    )

    const send = screen.getByRole('link', { name: /open in my mail app/i })
    const href = send.getAttribute('href') ?? ''
    expect(href.startsWith('mailto:lmaa.wilsonville@gmail.com?')).toBe(true)
    const url = new URL(href)
    expect(url.searchParams.get('subject')).toMatch(/Trying a class — from Jordan Rivera/)
    expect(url.searchParams.get('body')).toContain('Reply to: (503) 555-0100')

    // jsdom does not navigate to mailto: links, which is exactly what we want here.
    await user.click(send)
    expect(await screen.findByText(/mail app should now be open/i)).toBeInTheDocument()
  })

  it('never claims the app itself delivered anything without a backend', async () => {
    renderApp('/more/message')
    await screen.findByRole('heading', { name: /message the academy/i })
    expect(screen.queryByRole('button', { name: /^send message$/i })).not.toBeInTheDocument()
    expect(screen.getByText(/opens your mail app/i)).toBeInTheDocument()
  })
})
