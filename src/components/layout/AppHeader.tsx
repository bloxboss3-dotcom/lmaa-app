import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { cx } from '@/lib/cx'
import { Icon } from '@/components/ui/Icon'
import { PRIMARY_NAV } from './navItems'
import { Wordmark } from './Logo'

/**
 * App chrome: branding, a back control on inner screens and the More entry
 * point on mobile; full section navigation on desktop.
 *
 * The header deliberately does NOT repeat the screen title — each screen owns
 * its own `<h1>`, so there is exactly one page heading for screen readers.
 */
export function AppHeader() {
  const location = useLocation()
  const navigate = useNavigate()
  const isHome = location.pathname === '/'

  return (
    <header className="safe-top sticky top-0 z-40 bg-ink-900 text-white">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-3 md:h-16 md:px-6">
        {!isHome ? (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="-ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 md:hidden"
            aria-label="Go back"
          >
            <Icon name="arrowLeft" size={22} />
          </button>
        ) : null}

        <Link to="/" className="rounded-lg py-1" aria-label="Lee's Martial Arts Academy home">
          <Wordmark tone="light" />
        </Link>

        <nav aria-label="Sections" className="ml-auto hidden items-center gap-1 md:flex">
          {PRIMARY_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cx(
                  'rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                  isActive ? 'bg-white/12 text-white' : 'text-white/65 hover:text-white',
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
          className="ml-auto flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white md:ml-2"
        >
          <Icon name="menu" size={20} />
          <span className="hidden sm:inline">More</span>
        </Link>
      </div>
    </header>
  )
}
