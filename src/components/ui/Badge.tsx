import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'
import { Icon, type IconName } from './Icon'

export type BadgeTone = 'neutral' | 'red' | 'gold' | 'dark' | 'success' | 'warning' | 'muted'

/**
 * Badges are labels, not decoration. They are quiet by default so that the one
 * badge that matters — "Cancelled" — actually stands out.
 */
const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-ink-50 text-ink-600',
  red: 'bg-crimson-500/12 text-crimson-200',
  gold: 'bg-gold-500/15 text-gold-200',
  dark: 'bg-ink-800 text-canvas',
  success: 'bg-emerald-500/15 text-emerald-300',
  warning: 'bg-amber-500/12 text-amber-200',
  muted: 'bg-transparent text-ink-500 ring-1 ring-ink-200',
}

interface BadgeProps {
  children: ReactNode
  tone?: BadgeTone
  icon?: IconName
  className?: string
}

export function Badge({ children, tone = 'neutral', icon, className }: BadgeProps) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6875rem] font-medium',
        TONES[tone],
        className,
      )}
    >
      {icon ? <Icon name={icon} size={12} /> : null}
      {children}
    </span>
  )
}

/** Marks seeded demo content so nobody mistakes it for real academy news. */
export function SampleBadge({ className }: { className?: string }) {
  return (
    <Badge tone="warning" className={className}>
      Sample
    </Badge>
  )
}
