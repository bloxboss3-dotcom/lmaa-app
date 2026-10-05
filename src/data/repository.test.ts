import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DemoRepository } from './demo/demoRepository'
import { ResilientRepository } from './index'
import { ContentError, type ContentRepository } from './repository'

/** A repository whose every method fails, standing in for a backend outage. */
function failingRepository(): ContentRepository {
  const fail = () => Promise.reject(new ContentError('backend unavailable'))
  return new Proxy({} as ContentRepository, {
    get(_target, property) {
      if (property === 'kind') return 'supabase'
      return fail
    },
  })
}

describe('DemoRepository', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('serves the seeded LMAA schedule out of the box', async () => {
    const repository = new DemoRepository()
    const schedule = await repository.listScheduleEntries()
    expect(schedule.length).toBeGreaterThan(0)
    const tigers = schedule.filter((entry) => entry.className === 'Little Tigers')
    expect(tigers).toHaveLength(4)
    expect(tigers.find((entry) => entry.dayOfWeek === 1)).toMatchObject({
      startTime: '16:25',
      endTime: '16:55',
    })
    expect(tigers.find((entry) => entry.dayOfWeek === 2)).toMatchObject({
      startTime: '15:40',
      endTime: '16:10',
    })
  })

  it('hides unpublished records unless they are asked for', async () => {
    const repository = new DemoRepository()
    await repository.saveAnnouncement({
      title: 'Draft',
      body: 'Not ready',
      category: 'important',
      priority: 'normal',
      pinned: false,
      published: false,
      publishedAt: new Date().toISOString(),
    })

    const publicList = await repository.listAnnouncements()
    const adminList = await repository.listAnnouncements({ includeUnpublished: true })
    expect(publicList.some((item) => item.title === 'Draft')).toBe(false)
    expect(adminList.some((item) => item.title === 'Draft')).toBe(true)
  })

  it('persists admin edits to localStorage for the next visit', async () => {
    const first = new DemoRepository()
    expect(first.hasLocalEdits()).toBe(false)
    const saved = await first.saveFaq({
      question: 'Where do we park?',
      answer: 'Behind the building.',
      sortOrder: 1,
      published: true,
    })
    expect(first.hasLocalEdits()).toBe(true)

    const second = new DemoRepository()
    const faqs = await second.listFaqs()
    expect(faqs.find((faq) => faq.id === saved.id)?.question).toBe('Where do we park?')
  })

  it('updates an existing record instead of duplicating it', async () => {
    const repository = new DemoRepository()
    const created = await repository.saveEvent({
      title: 'Original',
      startAt: new Date().toISOString(),
      allDay: false,
      description: 'x',
      featured: false,
      published: true,
      publishedAt: new Date().toISOString(),
    })
    await repository.saveEvent({
      id: created.id,
      title: 'Renamed',
      startAt: created.startAt,
      allDay: false,
      description: 'x',
      featured: false,
      published: true,
      publishedAt: created.publishedAt,
    })
    const events = await repository.listEvents()
    expect(events.filter((item) => item.id === created.id)).toHaveLength(1)
    expect(events.find((item) => item.id === created.id)?.title).toBe('Renamed')
  })

  it('stops labelling content as a sample once a human edits it', async () => {
    const repository = new DemoRepository()
    // The draft privacy policy is the only seeded record still flagged as a
    // sample — everything else is the academy's own published information.
    const pages = await repository.listPages()
    const draft = pages.find((page) => page.slug === 'privacy')
    expect(draft?.isSample).toBe(true)
    const edited = await repository.savePage({ ...draft!, body: 'An approved policy.' })
    expect(edited.isSample).toBe(false)
  })

  it('deletes records', async () => {
    const repository = new DemoRepository()
    const [first] = await repository.listPrograms()
    await repository.deleteProgram(first.id)
    expect((await repository.listPrograms()).some((item) => item.id === first.id)).toBe(false)
  })

  it('can be reset back to the shipped seed content', async () => {
    const repository = new DemoRepository()
    await repository.saveFaq({ question: 'Q', answer: 'A', sortOrder: 1, published: true })
    repository.resetLocalEdits()
    expect(repository.hasLocalEdits()).toBe(false)
    expect((await repository.listFaqs()).some((faq) => faq.question === 'Q')).toBe(false)
  })

  it('never hands out its internal objects', async () => {
    const repository = new DemoRepository()
    const first = await repository.listFaqs()
    first[0].question = 'mutated'
    const second = await repository.listFaqs()
    expect(second[0].question).not.toBe('mutated')
  })
})

