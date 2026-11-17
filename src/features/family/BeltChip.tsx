import { beltColours, type StudentRank } from '@/domain/students'

/**
 * A small picture of a belt: its colour, and the stripe that runs along a
 * senior or Little Tigers belt. Decorative; the belt's name is always written
 * out next to it.
 */
export function BeltChip({ rank, width = 56 }: { rank: StudentRank; width?: number }) {
  const { belt, stripe } = beltColours(rank)
  const height = Math.round(width * 0.32)
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 56 18"
      aria-hidden="true"
      className="shrink-0"
      data-belt={rank}
    >
      <rect
        x="0.5"
        y="0.5"
        width="55"
        height="17"
        rx="3"
        fill={belt}
        stroke="#0c1322"
        strokeOpacity="0.28"
      />
      {stripe ? <rect x="1" y="6.5" width="54" height="5" fill={stripe} /> : null}
    </svg>
  )
}
