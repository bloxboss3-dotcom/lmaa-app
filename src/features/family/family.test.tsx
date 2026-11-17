import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { AppProviders } from '@/app/providers'
import { routes } from '@/app/routes'

// Family accounts are off by default; these tests are about what happens once
// the academy switches them on.
vi.mock('@/config/features', () => ({
  features: { leadership: false, familyAccounts: true },
}))

function renderApp(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  return render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('My family, with no database connected', () => {
  it('says sign-in is not switched on, and offers no email box to type into', async () => {
    renderApp('/family')
    expect(await screen.findByText(/family sign-in is not switched on yet/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument()
  })

  it('shows the sample family, labelled as invented', async () => {
    const user = userEvent.setup()
    renderApp('/family')
    await user.click(await screen.findByRole('button', { name: /see a sample family/i }))

    expect(await screen.findByText(/these students are invented/i)).toBeInTheDocument()
    const riley = (await screen.findByRole('heading', { name: 'Riley S.' })).closest(
      'div.space-y-4',
    )!
    expect(within(riley as HTMLElement).getByText(/white belt · belt 1 of 13/i)).toBeInTheDocument()
    expect(within(riley as HTMLElement).getByText('Sample')).toBeInTheDocument()
    expect(
      within(riley as HTMLElement).getByText(/1 more stripe to earn before testing/i),
    ).toBeInTheDocument()
    expect(within(riley as HTMLElement).getByText('Yellow belt')).toBeInTheDocument()

    // The other sample family's student is not shown to this parent.
    expect(screen.queryByRole('heading', { name: 'Quinn T.' })).not.toBeInTheDocument()
  })

  it('marks a student with three stripes as ready to test and points to the test guide', async () => {
    const user = userEvent.setup()
    renderApp('/family')
    await user.click(await screen.findByRole('button', { name: /see a sample family/i }))

    const juno = (await screen.findByRole('heading', { name: 'Juno S.' })).closest('div.space-y-4')!
    expect(within(juno as HTMLElement).getByText('Ready to test')).toBeInTheDocument()
    expect(within(juno as HTMLElement).getByText(/stripe forms are done too/i)).toBeInTheDocument()
    expect(
      within(juno as HTMLElement).getByRole('link', { name: /getting ready for a belt test/i }),
    ).toHaveAttribute('href', '/more/page/testing')
    // New white belts get the guide for new families first.
    expect(screen.getByRole('link', { name: /new to lmaa\? start here/i })).toBeInTheDocument()
  })

  it('is reachable from Home and from More', async () => {
    renderApp('/')
    expect(await screen.findByRole('link', { name: /my family/i })).toHaveAttribute(
      'href',
      '/family',
    )
  })
})

describe('Students & families, for staff', () => {
  async function openStudents() {
    const user = userEvent.setup()
    renderApp('/admin/students')
    await user.click(await screen.findByRole('button', { name: /explore as administrator/i }))
    await screen.findByRole('heading', { name: /students & families/i })
    return user
  }

  it('warns that demo students are samples kept in this browser', async () => {
    await openStudents()
    expect(await screen.findByText(/please do not type real students here/i)).toBeInTheDocument()
  })

  it('adds a stripe in one tap, and takes it back', async () => {
    const user = await openStudents()
    await user.click(await screen.findByRole('button', { name: /add a stripe for riley s\./i }))
    expect(await screen.findByText(/white belt · 3 of 3 stripes/i)).toBeInTheDocument()
    // Three stripes: nothing more to add.
    expect(
      screen.queryByRole('button', { name: /add a stripe for riley s\./i }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /take a stripe off riley s\./i }))
    expect(await screen.findByText(/white belt · 2 of 3 stripes/i)).toBeInTheDocument()
  })

  it('moves a student who passed up one belt and clears the stripes', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = await openStudents()
    await user.click(
      await screen.findByRole('button', { name: /passed: move to little tigers green stripe/i }),
    )
    expect(
      await screen.findByText(/little tigers green stripe · 0 of 3 stripes/i),
    ).toBeInTheDocument()
  })

  it('refuses a surname and a bad parent email before saving', async () => {
    const user = await openStudents()
    await user.click(await screen.findByRole('button', { name: /add a student/i }))
    await user.type(screen.getByLabelText(/first name/i), 'Zz Newkid')
    await user.type(screen.getByLabelText(/parent emails/i), 'not-an-email')
    await user.click(screen.getByRole('button', { name: /save student/i }))

    expect(await screen.findByText(/one letter: the first letter/i)).toBeInTheDocument()
    expect(screen.getByText(/not an email address: not-an-email/i)).toBeInTheDocument()
    expect(screen.queryByText('Zz Newkid .')).not.toBeInTheDocument()
  })

  it('saves a new student with a linked parent', async () => {
    const user = await openStudents()
    await user.click(await screen.findByRole('button', { name: /add a student/i }))
    await user.type(screen.getByLabelText(/first name/i), 'Zz Newkid')
    await user.type(screen.getByLabelText(/last initial/i), 'd')
    await user.selectOptions(screen.getByLabelText(/^belt/i), 'yellow')
    await user.type(screen.getByLabelText(/parent emails/i), 'Parent@Example.com')
    await user.click(screen.getByRole('button', { name: /save student/i }))

    const row = (await screen.findByText('Zz Newkid D.')).closest('div.space-y-3')!
    expect(
      within(row as HTMLElement).getByText(/yellow belt · 0 of 3 stripes/i),
    ).toBeInTheDocument()
    expect(within(row as HTMLElement).getByText(/1 parent email/i)).toBeInTheDocument()
  })
})
