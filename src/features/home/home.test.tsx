import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { AppProviders } from '@/app/providers'
import { routes } from '@/app/routes'
import { HOME_PHOTOS } from '@/content/images'

function renderApp(path = '/') {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  return render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  )
}

describe('home photo strip', () => {
  it('opens on the academy pictures, with one dot per photo', async () => {
    renderApp()
    const strip = await screen.findByRole('region', { name: /photos from the academy/i })
    const slides = within(strip).getAllByRole('group')
    expect(slides).toHaveLength(HOME_PHOTOS.length)
    expect(slides[0]).toHaveAccessibleName(`1 of ${HOME_PHOTOS.length}`)
    expect(within(strip).getAllByRole('button', { name: /show photo/i })).toHaveLength(
      HOME_PHOTOS.length,
    )
    // Illustrations are decorative: no alt text to read out, no gallery link to a page
    // the academy has not filled yet.
    expect(within(strip).queryByRole('link')).not.toBeInTheDocument()
  })

  it('still answers "when is class?" right under the photos', async () => {
    renderApp()
    await screen.findByRole('region', { name: /photos from the academy/i })
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading.textContent).toMatch(/left today|classes are done|closed today|no classes/i)
  })
})

describe('free trial', () => {
  it('offers new families the trial from Home and lands them on the message form with the topic set', async () => {
    renderApp('/')
    const link = await screen.findByRole('link', { name: /ask about a free trial/i })
    expect(link).toHaveAttribute('href', expect.stringContaining('/more/message?topic=trial'))

    renderApp('/more/message?topic=trial')
    const topics = await screen.findAllByLabelText(/what is it about/i)
    expect(topics[topics.length - 1]).toHaveValue('trial')
  })
})
