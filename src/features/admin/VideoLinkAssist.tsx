import { useEffect, useRef, useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { parseVideoUrl } from '@/lib/video'
import { fetchVideoInfo, type VideoInfo } from '@/lib/videoInfo'
import type { FormValues } from './validation'

interface VideoLinkAssistProps {
  values: FormValues
  onChange: (name: string, value: string) => void
}

/**
 * Shown under the resource form while a video is being added.
 *
 * Paste a link and three things happen without any typing: the app says
 * whether the video will play inside it, shows its poster, and fills in the
 * title (only when the title is still empty — it never overwrites a title
 * staff typed themselves).
 */
export function VideoLinkAssist({ values, onChange }: VideoLinkAssistProps) {
  const url = String(values.videoUrl ?? '').trim()
  const title = String(values.title ?? '').trim()
  const embed = parseVideoUrl(url)
  const [info, setInfo] = useState<VideoInfo | null>(null)
  const [checking, setChecking] = useState(false)
  // The title is auto-filled at most once per link, so clearing it on purpose
  // does not bring it straight back.
  const filledFor = useRef<string | null>(null)

  useEffect(() => {
    setInfo(null)
    if (!embed) return
    const controller = new AbortController()
    setChecking(true)
    const timer = window.setTimeout(() => {
      void fetchVideoInfo(url, controller.signal).then((found) => {
        if (controller.signal.aborted) return
        setInfo(found)
        setChecking(false)
      })
    }, 400)
    return () => {
      controller.abort()
      window.clearTimeout(timer)
      setChecking(false)
    }
    // `embed` is derived from `url`.
  }, [url])

  useEffect(() => {
    if (!info || filledFor.current === url) return
    filledFor.current = url
    if (!title) onChange('title', info.title)
    if (info.thumbnailUrl && !String(values.thumbnailUrl ?? '').trim()) {
      onChange('thumbnailUrl', info.thumbnailUrl)
    }
    // Runs when a lookup lands; the form values it reads are current then.
  }, [info])

  if (values.type !== 'video' || !url) return null

  if (!embed) {
    return (
      <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200 sm:col-span-2">
        <Icon name="alert" size={18} className="mt-0.5 shrink-0" />
        <p>
          This link will open outside the app. Paste a YouTube or Vimeo link and the video plays
          inside it instead.
        </p>
      </div>
    )
  }

  const poster = info?.thumbnailUrl ?? embed.thumbnailUrl
  return (
    <div className="flex gap-3.5 rounded-xl bg-ink-50 p-3 ring-1 ring-ink-100 sm:col-span-2">
      {poster ? (
        <img
          src={poster}
          alt=""
          className="h-16 w-28 shrink-0 rounded-lg bg-ink-900 object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className="flex h-16 w-28 shrink-0 items-center justify-center rounded-lg bg-ink-900 text-white">
          <Icon name="play" size={20} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone="success" icon="check">
            Plays inside the app
          </Badge>
          {checking ? <span className="text-xs text-ink-400">Looking up the title…</span> : null}
        </div>
        {info ? (
          <p className="mt-1 truncate text-sm font-medium text-ink-900" title={info.title}>
            {info.title}
            {info.author ? (
              <span className="font-normal text-ink-500"> · {info.author}</span>
            ) : null}
          </p>
        ) : !checking ? (
          <p className="mt-1 text-sm text-ink-500">
            The title could not be fetched — type one above.
          </p>
        ) : null}
        {info && title && info.title !== title ? (
          <Button
            size="sm"
            variant="secondary"
            className="mt-2"
            onClick={() => onChange('title', info.title)}
          >
            Use the video&rsquo;s title
          </Button>
        ) : null}
      </div>
    </div>
  )
}
