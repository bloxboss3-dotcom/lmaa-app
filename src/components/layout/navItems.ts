import type { IconName } from '@/components/ui/Icon'

export interface NavItem {
  to: string
  label: string
  icon: IconName
  end?: boolean
}

/** The five primary family destinations. Secondary items live under More. */
export const PRIMARY_NAV: NavItem[] = [
  { to: '/', label: 'Home', icon: 'home', end: true },
  { to: '/updates', label: 'Updates', icon: 'megaphone' },
  { to: '/schedule', label: 'Schedule', icon: 'calendar' },
  { to: '/events', label: 'Events', icon: 'star' },
  { to: '/learn', label: 'Learn', icon: 'book' },
]
