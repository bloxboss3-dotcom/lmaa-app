import { NavLink } from 'react-router-dom'
import { cx } from '@/lib/cx'
import { Icon } from '@/components/ui/Icon'
import { PRIMARY_NAV } from './navItems'

interface BottomNavProps {
  /** Unread announcement count shown on the Updates tab. */
  unreadCount?: number
}

/**
 * The five primary destinations. Light surface, hairline top border, and the
 * accent colour reserved for the active item — no heavy black slab.
 */
export function BottomNav({ unreadCount = 0 }: BottomNavProps) {
  return (
    <nav
      aria-label="Main"
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-ink-100 bg-surface/95 backdrop-blur md:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch">
        {PRIMARY_NAV.map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cx(
                  'flex min-h-[54px] flex-col items-center justify-center gap-0.5 px-1 pt-1.5 pb-1',
                  'text-[0.6875rem] transition-colors',
                  isActive ? 'font-semibold text-crimson-600' : 'text-ink-500',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className="relative">
                    <Icon name={item.icon} size={21} />
                    {item.label === 'Updates' && unreadCount > 0 ? (
                      <span
                        className="absolute -top-1 -right-2 min-w-[16px] rounded-full bg-crimson-600 px-1 text-[0.5625rem] leading-4 font-semibold text-white"
                        aria-hidden="true"
                      >
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    ) : null}
                  </span>
                  <span>{item.label}</span>
                  {item.label === 'Updates' && unreadCount > 0 ? (
                    <span className="sr-only">{unreadCount} unread updates</span>
                  ) : null}
                  {isActive ? <span className="sr-only">(current)</span> : null}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
