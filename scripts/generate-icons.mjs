#!/usr/bin/env node
/**
 * Generates the LMAA app icons (PNG) used by the PWA manifest, the iOS home
 * screen and the browser favicon.
 *
 * The artwork is the academy's own logo — the flying-kick lockup from
 * leesmartialartsacademy.com — composited onto the brand paper background.
 * The source lives at src/assets/brand/lmaa-logo.png; re-run this script after
 * replacing it with a higher-resolution original.
 *
 * Usage: npm run icons
 *
 * No image libraries are used: the PNGs are decoded and re-encoded here with
 * zlib so the repository stays free of heavy native build dependencies.
 */
import { deflateSync, inflateSync } from 'node:zlib'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE = join(ROOT, 'src', 'assets', 'brand', 'lmaa-logo.png')
const OUT_DIR = join(ROOT, 'public', 'icons')

/** Brand paper — the same warm off-white the app and the website sit on. */
const PAPER = [247, 244, 238, 255] // #f7f4ee
const CLEAR = [0, 0, 0, 0]

/* ------------------------------------------------------------------ canvas */

function createCanvas(width, height = width) {
  return { width, height, data: new Uint8ClampedArray(width * height * 4) }
}

function setPixel(canvas, x, y, [r, g, b, a]) {
  if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return
  const i = (y * canvas.width + x) * 4
  if (a === 255) {
    canvas.data[i] = r
    canvas.data[i + 1] = g
    canvas.data[i + 2] = b
    canvas.data[i + 3] = 255
    return
  }
  if (a === 0) return
  // source-over blend
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
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) setPixel(canvas, x, y, color)
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

/** Box-filter resize in premultiplied space so edges do not fringe. */
function resize(source, targetWidth, targetHeight) {
  const out = createCanvas(targetWidth, targetHeight)
  for (let y = 0; y < targetHeight; y += 1) {
    const sy0 = Math.floor((y * source.height) / targetHeight)
    const sy1 = Math.max(sy0 + 1, Math.floor(((y + 1) * source.height) / targetHeight))
    for (let x = 0; x < targetWidth; x += 1) {
      const sx0 = Math.floor((x * source.width) / targetWidth)
      const sx1 = Math.max(sx0 + 1, Math.floor(((x + 1) * source.width) / targetWidth))
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      let n = 0
      for (let sy = sy0; sy < sy1; sy += 1) {
        for (let sx = sx0; sx < sx1; sx += 1) {
          const i = (sy * source.width + sx) * 4
          const alpha = source.data[i + 3] / 255
          r += source.data[i] * alpha
          g += source.data[i + 1] * alpha
          b += source.data[i + 2] * alpha
          a += source.data[i + 3]
          n += 1
        }
      }
      const avg = a / n / 255
      const o = (y * targetWidth + x) * 4
      out.data[o] = avg > 0 ? r / n / avg : 0
      out.data[o + 1] = avg > 0 ? g / n / avg : 0
      out.data[o + 2] = avg > 0 ? b / n / avg : 0
      out.data[o + 3] = a / n
    }
  }
  return out
}

function drawImage(canvas, image, dx, dy) {
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const i = (y * image.width + x) * 4
      setPixel(canvas, dx + x, dy + y, [
        image.data[i],
        image.data[i + 1],
        image.data[i + 2],
        image.data[i + 3],
      ])
    }
  }
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

function paeth(a, b, c) {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  if (pa <= pb && pa <= pc) return a
  return pb <= pc ? b : c
}

