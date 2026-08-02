import type { ReactNode, SVGProps } from 'react'

/**
 * Hand-drawn icon set.
 *
 * A dedicated icon library would be another dependency to keep current; these
 * few stroked shapes cover the whole app and stay perfectly consistent.
 */

const shapes: Record<string, ReactNode> = {
  home: (
    <>
      <path d="M3 10.6 12 3.4l9 7.2" />
      <path d="M5.5 9.6V20a.8.8 0 0 0 .8.8h11.4a.8.8 0 0 0 .8-.8V9.6" />
    </>
  ),
  megaphone: (
    <>
      <path d="M4 10.5 17 5v14L4 13.5z" />
      <path d="M7 14.4V18a2.2 2.2 0 0 0 4.4 0v-2.2" />
      <path d="M19.5 9.6a3 3 0 0 1 0 4.8" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.2" y="4.8" width="17.6" height="16" rx="2.4" />
      <path d="M8 2.8v4M16 2.8v4M3.2 10h17.6" />
    </>
  ),
  star: <path d="m12 3.6 2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.8l5.9-.8z" />,
  book: (
    <>
      <path d="M12 6.6C10.4 5 8.4 4.5 4 4.5V19c4.4 0 6.4.5 8 2 1.6-1.5 3.6-2 8-2V4.5c-4.4 0-6.4.5-8 2.1Z" />
      <path d="M12 6.6V21" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  phone: (
    <path d="M6.4 3.2h3.1l1.5 3.9-2 1.5a12.4 12.4 0 0 0 5.4 5.4l1.5-2 3.9 1.5v3.1a2 2 0 0 1-2.2 2A17.3 17.3 0 0 1 4.4 5.4a2 2 0 0 1 2-2.2Z" />
  ),
  mail: (
    <>
      <rect x="3" y="5.2" width="18" height="13.6" rx="2.2" />
      <path d="m3.6 7.4 8.4 5.8 8.4-5.8" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21.2s6.8-6.3 6.8-11a6.8 6.8 0 1 0-13.6 0c0 4.7 6.8 11 6.8 11Z" />
      <circle cx="12" cy="10" r="2.4" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.8" />
      <path d="M3.2 12h17.6" />
      <path d="M12 3.2a14 14 0 0 1 0 17.6 14 14 0 0 1 0-17.6Z" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.8" />
      <path d="M12 6.8V12l3.4 2" />
    </>
  ),
  chevronRight: <path d="m9.5 5 7 7-7 7" />,
  chevronLeft: <path d="m14.5 5-7 7 7 7" />,
  chevronDown: <path d="m5 9 7 7 7-7" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  pencil: (
    <>
      <path d="M4 20.2h4.2L20.4 8 16.2 3.8 4 16z" />
      <path d="m14.2 5.8 4.2 4.2" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M9.5 7V5.2a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V7" />
      <path d="M6.4 7v13a1 1 0 0 0 1 1h9.2a1 1 0 0 0 1-1V7" />
    </>
  ),
  check: <path d="m5 12.8 4.4 4.4L19 7.6" />,
  alert: (
    <>
      <path d="M12 4.2 2.6 20.2h18.8z" />
      <path d="M12 10v4.2" />
      <path d="M12 17.6h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.8" />
      <path d="M12 11.2v5" />
      <path d="M12 8h.01" />
    </>
  ),
  bell: (
    <>
      <path d="M18.4 16.2V11a6.4 6.4 0 1 0-12.8 0v5.2L4 19.4h16z" />
      <path d="M10 21.2h4" />
    </>
  ),
  download: (
    <>
      <path d="M12 3.8v11" />
      <path d="m7.2 10.6 4.8 4.8 4.8-4.8" />
      <path d="M4.6 20.2h14.8" />
    </>
  ),
  share: (
    <>
      <path d="M12 15.6V3.8" />
      <path d="m7.8 8 4.2-4.2L16.2 8" />
      <path d="M5 13.4V19a1.2 1.2 0 0 0 1.2 1.2h11.6A1.2 1.2 0 0 0 19 19v-5.6" />
    </>
  ),
  play: <path d="m9.2 5.8 9.4 6.2-9.4 6.2z" />,
  file: (
    <>
      <path d="M14 3.4H7.4a1.2 1.2 0 0 0-1.2 1.2v14.8a1.2 1.2 0 0 0 1.2 1.2h9.2a1.2 1.2 0 0 0 1.2-1.2V7.4z" />
      <path d="M14 3.4v4h3.8" />
      <path d="M9 13.4h6M9 16.8h4" />
    </>
  ),
  link: (
    <>
      <path d="M10.4 13.6a3.9 3.9 0 0 0 5.6 0l2.9-2.9a3.9 3.9 0 1 0-5.6-5.6l-1.4 1.4" />
      <path d="M13.6 10.4a3.9 3.9 0 0 0-5.6 0l-2.9 2.9a3.9 3.9 0 1 0 5.6 5.6l1.4-1.4" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.2" />
      <circle cx="8.6" cy="10" r="1.5" />
      <path d="m4.2 17.6 4.8-4.8 3.8 3.8 2.6-2 4.4 4.2" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 7.4h8M16.6 7.4H20M4 16.6h3.4M12 16.6H20" />
      <circle cx="14.2" cy="7.4" r="2.2" />
      <circle cx="9.6" cy="16.6" r="2.2" />
    </>
  ),
  logout: (
    <>
      <path d="M15 17.4v1.8a1.2 1.2 0 0 1-1.2 1.2H6a1.2 1.2 0 0 1-1.2-1.2V4.8A1.2 1.2 0 0 1 6 3.6h7.8A1.2 1.2 0 0 1 15 4.8v1.8" />
      <path d="M11 12h9.4" />
      <path d="m17.4 8 4 4-4 4" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.8" />
      <path d="m16 16 4.4 4.4" />
    </>
  ),
  filter: <path d="M4 5h16l-6.2 7.2v6.4l-3.6 1.8v-8.2z" />,
  bookmark: <path d="M7 4h10v17l-5-4.2L7 21z" />,
  wifiOff: (
    <>
      <path d="m3 3 18 18" />
      <path d="M8.6 16.4a4.8 4.8 0 0 1 6.8 0" />
      <path d="M5.4 12.8a9.6 9.6 0 0 1 3.8-2.4" />
      <path d="M18.6 12.8a9.6 9.6 0 0 0-5.6-2.7" />
      <path d="M12 20h.01" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 12a8 8 0 0 1-13.7 5.6L4.2 15.6" />
      <path d="M4 12a8 8 0 0 1 13.7-5.6l2.1 2" />
      <path d="M19.8 4.4v4h-4M4.2 19.6v-4h4" />
    </>
  ),
  shield: <path d="M12 3.4 5.2 6.2v5.1c0 4.5 2.9 8 6.8 9.9 3.9-1.9 6.8-5.4 6.8-9.9V6.2z" />,
  users: (
    <>
      <circle cx="9.2" cy="8.2" r="3.4" />
      <path d="M3.6 20a5.6 5.6 0 0 1 11.2 0" />
      <path d="M16 5.4a3 3 0 0 1 0 5.8" />
      <path d="M17.2 20a5.7 5.7 0 0 0-2-4.1" />
    </>
  ),
  medal: (
    <>
      <circle cx="12" cy="9" r="5" />
      <path d="m8.4 13.4-1.6 7.4 5.2-2.6 5.2 2.6-1.6-7.4" />
    </>
  ),
  sparkle: <path d="m12 3.6 1.9 4.9 4.9 1.5-4.9 1.6-1.9 4.8-1.9-4.8-4.9-1.6 4.9-1.5z" />,
  external: (
    <>
      <path d="M14 4h6v6" />
      <path d="m20 4-8.4 8.4" />
      <path d="M18.4 14v5.2a1.2 1.2 0 0 1-1.2 1.2H5.2A1.2 1.2 0 0 1 4 19.2V7.2A1.2 1.2 0 0 1 5.2 6H10" />
    </>
  ),
  eye: (
    <>
      <path d="M2.6 12S6.2 5.6 12 5.6 21.4 12 21.4 12 17.8 18.4 12 18.4 2.6 12 2.6 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M4 4.6 20 20.2" />
      <path d="M9.6 5.9A9 9 0 0 1 12 5.6c5.8 0 9.4 6.4 9.4 6.4a16 16 0 0 1-3.2 3.9" />
      <path d="M6.1 8.1A16 16 0 0 0 2.6 12S6.2 18.4 12 18.4a9 9 0 0 0 3.3-.6" />
      <path d="M10.4 10.5a3 3 0 0 0 4 4.2" />
    </>
  ),
  lock: (
    <>
      <rect x="4.4" y="10.2" width="15.2" height="10.4" rx="2.2" />
      <path d="M8.2 10.2V7a3.8 3.8 0 0 1 7.6 0v3.2" />
    </>
  ),
  arrowLeft: (
    <>
      <path d="M20 12H4.2" />
      <path d="m10 5.8-6 6.2 6 6.2" />
    </>
  ),
  dashboard: (
    <>
      <rect x="3.4" y="3.4" width="7.4" height="7.4" rx="1.8" />
      <rect x="13.2" y="3.4" width="7.4" height="7.4" rx="1.8" />
      <rect x="3.4" y="13.2" width="7.4" height="7.4" rx="1.8" />
      <rect x="13.2" y="13.2" width="7.4" height="7.4" rx="1.8" />
    </>
  ),
}

export type IconName = keyof typeof shapes

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName
  size?: number
  /** Give the icon an accessible name when it is not decorative. */
  title?: string
}

export function Icon({ name, size = 22, title, className, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {shapes[name]}
    </svg>
  )
}
