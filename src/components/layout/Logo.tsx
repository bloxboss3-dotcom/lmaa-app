import { cx } from '@/lib/cx'

/**
 * LMAA placeholder mark: rank chevrons over a gold belt line.
 *
 * Original artwork drawn for this app. Replace with the official LMAA logo
 * once the vector file is supplied (see CONTENT_NEEDED.md).
 */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={cx('shrink-0', className)}
      role="img"
      aria-label="Lee's Martial Arts Academy"
    >
      <polygon points="32,10 54,24.5 54,33 32,18.5 10,33 10,24.5" fill="#c9302c" />
      <polygon points="32,23 54,37.5 54,46 32,31.5 10,46 10,37.5" fill="#ffffff" />
      <rect x="10" y="51" width="44" height="3.5" fill="#cfae5f" />
    </svg>
  )
}

interface WordmarkProps {
  className?: string
  tone?: 'light' | 'dark'
}

/**
 * Compact lockup. The stacked two-line version repeated the academy name that
 * the Home screen was already showing in full.
 */
export function Wordmark({ className, tone = 'dark' }: WordmarkProps) {
  return (
    <span className={cx('flex items-center gap-2', className)}>
      <LogoMark size={26} />
      <span
        className={cx(
          'text-[0.9375rem] font-semibold tracking-tight',
          tone === 'light' ? 'text-white' : 'text-ink-900',
        )}
      >
        Lee&rsquo;s Martial Arts
      </span>
    </span>
  )
}
