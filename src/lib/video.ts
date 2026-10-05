/**
 * Privacy-conscious video embedding.
 *
 * YouTube links are rewritten to youtube-nocookie.com and Vimeo to its player
 * domain, so opening a curriculum video does not drop advertising cookies on a
 * family's device. Anything we cannot recognise falls back to an "Open video"
 * link rather than embedding an unknown third party.
 */

export interface VideoEmbed {
  provider: 'youtube' | 'vimeo'
  embedUrl: string
  /**
   * A still from the video, when the provider serves one without cookies.
   * YouTube's image CDN (i.ytimg.com) sets none, so a thumbnail can show in a
   * list without the page talking to youtube.com until someone presses play.
   */
  thumbnailUrl?: string
}

export function parseVideoUrl(rawUrl: string | undefined): VideoEmbed | null {
  if (!rawUrl) return null
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return null
  }
  const host = url.hostname.replace(/^www\./, '')

  if (host === 'youtu.be') {
    const id = url.pathname.slice(1)
    return id ? youtubeEmbed(id) : null
  }
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    if (url.pathname === '/watch') {
      const id = url.searchParams.get('v')
      return id ? youtubeEmbed(id) : null
    }
    const embedMatch = /^\/(embed|shorts|live)\/([\w-]+)/.exec(url.pathname)
    if (embedMatch) return youtubeEmbed(embedMatch[2])
    return null
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = /(\d{6,})/.exec(url.pathname)?.[1]
    return id ? { provider: 'vimeo', embedUrl: `https://player.vimeo.com/video/${id}?dnt=1` } : null
  }
  return null
}

function youtube(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?rel=0&modestbranding=1`
}

function youtubeEmbed(id: string): VideoEmbed {
  return {
    provider: 'youtube',
    embedUrl: youtube(id),
    thumbnailUrl: `https://i.ytimg.com/vi/${encodeURIComponent(id)}/mqdefault.jpg`,
  }
}
