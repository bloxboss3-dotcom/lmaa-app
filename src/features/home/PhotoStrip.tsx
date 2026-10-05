import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { cx } from '@/lib/cx'
import { useMediaQuery } from '@/lib/hooks'

export interface StripPhoto {
  src: string
  alt: string
  caption?: string
}

interface PhotoStripProps {
  photos: StripPhoto[]
  /** Where a tap on a photo goes, e.g. the gallery. Omit for plain illustration. */
  to?: string
  intervalMs?: number
}

/** How long a touch pauses the rotation, so it never moves under a thumb. */
const PAUSE_AFTER_TOUCH_MS = 8000

/**
 * The academy's photographs, rotating gently at the top of Home.
 *
 * Built on native horizontal scrolling with scroll-snap rather than a slider
 * library: it is swipeable on every phone, works without JavaScript finishing,
 * and respects "reduce motion" by simply not auto-advancing.
 */
export function PhotoStrip({ photos, to, intervalMs = 5000 }: PhotoStripProps) {
  const scroller = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const pauseTimer = useRef<number | null>(null)
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const count = photos.length

  const scrollToIndex = (target: number, behavior: ScrollBehavior = 'smooth') => {
    const element = scroller.current
    if (!element || typeof element.scrollTo !== 'function' || count === 0) return
    const wrapped = ((target % count) + count) % count
    element.scrollTo({ left: wrapped * element.clientWidth, behavior })
  }

  // Follow the finger: the dots reflect wherever the family scrolled to.
  useEffect(() => {
    const element = scroller.current
    if (!element) return
    const onScroll = () => {
      const width = Math.max(1, element.clientWidth)
      setIndex(Math.min(count - 1, Math.max(0, Math.round(element.scrollLeft / width))))
    }
    element.addEventListener('scroll', onScroll, { passive: true })
    return () => element.removeEventListener('scroll', onScroll)
  }, [count])

  // Auto-advance, unless the family asked for less motion, is touching the
  // strip, or has the app in the background.
  useEffect(() => {
    if (count < 2 || paused || reduceMotion) return
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      scrollToIndex(index + 1)
    }, intervalMs)
    return () => window.clearInterval(id)
  }, [count, paused, reduceMotion, index, intervalMs])

  useEffect(
    () => () => {
      if (pauseTimer.current) window.clearTimeout(pauseTimer.current)
    },
    [],
  )

  const pauseBriefly = () => {
    setPaused(true)
    if (pauseTimer.current) window.clearTimeout(pauseTimer.current)
    pauseTimer.current = window.setTimeout(() => setPaused(false), PAUSE_AFTER_TOUCH_MS)
  }

  if (count === 0) return null

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Photos from the academy"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onPointerDown={pauseBriefly}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {/* A scrollable region has to be reachable from the keyboard too: the strip
          takes focus and the arrow keys move it, mirroring a swipe. */}
      <div
        ref={scroller}
        tabIndex={0}
        aria-label="Photo strip. Use the left and right arrow keys to move between photos."
        onKeyDown={(event) => {
          if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
          event.preventDefault()
          scrollToIndex(index + (event.key === 'ArrowRight' ? 1 : -1))
        }}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-[var(--radius-card)] bg-ink-100 shadow-[var(--shadow-soft)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {photos.map((photo, i) => {
          const image = (
            <img
              src={photo.src}
              alt={photo.alt}
              className="aspect-[16/9] w-full object-cover sm:aspect-[2/1]"
              loading={i === 0 ? 'eager' : 'lazy'}
              decoding="async"
              draggable={false}
            />
          )
          return (
            <figure
              key={`${photo.src}-${i}`}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
              className="relative w-full shrink-0 snap-center"
            >
              {to ? (
                <Link to={to} className="block" aria-label="Open the photo gallery">
                  {image}
                </Link>
              ) : (
                image
              )}
              {photo.caption ? (
                <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-900/75 to-transparent px-4 pt-10 pb-3 text-sm font-medium text-white">
                  {photo.caption}
                </figcaption>
              ) : null}
            </figure>
          )
        })}
      </div>

      {count > 1 ? (
        <div className="mt-2 flex justify-center gap-1.5">
          {photos.map((photo, i) => (
            <button
              key={`${photo.src}-${i}`}
              type="button"
              onClick={() => {
                pauseBriefly()
                scrollToIndex(i)
              }}
              aria-label={`Show photo ${i + 1} of ${count}`}
              aria-current={i === index ? 'true' : undefined}
              className={cx(
                'h-2.5 rounded-full transition-all',
                i === index ? 'w-6 bg-crimson-600' : 'w-2.5 bg-ink-200 hover:bg-ink-300',
              )}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}
