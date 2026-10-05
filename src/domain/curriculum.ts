import type { LearningResource } from './types'

/**
 * Grouping for the curriculum screen.
 *
 * The academy tags each video with a program and a level ("Children White
 * Belt", "Senior Orange", ...). Videos are shown grouped by level in belt
 * order, so a family finds their own belt without reading every title. The
 * belt names come from the academy's published belt journey; nothing about
 * what each belt requires is decided here.
 */

const BELT_ORDER = [
  'white',
  'yellow',
  'orange',
  'senior orange',
  'green',
  'senior green',
  'blue',
  'senior blue',
  'brown',
  'senior brown',
  'red',
  'senior red',
  'black',
] as const

/** Longest names first, so "senior orange" is not mistaken for "orange". */
const BELT_LOOKUP = [...BELT_ORDER]
  .map((name, rank) => ({ name, rank }))
  .sort((a, b) => b.name.length - a.name.length)

/** Position of a level label in the belt journey; unknown labels sort last. */
export function beltRank(label: string | undefined): number {
  if (!label) return BELT_ORDER.length + 1
  const lower = label.toLowerCase()
  for (const belt of BELT_LOOKUP) {
    if (lower.includes(belt.name)) return belt.rank
  }
  return BELT_ORDER.length
}

export interface CurriculumGroup {
  label: string
  items: LearningResource[]
}

/** Published curriculum items grouped by level, in belt order then by the academy's own ordering. */
export function groupCurriculum(items: LearningResource[]): CurriculumGroup[] {
  const groups = new Map<string, CurriculumGroup>()
  for (const item of [...items].sort((a, b) => a.sortOrder - b.sortOrder)) {
    const label = item.level?.trim() || item.program?.trim() || 'All levels'
    const group = groups.get(label) ?? { label, items: [] }
    group.items.push(item)
    groups.set(label, group)
  }
  return [...groups.values()].sort(
    (a, b) =>
      beltRank(a.label) - beltRank(b.label) ||
      Math.min(...a.items.map((item) => item.sortOrder)) -
        Math.min(...b.items.map((item) => item.sortOrder)),
  )
}
