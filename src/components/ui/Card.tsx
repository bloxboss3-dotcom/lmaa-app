import type { HTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cx } from '@/lib/cx'

/**
 * Surfaces.
 *
 * Hairline border, no shadow by default. Stacked drop-shadowed cards were what
 * made every screen read as a pile of equally-important boxes.
 */

/**
 * Tailwind resolves conflicting utilities by stylesheet order, not by the
 * order they appear in `class`, so a caller passing `bg-amber-50` would lose
 * to a default `bg-white`. Dropping the default when the caller supplies its
 * own keeps `<Card className="bg-amber-50">` doing the obvious thing.
 */
const supplies = (className: string | undefined, prefix: string): boolean =>
  new RegExp(`(^|\\s)${prefix}-`).test(className ?? '')

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  padded?: boolean
}

export function Card({ children, padded = true, className, ...rest }: CardProps) {
  return (
    <div
      className={cx(
        'rounded-[var(--radius-card)] border',
        !supplies(className, 'bg') && 'bg-surface',
        !supplies(className, 'border') && 'border-ink-100',
        padded && 'p-4',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  )
}

interface CardLinkProps {
  to: string
  children: ReactNode
  className?: string
  'aria-label'?: string
}

export function CardLink({ to, children, className, ...rest }: CardLinkProps) {
  return (
    <Link
      to={to}
      className={cx(
        'block rounded-[var(--radius-card)] border border-ink-100 bg-surface transition-colors',
        'hover:border-ink-200 active:bg-ink-50',
        className,
      )}
      {...rest}
    >
      {children}
    </Link>
  )
}

interface SectionHeadingProps {
  title: string
  action?: ReactNode
  className?: string
}

/**
 * One heading style for the whole app. Previously each section had a coloured
 * eyebrow plus a heavy title plus a red link, so four sections in a row all
 * shouted at the same volume.
 */
export function SectionHeading({ title, action, className }: SectionHeadingProps) {
  return (
    <div className={cx('mb-2.5 flex items-baseline justify-between gap-3', className)}>
      <h2 className="eyebrow">{title}</h2>
      {action}
    </div>
  )
}

interface EmptyStateProps {
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

/**
 * Compact by design. A full-width dashed box with an icon medallion to say
 * "nothing today" took up more room than the content it replaced.
 */
export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cx('rounded-[var(--radius-card)] bg-ink-50/70 px-4 py-5', className)}>
      <p className="text-sm font-medium text-ink-700">{title}</p>
      {description ? <p className="mt-1 text-sm text-ink-500">{description}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('animate-pulse rounded-lg bg-ink-100', className)} aria-hidden="true" />
}

/** Thin divider used between list rows instead of separate cards. */
export function Rows({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cx(
        'divide-y divide-ink-100 overflow-hidden rounded-[var(--radius-card)] border border-ink-100 bg-surface',
        className,
      )}
    >
      {children}
    </div>
  )
}
