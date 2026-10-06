import { parseVideoUrl } from './video'

/**
 * Title and poster for a video link, from the host's oEmbed service.
 *
 * Used by the staff editor only, so an administrator can paste a YouTube or
 * Vimeo link and have the title filled in. Family screens never call this:
 * they talk to no third party until someone presses play.
 */
export interface VideoInfo {
  title: string
  thumbnailUrl?: string
  author?: string
}

function endpointFor(url: string, provider: 'youtube' | 'vimeo'): string {
  const target = encodeURIComponent(url)
  return provider === 'youtube'
    ? `https://www.youtube.com/oembed?url=${target}&format=json`
    : `https://vimeo.com/api/oembed.json?url=${target}`
}

export async function fetchVideoInfo(url: string, signal?: AbortSignal): Promise<VideoInfo | null> {
  const embed = parseVideoUrl(url)
  if (!embed) return null
  try {
    const response = await fetch(endpointFor(url, embed.provider), { signal })
    if (!response.ok) return null
    const data = (await response.json()) as {
      title?: unknown
      thumbnail_url?: unknown
      author_name?: unknown
    }
    const title = typeof data.title === 'string' ? data.title.trim() : ''
    if (!title) return null
    return {
      title,
      // YouTube stills are derived from the link at display time, so only a
      // host the app cannot derive from (Vimeo) needs the poster stored.
      thumbnailUrl:
        embed.provider === 'vimeo' && typeof data.thumbnail_url === 'string'
          ? data.thumbnail_url
          : undefined,
      author: typeof data.author_name === 'string' ? data.author_name : undefined,
    }
  } catch {
    return null
  }
}
