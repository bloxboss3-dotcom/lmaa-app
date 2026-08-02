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
      <rect width="64" height="64" rx="14" fill="var(--color-ink-900)" />
      <polygon points="32,14 51,26.5 51,33.5 32,21 13,33.5 13,26.5" fill="var(--color-crimson-600)" />
      <polygon points="32,24 51,36.5 51,43.5 32,31 13,43.5 13,36.5" fill="#ffffff" />
      <rect x="13" y="48" width="38" height="3" fill="var(--color-gold-400)" />
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
