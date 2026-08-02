import type { HTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cx } from '@/lib/cx'
import { Icon, type IconName } from './Icon'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  padded?: boolean
}

/**
 * Tailwind resolves conflicting utilities by stylesheet order, not by the
 * order they appear in `class`, so a caller passing `bg-amber-50` would lose
 * to the default `bg-white`. Dropping the default when the caller supplies its
 * own keeps `<Card className="bg-amber-50">` doing the obvious thing.
 */
const supplies = (className: string | undefined, prefix: string): boolean =>
  new RegExp(`(^|\\s)${prefix}-`).test(className ?? '')

export function Card({ children, padded = true, className, ...rest }: CardProps) {
  return (
    <div
      className={cx(
        'rounded-[var(--radius-card)] border shadow-[var(--shadow-soft)]',
        !supplies(className, 'bg') && 'bg-white',
        !supplies(className, 'border') && 'border-ink-100',
        padded && 'p-4 sm:p-5',
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

/** A whole card that navigates — one big, obvious touch target. */
export function CardLink({ to, children, className, ...rest }: CardLinkProps) {
  return (
    <Link
      to={to}
      className={cx(
        'block rounded-[var(--radius-card)] border border-ink-100 bg-white shadow-[var(--shadow-soft)]',
        'transition-[transform,box-shadow] duration-200 hover:shadow-[var(--shadow-lift)] active:scale-[0.995]',
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
  eyebrow?: string
  className?: string
}

export function SectionHeading({ title, action, eyebrow, className }: SectionHeadingProps) {
  return (
    <div className={cx('mb-3 flex items-end justify-between gap-3', className)}>
      <div>
        {eyebrow ? (
          <p className="text-[0.68rem] font-bold tracking-[0.16em] text-crimson-600 uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-lg font-bold text-ink-900">{title}</h2>
      </div>
      {action}
    </div>
  )
}

interface EmptyStateProps {
  icon?: IconName
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

/** Empty states are a designed part of the app, not an accident. */
export function EmptyState({ icon = 'sparkle', title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cx(
        'rounded-[var(--radius-card)] border border-dashed border-ink-200 bg-white/70 px-5 py-10 text-center',
        className,
      )}
    >
      <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-ink-50 text-ink-400">
        <Icon name={icon} size={24} />
      </span>
      <h3 className="text-base font-semibold text-ink-900">{title}</h3>
      {description ? (
        <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-ink-500">{description}</p>
      ) : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cx('animate-pulse rounded-xl bg-ink-100', className)}
      aria-hidden="true"
    />
  )
}
