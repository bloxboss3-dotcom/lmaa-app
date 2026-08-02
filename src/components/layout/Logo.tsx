import { cx } from '@/lib/cx'

/**
 * LMAA placeholder mark: three rank chevrons over a gold belt line.
 *
 * Original artwork drawn for this app. Replace with the official LMAA logo
 * once the vector file is supplied (see CONTENT_NEEDED.md).
 */
export function LogoMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={cx('shrink-0', className)}
      role="img"
      aria-label="Lee's Martial Arts Academy"
    >
      <rect width="64" height="64" rx="16" fill="var(--color-ink-900)" />
      <polygon points="32,12 52,25 52,32.5 32,19.5 12,32.5 12,25" fill="var(--color-crimson-600)" />
      <polygon points="32,22.5 52,35.5 52,43 32,30 12,43 12,35.5" fill="#ffffff" />
      <rect x="12" y="48.5" width="40" height="3.5" fill="var(--color-gold-500)" />
    </svg>
  )
}

interface WordmarkProps {
  className?: string
  tone?: 'light' | 'dark'
  subtitle?: string
}

export function Wordmark({ className, tone = 'dark', subtitle }: WordmarkProps) {
  return (
    <span className={cx('flex items-center gap-2.5', className)}>
      <LogoMark size={34} />
      <span className="leading-tight">
        <span
          className={cx(
            'block text-[0.95rem] font-extrabold tracking-tight',
            tone === 'light' ? 'text-white' : 'text-ink-900',
          )}
        >
          Lee&rsquo;s Martial Arts
        </span>
        <span
          className={cx(
            'block text-[0.62rem] font-bold tracking-[0.22em] uppercase',
            tone === 'light' ? 'text-gold-400' : 'text-crimson-600',
          )}
        >
          {subtitle ?? 'Academy'}
        </span>
      </span>
    </span>
  )
}
