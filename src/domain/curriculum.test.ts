import { describe, expect, it } from 'vitest'
import { beltRank, groupCurriculum } from './curriculum'
import type { LearningResource } from './types'

function video(title: string, level: string | undefined, sortOrder: number): LearningResource {
  return {
    id: title,
    title,
    type: 'video',
    collection: 'curriculum',
    level,
    videoUrl: 'https://youtu.be/dQw4w9WgXcQ',
    sortOrder,
    published: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('beltRank', () => {
  it('follows the academy belt journey and tells senior belts apart from plain ones', () => {
    expect(beltRank('Children White Belt')).toBeLessThan(beltRank('Yellow belt'))
    expect(beltRank('Orange')).toBeLessThan(beltRank('Senior Orange'))
    expect(beltRank('Senior Orange')).toBeLessThan(beltRank('Green'))
    expect(beltRank('Black belt')).toBeGreaterThan(beltRank('Senior Red'))
  })

  it('sends labels it does not recognise to the end', () => {
    expect(beltRank('Sparring drills')).toBeGreaterThan(beltRank('Black'))
    expect(beltRank(undefined)).toBeGreaterThan(beltRank('Sparring drills'))
  })
})

describe('groupCurriculum', () => {
  it('groups by level in belt order, keeping the academy ordering inside each level', () => {
    const groups = groupCurriculum([
      video('Taegeuk 2', 'Orange', 20),
      video('Basic kicks', 'White', 30),
      video('Taegeuk 1', 'Yellow', 10),
      video('Taegeuk 1 breakdown', 'Yellow', 5),
    ])
    expect(groups.map((group) => group.label)).toEqual(['White', 'Yellow', 'Orange'])
    expect(groups[1].items.map((item) => item.title)).toEqual(['Taegeuk 1 breakdown', 'Taegeuk 1'])
  })

  it('falls back to the program, then to a single catch-all level', () => {
    const groups = groupCurriculum([
      { ...video('Warm-up', undefined, 1), program: 'Little Tigers' },
      video('Stretching', undefined, 2),
    ])
    expect(groups.map((group) => group.label)).toEqual(['Little Tigers', 'All levels'])
  })
})
