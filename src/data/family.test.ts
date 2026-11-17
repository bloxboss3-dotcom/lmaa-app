import { describe, expect, it } from 'vitest'
import { DemoFamilyService, FamilyError } from './family'

describe('the sample family (no database connected)', () => {
  it('never pretends to send a sign-in code', async () => {
    const service = new DemoFamilyService()
    await expect(service.requestCode()).rejects.toBeInstanceOf(FamilyError)
    await expect(service.verifyCode()).rejects.toBeInstanceOf(FamilyError)
    expect(await service.getSession()).toBeNull()
  })

  it('shows nothing until the sample is opened, then only that family and only as samples', async () => {
    const service = new DemoFamilyService()
    expect(await service.listMyStudents()).toEqual([])

    const session = await service.startSample()
    expect(session.isDemo).toBe(true)

    const mine = await service.listMyStudents()
    const everyone = await service.listStudents()
    expect(mine.length).toBeGreaterThan(0)
    expect(mine.length).toBeLessThan(everyone.length)
    expect(mine.every((student) => student.isSample)).toBe(true)
    // A parent's view never carries other parents' emails.
    expect(mine.every((student) => !('guardianEmails' in student))).toBe(true)

    await service.signOut()
    expect(await service.listMyStudents()).toEqual([])
  })

  it('hides a student who has left from their parent, and keeps them for staff', async () => {
    const service = new DemoFamilyService()
    await service.startSample()
    const [first] = await service
      .listStudents()
      .then((all) =>
        all.filter((student) => student.guardianEmails.includes('sample.family@example.com')),
      )
    const { updatedAt: _updatedAt, isSample: _isSample, ...draft } = first
    await service.saveStudent({ ...draft, active: false })

    expect((await service.listMyStudents()).map((student) => student.id)).not.toContain(first.id)
    expect((await service.listStudents()).map((student) => student.id)).toContain(first.id)
  })

  it('stores parent emails in lower case and without duplicates', async () => {
    const service = new DemoFamilyService()
    const saved = await service.saveStudent({
      firstName: 'Zz Readykid',
      lastInitial: 'b',
      rank: 'yellow',
      stripes: 9,
      guardianEmails: ['Mum@Example.com', 'mum@example.com '],
      active: true,
    })
    expect(saved.guardianEmails).toEqual(['mum@example.com'])
    expect(saved.lastInitial).toBe('B')
    expect(saved.stripes).toBe(3)
  })
})
