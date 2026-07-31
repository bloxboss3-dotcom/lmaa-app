import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'
import { Icon, type IconName } from './Icon'

export type BadgeTone = 'neutral' | 'red' | 'gold' | 'dark' | 'success' | 'warning' | 'muted'

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-ink-100 text-ink-700',
  red: 'bg-crimson-50 text-crimson-700 ring-1 ring-crimson-100',
  gold: 'bg-gold-100 text-gold-700 ring-1 ring-gold-200',
  dark: 'bg-ink-900 text-white',
  success: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
  warning: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
  muted: 'bg-white text-ink-500 ring-1 ring-ink-200',
}

interface BadgeProps {
  children: ReactNode
  tone?: BadgeTone
  icon?: IconName
  className?: string
  uppercase?: boolean
}

export function Badge({ children, tone = 'neutral', icon, className, uppercase }: BadgeProps) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.7rem] font-bold',
        uppercase && 'tracking-[0.08em] uppercase',
        TONES[tone],
        className,
      )}
    >
      {icon ? <Icon name={icon} size={13} /> : null}
      {children}
    </span>
  )
}

/** Small "this is example content" marker used on seeded demo records. */
export function SampleBadge({ className }: { className?: string }) {
  return (
    <Badge tone="warning" className={className} uppercase>
      Sample
    </Badge>
  )
}
