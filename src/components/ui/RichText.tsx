import { cx } from '@/lib/cx'

/**
 * Renders admin-written plain text safely.
 *
 * Blank lines separate paragraphs, lines starting with "- " become bullets, and
 * a one-line paragraph starting with "## " becomes a section heading.
 * Nothing is parsed as HTML, so an administrator can never accidentally (or
 * deliberately) inject markup into a family's screen.
 */
export function RichText({ text, className }: { text: string; className?: string }) {
  const blocks = text
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)

  if (!blocks.length) return null

  return (
    <div className={cx('space-y-3 text-[0.95rem] leading-relaxed text-ink-700', className)}>
      {blocks.map((block, index) => {
        const lines = block.split('\n')
        if (lines.length === 1 && block.startsWith('## ')) {
          return (
            <h2 key={index} className="pt-3 text-lg">
              {block.slice(3).trim()}
            </h2>
          )
        }
        const isList = lines.every((line) => /^[-•*]\s+/.test(line.trim()))
        if (isList) {
          return (
            <ul key={index} className="list-disc space-y-1.5 pl-5 marker:text-crimson-500">
              {lines.map((line, lineIndex) => (
                <li key={lineIndex}>{line.trim().replace(/^[-•*]\s+/, '')}</li>
              ))}
            </ul>
          )
        }
        return (
          <p key={index} className="whitespace-pre-line">
            {block}
          </p>
        )
      })}
    </div>
  )
}
