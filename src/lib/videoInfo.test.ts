import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchVideoInfo } from './videoInfo'

function stubFetch(body: unknown, ok = true) {
  const fetchMock = vi.fn(
    async (_input: string | URL | Request) =>
      new Response(JSON.stringify(body), { status: ok ? 200 : 404 }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchVideoInfo', () => {
  it('asks YouTube for the title of a YouTube link and keeps no poster for it', async () => {
    const fetchMock = stubFetch({
      title: 'Taegeuk 1 Jang',
      author_name: 'LMAA',
      thumbnail_url: 'https://i.ytimg.com/x.jpg',
    })
    const info = await fetchVideoInfo('https://youtu.be/dQw4w9WgXcQ')
    expect(info).toEqual({ title: 'Taegeuk 1 Jang', author: 'LMAA', thumbnailUrl: undefined })
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/^https:\/\/www\.youtube\.com\/oembed\?url=/)
  })

  it('keeps the poster for Vimeo, which the app cannot derive from the link', async () => {
    stubFetch({ title: 'Sparring drills', thumbnail_url: 'https://i.vimeocdn.com/video/1.jpg' })
    const info = await fetchVideoInfo('https://vimeo.com/123456789')
    expect(info?.thumbnailUrl).toBe('https://i.vimeocdn.com/video/1.jpg')
  })

  it('never calls out for a link the app cannot play, and copes with a failed lookup', async () => {
    const fetchMock = stubFetch({ title: 'x' })
    expect(await fetchVideoInfo('https://example.com/video.mp4')).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
    stubFetch({}, false)
    expect(await fetchVideoInfo('https://youtu.be/dQw4w9WgXcQ')).toBeNull()
  })
})
