#!/usr/bin/env node
/**
 * Generates the placeholder LMAA app icons (PNG) used by the PWA manifest,
 * the iOS home screen and the browser favicon.
 *
 * These are ORIGINAL geometric placeholders (rank chevrons on a black field
 * with a deep-red and gold accent). They are deliberately simple so they read
 * clearly at 48px. Replace them with the final LMAA logo before launch —
 * see CONTENT_NEEDED.md for the required source artwork.
 *
 * Usage: npm run icons
 *
 * No image libraries are used: the PNGs are encoded here with zlib so the
 * repository stays free of heavy native build dependencies.
 */
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons')

const INK = [11, 11, 13, 255] // #0b0b0d  near-black field
const RED = [176, 14, 27, 255] // #b00e1b  deep red
const WHITE = [255, 255, 255, 255]
const GOLD = [201, 162, 77, 255] // #c9a24d restrained gold
const CLEAR = [0, 0, 0, 0]

/* ------------------------------------------------------------------ canvas */

function createCanvas(size) {
  return { size, data: new Uint8ClampedArray(size * size * 4) }
}

function setPixel(canvas, x, y, [r, g, b, a]) {
  if (x < 0 || y < 0 || x >= canvas.size || y >= canvas.size) return
  const i = (y * canvas.size + x) * 4
  if (a === 255) {
    canvas.data[i] = r
    canvas.data[i + 1] = g
    canvas.data[i + 2] = b
    canvas.data[i + 3] = 255
    return
  }
  // simple source-over blend
  const sa = a / 255
  const da = canvas.data[i + 3] / 255
  const oa = sa + da * (1 - sa)
  if (oa === 0) return
  canvas.data[i] = (r * sa + canvas.data[i] * da * (1 - sa)) / oa
  canvas.data[i + 1] = (g * sa + canvas.data[i + 1] * da * (1 - sa)) / oa
  canvas.data[i + 2] = (b * sa + canvas.data[i + 2] * da * (1 - sa)) / oa
  canvas.data[i + 3] = oa * 255
}

function fillAll(canvas, color) {
  for (let y = 0; y < canvas.size; y += 1) {
    for (let x = 0; x < canvas.size; x += 1) setPixel(canvas, x, y, color)
  }
}

function fillRect(canvas, x0, y0, w, h, color) {
  for (let y = Math.round(y0); y < Math.round(y0 + h); y += 1) {
    for (let x = Math.round(x0); x < Math.round(x0 + w); x += 1) setPixel(canvas, x, y, color)
  }
}

function fillRoundedRect(canvas, x0, y0, w, h, radius, color) {
  for (let y = Math.round(y0); y < Math.round(y0 + h); y += 1) {
    for (let x = Math.round(x0); x < Math.round(x0 + w); x += 1) {
      const cx = Math.min(Math.max(x, x0 + radius), x0 + w - radius)
      const cy = Math.min(Math.max(y, y0 + radius), y0 + h - radius)
      const dx = x - cx
      const dy = y - cy
      if (dx * dx + dy * dy <= radius * radius) setPixel(canvas, x, y, color)
    }
  }
}

/** Even-odd polygon fill. `points` is a flat list of [x, y] pairs. */
function fillPolygon(canvas, points, color) {
  const ys = points.map((p) => p[1])
  const minY = Math.max(0, Math.floor(Math.min(...ys)))
  const maxY = Math.min(canvas.size - 1, Math.ceil(Math.max(...ys)))
  for (let y = minY; y <= maxY; y += 1) {
    const sample = y + 0.5
    const crossings = []
    for (let i = 0; i < points.length; i += 1) {
      const [x1, y1] = points[i]
      const [x2, y2] = points[(i + 1) % points.length]
      if (y1 === y2) continue
      if (sample >= Math.min(y1, y2) && sample < Math.max(y1, y2)) {
        crossings.push(x1 + ((sample - y1) / (y2 - y1)) * (x2 - x1))
      }
    }
    crossings.sort((a, b) => a - b)
    for (let i = 0; i + 1 < crossings.length; i += 2) {
      const from = Math.round(crossings[i])
      const to = Math.round(crossings[i + 1])
      for (let x = from; x < to; x += 1) setPixel(canvas, x, y, color)
    }
  }
}

