type ClassValue = string | number | false | null | undefined | ClassValue[]

/** Tiny class-name joiner — keeps conditional Tailwind classes readable. */
export function cx(...values: ClassValue[]): string {
  const out: string[] = []
  for (const value of values) {
    if (!value) continue
    if (Array.isArray(value)) {
      const nested = cx(...value)
      if (nested) out.push(nested)
    } else {
      out.push(String(value))
    }
  }
  return out.join(' ')
}
