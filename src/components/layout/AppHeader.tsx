import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { cx } from '@/lib/cx'
import { Icon } from '@/components/ui/Icon'
import { PRIMARY_NAV } from './navItems'
import { Wordmark } from './Logo'

/**
 * App chrome.
 *
 * Light and hairline-thin. A black bar top and bottom on every screen made the
 * content feel boxed in; the brand now comes from the mark, the accent colour
 * and the typography instead of painting the furniture.
 *
 * The header never repeats the screen title — each screen owns its own `<h1>`.
 */
export function AppHeader() {
  const location = useLocation()
  const navigate = useNavigate()
  const isHome = location.pathname === '/'

  return (
    <header className="safe-top sticky top-0 z-40 border-b border-ink-100 bg-canvas/90 backdrop-blur">
      <div className="mx-auto flex h-13 max-w-5xl items-center gap-1 px-3 md:h-14 md:px-6">
        {!isHome ? (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="-ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-600 transition-colors hover:bg-ink-100 md:hidden"
            aria-label="Go back"
          >
            <Icon name="arrowLeft" size={20} />
          </button>
        ) : null}

        <Link to="/" className="rounded-lg py-1" aria-label="Lee's Martial Arts Academy home">
          <Wordmark />
        </Link>

        <nav aria-label="Sections" className="ml-auto hidden items-center gap-0.5 md:flex">
          {PRIMARY_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cx(
                  'rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'font-medium text-ink-900'
                    : 'text-ink-500 hover:bg-ink-100 hover:text-ink-900',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <Link
          to="/more"
          aria-label="More"
          className="ml-auto flex h-10 items-center gap-1.5 rounded-full px-3 text-sm text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900 md:ml-1"
        >
          <Icon name="menu" size={19} />
          <span className="hidden sm:inline">More</span>
        </Link>
      </div>
    </header>
  )
}