/** Average an over-sampled canvas down to `target` px for cheap antialiasing. */
function downsample(canvas, target) {
  const factor = canvas.size / target
  const out = createCanvas(target)
  for (let y = 0; y < target; y += 1) {
    for (let x = 0; x < target; x += 1) {
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      let n = 0
      for (let sy = Math.floor(y * factor); sy < Math.floor((y + 1) * factor); sy += 1) {
        for (let sx = Math.floor(x * factor); sx < Math.floor((x + 1) * factor); sx += 1) {
          const i = (sy * canvas.size + sx) * 4
          const alpha = canvas.data[i + 3] / 255
          r += canvas.data[i] * alpha
          g += canvas.data[i + 1] * alpha
          b += canvas.data[i + 2] * alpha
          a += canvas.data[i + 3]
          n += 1
        }
      }
      if (!n) continue
      const avgAlpha = a / n / 255
      const o = (y * target + x) * 4
      out.data[o] = avgAlpha > 0 ? r / n / avgAlpha : 0
      out.data[o + 1] = avgAlpha > 0 ? g / n / avgAlpha : 0
      out.data[o + 2] = avgAlpha > 0 ? b / n / avgAlpha : 0
      out.data[o + 3] = a / n
    }
  }
  return out
}

/* --------------------------------------------------------------- png codec */

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(typeAndData), 0)
  return Buffer.concat([length, typeAndData, crc])
}

function encodePng(canvas) {
  const { size, data } = canvas
  const raw = Buffer.alloc((size * 4 + 1) * size)
  let p = 0
  for (let y = 0; y < size; y += 1) {
    raw[p] = 0 // filter: none
    p += 1
    for (let x = 0; x < size * 4; x += 1) {
      raw[p] = data[y * size * 4 + x]
      p += 1
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // colour type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/* ----------------------------------------------------------------- artwork */

/** A single upward chevron (rank stripe). */
function chevron(cx, apexY, halfWidth, dropHeight, thickness) {
  return [
    [cx, apexY],
    [cx + halfWidth, apexY + dropHeight],
    [cx + halfWidth, apexY + dropHeight + thickness],
    [cx, apexY + thickness],
    [cx - halfWidth, apexY + dropHeight + thickness],
    [cx - halfWidth, apexY + dropHeight],
  ]
}

/**
 * Draws the LMAA placeholder mark.
 * `inset` keeps the artwork inside the maskable safe zone when needed.
 */
function drawMark(canvas, { background, inset = 0, rounded = 0 }) {
  const S = canvas.size
  if (background === 'rounded') {
    fillAll(canvas, CLEAR)
    fillRoundedRect(canvas, 0, 0, S, S, rounded, INK)
  } else {
    fillAll(canvas, INK)
  }

  const box = S * (1 - inset * 2)
  const originX = S / 2
  const originY = S * inset

  const halfWidth = box * 0.3
  const drop = box * 0.2
  const thickness = box * 0.115
  const gap = box * 0.045

  // Deep-red anchor chevron behind the white one, offset for depth.
  fillPolygon(
    canvas,
    chevron(originX, originY + box * 0.235, halfWidth, drop, thickness),
    RED,
  )
  // Primary white chevron.
  fillPolygon(
    canvas,
    chevron(originX, originY + box * 0.235 + thickness + gap, halfWidth, drop, thickness),
    WHITE,
  )
  // Gold base bar — the "black belt" line.
  fillRect(
    canvas,
    originX - halfWidth,
    originY + box * 0.235 + (thickness + gap) * 2 + drop + thickness * 0.35,
    halfWidth * 2,
    box * 0.055,
    GOLD,
  )
}

function render({ size, inset = 0, background = 'solid', rounded = 0, supersample = 4 }) {
  const big = createCanvas(size * supersample)
  drawMark(big, {
    background,
    inset,
    rounded: rounded * supersample,
  })
  return downsample(big, size)
}

/* -------------------------------------------------------------------- main */

const targets = [
  // Standard PWA icons — rounded so they look intentional on desktop installs.
  { file: 'icon-192.png', size: 192, background: 'rounded', rounded: 40, inset: 0.16 },
  { file: 'icon-512.png', size: 512, background: 'rounded', rounded: 106, inset: 0.16 },
  // Maskable icons — full bleed, artwork inside the 80% safe zone.
  { file: 'maskable-192.png', size: 192, background: 'solid', inset: 0.24 },
  { file: 'maskable-512.png', size: 512, background: 'solid', inset: 0.24 },
  // iOS home screen — full square, no transparency (iOS applies its own mask).
  { file: 'apple-touch-icon.png', size: 180, background: 'solid', inset: 0.18 },
  // Favicons.
  { file: 'favicon-32.png', size: 32, background: 'solid', inset: 0.1 },
  { file: 'favicon-16.png', size: 16, background: 'solid', inset: 0.06 },
]

mkdirSync(OUT_DIR, { recursive: true })
for (const target of targets) {
  const canvas = render(target)
  writeFileSync(join(OUT_DIR, target.file), encodePng(canvas))
  process.stdout.write(`  ✓ icons/${target.file} (${target.size}×${target.size})\n`)
}
process.stdout.write(`\nPlaceholder icons written to public/icons.\n`)
