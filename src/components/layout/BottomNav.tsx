import { NavLink } from 'react-router-dom'
import { cx } from '@/lib/cx'
import { Icon } from '@/components/ui/Icon'
import { PRIMARY_NAV } from './navItems'

interface BottomNavProps {
  /** Unread announcement count shown on the Updates tab. */
  unreadCount?: number
}

export function BottomNav({ unreadCount = 0 }: BottomNavProps) {
  return (
    <nav
      aria-label="Main"
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-ink-800/80 bg-ink-900/95 backdrop-blur-md md:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch">
        {PRIMARY_NAV.map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cx(
                  'relative flex min-h-[58px] flex-col items-center justify-center gap-1 px-1 pt-2 pb-1.5',
                  'text-[0.63rem] font-bold tracking-wide transition-colors',
                  isActive ? 'text-white' : 'text-ink-300',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cx(
                      'absolute top-0 h-[3px] w-9 rounded-b-full transition-opacity',
                      isActive ? 'bg-crimson-600 opacity-100' : 'opacity-0',
                    )}
                    aria-hidden="true"
                  />
                  <span className="relative">
                    <Icon name={item.icon} size={21} />
                    {item.label === 'Updates' && unreadCount > 0 ? (
                      <span
                        className="absolute -top-1.5 -right-2 min-w-[17px] rounded-full bg-crimson-600 px-1 text-[0.6rem] leading-[17px] font-bold text-white"
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
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
