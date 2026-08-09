# LMAA brand identity

What the academy's brand actually is, where each piece came from, and how the app uses it.

Everything here was taken from LMAA's own published material — the logo file and the design
system on **leesmartialartsacademy.com**. Nothing was designed from scratch or guessed at.

---

## Who the academy is

| | |
| --- | --- |
| **Name** | Lee's Martial Arts Academy — "LMAA" |
| **Founded** | 2005, Wilsonville, Oregon |
| **Founder** | Master C.Y. Lee, 6th Dan Taekwondo, 6th Dan HapKiDo |
| **Arts** | Traditional Taekwondo enhanced by HapKiDo, plus practical self-defence |
| **Affiliations** | Kukkiwon (World Taekwondo HQ, Seoul) and World Taekwondo |
| **Ages served** | 4 to 50+ |
| **Location** | 8263 SW Wilsonville Rd, Ste A — Wilsonville Town Center |
| **Motto** | "Peace on Earth begins with peace within yourself." |

The five tenets — Courtesy (예의), Integrity (염치), Perseverance (인내), Self-Control (극기)
and Indomitable Spirit (백절불굴) — and the five-line LMAA Pledge are recited every class.
They are in the app under **Learn → Tenets & the LMAA Pledge**.

---

## The mark

`src/assets/brand/lmaa-logo.png` — the academy's own lockup: a black flying side-kick
silhouette, the academy name arched above it, "MASTER C.Y. LEE" in gold, and "LMAA" set in
blue and red. The academy identifies its own front door by it ("look for the flying kick on
the door").

The full lockup turns to mush below about 80 px, so the app uses two crops:

| Asset | What it is | Used for |
| --- | --- | --- |
| `lmaa-logo.png` | Full lockup, 512 × 506 | App icons, staff sign-in, install screen |
| `lmaa-wordmark.png` | "LMAA" lettering only, 440 × 98 | App header, admin header |

App icons are generated from the full lockup on the paper background — run `npm run icons`
after replacing the source file.

---

## Colour

These are the exact custom properties the academy's website ships. They are reproduced in
`src/index.css`, and the contrast ratio against the paper background is noted for each,
because a brand colour that fails WCAG AA is a brand colour families cannot read.

| Token | Hex | On paper | Role |
| --- | --- | --- | --- |
| `canvas` | `#f7f4ee` | — | Page background — warm paper, not white |
| `surface` | `#ffffff` | — | Cards, rows, inputs |
| `ink-900` | `#0c1322` | 16.9:1 | Headings |
| `ink-800` | `#28303f` | 12.1:1 | Body text |
| `ink-500` | `#5d6675` | 5.3:1 | Secondary text, eyebrow labels |
| `ink-100` | `#e6e0d4` | — | Hairlines |
| `crimson-600` | `#c8102e` | 5.4:1 | **Primary** — actions, live/next, active nav |
| `crimson-700` | `#a00d25` | 7.4:1 | Hover, and red text on tinted fills |
| `royal-600` | `#1e4f9e` | 7.2:1 | Secondary — information, never alarm |
| `gold-500` | `#e3a82b` | 1.9:1 | **Fill only** — rules, belt marks, never small text |
| `gold-700` | `#8a6410` | 4.9:1 | Readable gold text |

Two rules that matter:

- **Gold is a fill, not a text colour.** `gold-500` measures 1.9:1 on paper. Use `gold-700`
  when gold has to be readable, or put `ink-900` on top of a gold fill (8.8:1).
- **Red carries urgency.** It is the only colour used for "cancelled", "next up" and the
  primary button, so it stays meaningful. Blue carries information.

The belt colours from the website (`#f6d33c` yellow, `#f97316` orange, `#3fa548` green,
`#1e4f9e` blue, `#8a4b22` brown, `#c8102e` red) are available for the belt journey page if
it is ever illustrated rather than listed.

---

## Type

| | Font | Weights | Used for |
| --- | --- | --- | --- |
| Display | **Oswald** | 500–700 | Headings, the one big line per screen, eyebrow labels |
| Body | **Inter** | 400–700 | Everything else |

Both are the website's fonts, self-hosted as variable latin subsets in `src/assets/fonts/`
(69 kB total) rather than loaded from Google Fonts — so the app still renders correctly
offline and no font CDN sees a family's IP address.

Hangul in the tenets falls back to the platform's Korean font by design; shipping a CJK
subset would cost families several hundred kilobytes for five words.

**Uppercase is for labels only.** Oswald is a condensed grotesque and looks strong in caps,
but caps are measurably slower to read, so class names, body copy and headings stay in
sentence case. Only `.eyebrow` and the single `.display` line per screen are uppercase.

---

## Voice

The academy writes to parents in short, plain, confident sentences. It leads with the
outcome, not the martial art:

> "Give us 2 weeks. Watch them stand taller."
> "More than kicks. A way to grow up."
> "Every black belt started at white."
> "Fall seven times, stand up eight."

The app follows the same voice, with one addition it cannot borrow: **it never overstates
what it knows.** Where the academy has not supplied something, the app says so plainly
("Not added yet") rather than showing a placeholder that looks like content. That honesty
is a brand asset for a school whose first tenet is integrity.