describe('ResilientRepository', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('uses the live backend when it is healthy', async () => {
    const primary = new DemoRepository()
    await primary.saveAnnouncement({
      title: 'From the backend',
      body: 'x',
      category: 'important',
      priority: 'normal',
      pinned: false,
      published: true,
      publishedAt: new Date(Date.now() - 1000).toISOString(),
    })
    const onDegraded = vi.fn()
    const repository = new ResilientRepository(primary, new DemoRepository(), onDegraded)

    const announcements = await repository.listAnnouncements()
    expect(announcements.some((item) => item.title === 'From the backend')).toBe(true)
    expect(onDegraded).toHaveBeenCalledWith(false)
  })

  it('falls back to built-in content when the backend fails', async () => {
    const onDegraded = vi.fn()
    const repository = new ResilientRepository(
      failingRepository(),
      new DemoRepository(),
      onDegraded,
    )

    const bundle = await repository.getBundle()
    expect(bundle.schedule.length).toBeGreaterThan(0)
    expect(onDegraded).toHaveBeenCalledWith(true, expect.anything())
  })

  it('reports the failure to admins instead of showing them stale content', async () => {
    const repository = new ResilientRepository(failingRepository(), new DemoRepository())
    await expect(repository.getBundle({ includeUnpublished: true })).rejects.toThrow()
  })

  it('never silently redirects a save to local storage', async () => {
    const fallback = new DemoRepository()
    const repository = new ResilientRepository(failingRepository(), fallback)
    await expect(
      repository.saveFaq({ question: 'Q', answer: 'A', sortOrder: 1, published: true }),
    ).rejects.toThrow()
    expect((await fallback.listFaqs()).some((faq) => faq.question === 'Q')).toBe(false)
  })

  it('recovers automatically once the backend comes back', async () => {
    const primary = new DemoRepository()
    let healthy = false
    const flaky = new Proxy({} as ContentRepository, {
      get(_target, property) {
        if (property === 'kind') return 'supabase'
        return (...args: unknown[]) => {
          if (!healthy) return Promise.reject(new ContentError('down'))
          return (
            primary[property as keyof ContentRepository] as (...a: unknown[]) => unknown
          ).apply(primary, args)
        }
      },
    })
    const onDegraded = vi.fn()
    const repository = new ResilientRepository(flaky, new DemoRepository(), onDegraded)

    await repository.getBundle()
    expect(onDegraded).toHaveBeenLastCalledWith(true, expect.anything())

    healthy = true
    await repository.getBundle()
    expect(onDegraded).toHaveBeenLastCalledWith(false)
  })
})

describe('messages from families', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('keeps messages out of the public content bundle', async () => {
    const repository = new DemoRepository()
    const bundle = await repository.getBundle()
    expect(Object.keys(bundle)).not.toContain('messages')
  })

  it('stores a sent message newest first and lets staff mark it handled', async () => {
    const repository = new DemoRepository()
    await repository.sendMessage({
      name: 'Jordan Rivera',
      contact: 'jordan@example.com',
      topic: 'trial',
      body: 'Which day suits a complete beginner?',
    })
    const inbox = await repository.listMessages()
    expect(inbox[0]).toMatchObject({ name: 'Jordan Rivera', status: 'new' })
    expect(inbox[0].handledAt).toBeUndefined()

    const handled = await repository.setMessageStatus(inbox[0].id, 'handled')
    expect(handled.status).toBe('handled')
    expect(handled.handledAt).toBeTruthy()

    const reopened = await repository.setMessageStatus(inbox[0].id, 'new')
    expect(reopened.handledAt).toBeUndefined()
  })

  it('never pretends a message was delivered by falling back to the demo store', async () => {
    const repository = new ResilientRepository(failingRepository(), new DemoRepository())
    await expect(
      repository.sendMessage({
        name: 'A',
        contact: 'a@b.co',
        topic: 'general',
        body: 'hello there',
      }),
    ).rejects.toBeInstanceOf(ContentError)
    await expect(repository.listMessages()).rejects.toBeInstanceOf(ContentError)
  })
})
