import { chromium } from 'playwright-core'
import { readFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')
const OUT = '/tmp/claude-0/-home-user-lmaa-app/f63f11b0-c54e-5fe2-a1b5-948198415e69/scratchpad/shots2'
mkdirSync(OUT, { recursive: true })
const BASE = 'http://127.0.0.1:4173/lmaa-app/'
const errors = []
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })

async function shoot(name, path, viewport, action) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, isMobile: viewport.width < 500, hasTouch: viewport.width < 500 })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errors.push(`[${name}] ${e.message}`))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${name}] ${m.text()}`) })
  await page.goto(`${BASE}#${path}`, { waitUntil: 'networkidle' })
  if (action) await action(page)
  await page.waitForTimeout(400)
  const of = await page.evaluate(() => ({ doc: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }))
  if (of.scroll > of.doc + 1) console.log(`OVERFLOW ${name}: ${of.scroll} > ${of.doc}`)
  await page.screenshot({ path: `${OUT}/${name}.png` })
  await ctx.close()
}

const phone = { width: 390, height: 844 }
const desktop = { width: 1280, height: 900 }
await shoot('01-home', '/', phone)
await shoot('02-schedule', '/schedule', phone)
await shoot('03-schedule-week', '/schedule', phone, async (p) => { await p.getByRole('button', { name: /all week/i }).click() })
await shoot('04-updates', '/updates', phone)
await shoot('05-events', '/events', phone)
await shoot('06-learn', '/learn', phone)
await shoot('07-more', '/more', phone)
await shoot('08-home-desktop', '/', desktop)
await shoot('09-admin', '/admin', desktop, async (p) => { await p.getByRole('button', { name: /explore as administrator/i }).click(); await p.waitForTimeout(700) })

// Accessibility re-check
const ctx = await browser.newContext({ viewport: phone })
const page = await ctx.newPage()
let total = 0
for (const route of ['/', '/schedule', '/updates', '/events', '/learn', '/more', '/more/contact', '/admin']) {
  await page.goto(`${BASE}#${route}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(300)
  await page.addScriptTag({ content: axeSource })
  const res = await page.evaluate(async () => await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }))
  const v = res.violations.filter((x) => x.impact !== 'minor')
  total += v.length
  for (const item of v) console.log(`${route} [${item.impact}] ${item.id}: ${item.nodes[0]?.html.slice(0, 90)}`)
}
console.log(total === 0 ? 'A11Y: no serious/critical violations' : `A11Y issues: ${total}`)
await browser.close()
console.log(errors.length ? `CONSOLE ERRORS:\n${errors.join('\n')}` : 'No console errors.')