/** Minimal PNG reader: 8-bit RGB/RGBA, non-interlaced — enough for our source. */
function decodePng(buffer) {
  let pos = 8
  let width = 0
  let height = 0
  let colorType = 6
  const idat = []
  while (pos < buffer.length) {
    const length = buffer.readUInt32BE(pos)
    const type = buffer.toString('ascii', pos + 4, pos + 8)
    const data = buffer.subarray(pos + 8, pos + 8 + length)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      if (data[8] !== 8) throw new Error(`Unsupported bit depth ${data[8]} in ${SOURCE}`)
      colorType = data[9]
      if (data[12] !== 0) throw new Error(`Interlaced PNGs are not supported (${SOURCE})`)
    } else if (type === 'IDAT') {
      idat.push(data)
    } else if (type === 'IEND') {
      break
    }
    pos += 12 + length
  }
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0
  if (!channels) throw new Error(`Unsupported colour type ${colorType} in ${SOURCE}`)

  const raw = inflateSync(Buffer.concat(idat))
  const stride = width * channels
  const canvas = createCanvas(width, height)
  let prev = Buffer.alloc(stride)
  let offset = 0
  for (let y = 0; y < height; y += 1) {
    const filter = raw[offset]
    offset += 1
    const line = Buffer.from(raw.subarray(offset, offset + stride))
    offset += stride
    for (let x = 0; x < stride; x += 1) {
      const a = x >= channels ? line[x - channels] : 0
      const b = prev[x]
      const c = x >= channels ? prev[x - channels] : 0
      if (filter === 1) line[x] = (line[x] + a) & 0xff
      else if (filter === 2) line[x] = (line[x] + b) & 0xff
      else if (filter === 3) line[x] = (line[x] + ((a + b) >> 1)) & 0xff
      else if (filter === 4) line[x] = (line[x] + paeth(a, b, c)) & 0xff
    }
    for (let x = 0; x < width; x += 1) {
      const o = (y * width + x) * 4
      canvas.data[o] = line[x * channels]
      canvas.data[o + 1] = line[x * channels + 1]
      canvas.data[o + 2] = line[x * channels + 2]
      canvas.data[o + 3] = channels === 4 ? line[x * channels + 3] : 255
    }
    prev = line
  }
  return canvas
}

function encodePng(canvas) {
  const { width, height, data } = canvas
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  let p = 0
  for (let y = 0; y < height; y += 1) {
    raw[p] = 0 // filter: none — the artwork is flat colour, which deflates well
    p += 1
    for (let x = 0; x < stride; x += 1) {
      raw[p] = data[y * stride + x]
      p += 1
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
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

const logo = decodePng(readFileSync(SOURCE))

/**
 * Composites the logo onto a square tile.
 *
 * `inset` is the share of the tile left as margin on each side. Maskable icons
 * need a generous one because launchers crop to a circle; standard icons need
 * only enough to stop the artwork touching the rounded corners.
 */
function render({ size, inset, background, rounded = 0, supersample = 3 }) {
  const S = size * supersample
  const canvas = createCanvas(S)

  if (background === 'rounded') {
    fillAll(canvas, CLEAR)
    fillRoundedRect(canvas, 0, 0, S, S, rounded * supersample, PAPER)
  } else {
    fillAll(canvas, PAPER)
  }

  // Fit the logo inside the safe box, preserving its aspect ratio.
  const box = S * (1 - inset * 2)
  const scale = Math.min(box / logo.width, box / logo.height)
  const w = Math.max(1, Math.round(logo.width * scale))
  const h = Math.max(1, Math.round(logo.height * scale))
  drawImage(canvas, resize(logo, w, h), Math.round((S - w) / 2), Math.round((S - h) / 2))

  return resize(canvas, size, size)
}

/* -------------------------------------------------------------------- main */

const targets = [
  // Standard PWA icons — rounded so they look intentional on desktop installs.
  { file: 'icon-192.png', size: 192, background: 'rounded', rounded: 40, inset: 0.1 },
  { file: 'icon-512.png', size: 512, background: 'rounded', rounded: 106, inset: 0.1 },
  // Maskable icons — full bleed, artwork inside the 80% safe zone.
  { file: 'maskable-192.png', size: 192, background: 'solid', inset: 0.19 },
  { file: 'maskable-512.png', size: 512, background: 'solid', inset: 0.19 },
  // iOS home screen — full square, no transparency (iOS applies its own mask).
  { file: 'apple-touch-icon.png', size: 180, background: 'solid', inset: 0.1 },
  // Favicons.
  { file: 'favicon-32.png', size: 32, background: 'solid', inset: 0.04 },
  { file: 'favicon-16.png', size: 16, background: 'solid', inset: 0.02 },
]

mkdirSync(OUT_DIR, { recursive: true })
for (const target of targets) {
  writeFileSync(join(OUT_DIR, target.file), encodePng(render(target)))
  process.stdout.write(`  ✓ icons/${target.file} (${target.size}×${target.size})\n`)
}
process.stdout.write(`\nIcons written to public/icons from ${SOURCE.replace(ROOT + '/', '')}.\n`)
