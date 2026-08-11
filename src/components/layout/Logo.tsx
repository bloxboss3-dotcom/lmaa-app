import logoUrl from '@/assets/brand/lmaa-logo.png'
import wordmarkUrl from '@/assets/brand/lmaa-wordmark.png'
import { cx } from '@/lib/cx'

/**
 * The academy's own artwork.
 *
 * `lmaa-logo.png` is the full lockup from leesmartialartsacademy.com — the
 * flying kick, the arched academy name and the LMAA letters. `lmaa-wordmark.png`
 * is the LMAA lettering cropped out of that same file, because the full lockup
 * turns to mush below about 80px and app chrome has nothing like that to spare.
 *
 * Both are decorative wherever the academy name is already written next to
 * them, and both are ~4.5:1 and 1:1 respectively — always set width via the
 * `size`/height props so nothing squashes.
 */

/** Full lockup. Use at 72px and above, where the arched text still reads. */
export function LogoMark({
  size = 96,
  className,
  decorative = false,
}: {
  size?: number
  className?: string
  decorative?: boolean
}) {
  return (
    <img
      src={logoUrl}
      width={size}
      height={Math.round(size * (506 / 512))}
      className={cx('shrink-0 object-contain', className)}
      alt={decorative ? '' : "Lee's Martial Arts Academy"}
      aria-hidden={decorative || undefined}
      draggable={false}
    />
  )
}

/** LMAA lettering only — legible down to about 18px tall. */
export function Wordmark({
  height = 22,
  className,
  decorative = false,
}: {
  height?: number
  className?: string
  decorative?: boolean
}) {
  return (
    <img
      src={wordmarkUrl}
      width={Math.round(height * (440 / 98))}
      height={height}
      className={cx('shrink-0 object-contain', className)}
      alt={decorative ? '' : "Lee's Martial Arts Academy"}
      aria-hidden={decorative || undefined}
      draggable={false}
    />
  )
}
