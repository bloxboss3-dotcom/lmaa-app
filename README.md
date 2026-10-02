# LMAA Family App

The official family app for **Lee's Martial Arts Academy** — class schedules, academy
updates, events and student learning resources, in one place, on any phone.

It is a mobile-first Progressive Web App built with React, TypeScript and Vite, styled in
the academy's own brand — see [BRAND.md](BRAND.md). It is
published as a static site on GitHub Pages by GitHub Actions, works offline, installs to
a phone home screen, and is built so the same code can later be packaged as an iPhone and
Android app with Capacitor.

> **Not a developer?** Start with **[SETUP_GUIDE_FOR_KEVIN.md](SETUP_GUIDE_FOR_KEVIN.md)**.
> It explains everything below in plain language.

---

## What is in this release

| Area              | What families get                                                                                                                                                                                           |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Home**          | Today's classes, the next event, the latest announcement, quick actions, install prompt                                                                                                                     |
| **Updates**       | Announcement feed with categories, pinned and urgent posts, unread marks, detail pages                                                                                                                      |
| **Schedule**      | A real responsive timetable — today and weekly views, program/level filters, cancellation and time-change notices                                                                                           |
| **Events**        | Upcoming and past events, add-to-calendar (`.ics`), directions, registration and waiver links, sharing                                                                                                      |
| **Learn**         | Curriculum videos, the LMAA binder and documents, programs, FAQs, student resources                                                                                                                         |
| **More**          | About, contact and directions, gallery, notification preferences, install help, privacy policy, app version, discreet staff sign-in                                                                         |
| **Admin**         | A protected content manager for updates, events, schedule, resources, programs, FAQs, pages, gallery and academy information; one-tap templates for the events LMAA runs every year; staff access and roles |
| **Notifications** | Real Web Push. Families choose class changes, events or academy news; staff send from the admin area or alongside a post. Nothing is ever reported as sent unless it was                                    |

The app runs in one of two modes, decided automatically at build time:

- **Demo mode** (no Supabase configured) — the app loads built-in seed content: the
  academy's real contact details, its full weekly class schedule, the four programs, the
  FAQ answers, the tenets and the belt journey, all taken from LMAA's own published
  material. A clearly labelled local admin demo lets anyone try the content tools; changes
  are saved in that browser only.
- **Connected mode** (Supabase configured) — content comes from the database, staff sign
  in with real accounts, and edits are published to every family.

Nothing about students or children is collected in either mode. See
[SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md).

---

## Quick start

```bash
npm install       # install dependencies
npm run dev       # start the development server (http://localhost:5173)
```

The app runs in demo mode out of the box — no database or keys required.

### Everyday commands

| Command             | What it does                                           |
| ------------------- | ------------------------------------------------------ |
| `npm run dev`       | Development server with hot reload                     |
| `npm run build`     | Type-check and build the production site into `dist/`  |
| `npm run preview`   | Serve the production build locally                     |
| `npm run lint`      | ESLint                                                 |
| `npm run typecheck` | TypeScript, no emit                                    |
| `npm test`          | Vitest test suite                                      |
| `npm run verify`    | Lint + types + tests + build (what CI runs)            |
| `npm run format`    | Prettier                                               |
| `npm run icons`     | Regenerate the app icons from the LMAA logo            |
| `npm run seed:sql`  | Regenerate `supabase/seed.sql` from the demo seed data |
| `npm run cap:sync`  | Build and copy the web app into the native projects    |

---

## Documentation

| File                                                               | What it covers                                                                             |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| [SETUP_GUIDE_FOR_KEVIN.md](SETUP_GUIDE_FOR_KEVIN.md)               | Non-technical guide: run it, deploy it, fix it, edit content                               |
| [LAUNCH_KIT.md](LAUNCH_KIT.md)                                     | Getting it onto families' phones: phased checklist, door poster, announcement copy         |
| [PUSH_NOTIFICATIONS_SETUP.md](PUSH_NOTIFICATIONS_SETUP.md)         | Turning on notifications: VAPID keys, the sender, and what is stored                       |
| [BRAND.md](BRAND.md)                                               | The academy's brand identity: logo, colour, type, voice, and where each came from          |
| [BRAND_IMAGERY_BRIEF.md](BRAND_IMAGERY_BRIEF.md)                   | Shot list and prompts for generated header and launch imagery, anchored in the real dojang |
| [CONTENT_NEEDED.md](CONTENT_NEEDED.md)                             | Checklist of everything LMAA still has to supply                                           |
| [ARCHITECTURE.md](ARCHITECTURE.md)                                 | How the code is organised and why; extension points                                        |
| [SUPABASE_SETUP.md](SUPABASE_SETUP.md)                             | Connecting the database, staff accounts, storage, push                                     |
| [GITHUB_PAGES_SETUP.md](GITHUB_PAGES_SETUP.md)                     | Turning on GitHub Pages and custom domains                                                 |
| [NATIVE_APP_RELEASE_CHECKLIST.md](NATIVE_APP_RELEASE_CHECKLIST.md) | The full App Store / Play Store route                                                      |
| [SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md)                 | What is collected, what is protected, what changes later                                   |

---

## Deployment

Every push to `main` runs `.github/workflows/deploy.yml`, which lints, type-checks, tests,
builds and publishes to GitHub Pages. Pull requests run the same checks without deploying.

The site is served from a repository sub-path
(`https://<user>.github.io/<repository>/`), so the build sets Vite's `base` from
`VITE_BASE_PATH` and the app uses **HashRouter**. That combination means a family can
refresh, bookmark or share any screen — `/#/schedule`, `/#/events/123` — and it always
loads. See [GITHUB_PAGES_SETUP.md](GITHUB_PAGES_SETUP.md), including the one-line change
for a custom domain.

---

## Configuration

Copy `.env.example` to `.env.local` for local work. Everything in a `VITE_` variable is
**public** — it ends up in the JavaScript families download.

| Variable                        | Purpose                                                     |
| ------------------------------- | ----------------------------------------------------------- |
| `VITE_BASE_PATH`                | `/repository-name/` on GitHub Pages, `/` on a custom domain |
| `VITE_SUPABASE_URL`             | Supabase project URL (browser-safe)                         |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase **publishable/anon** key (browser-safe)            |
| `VITE_PUSH_ENABLED`             | `true` only once a secure server-side sender exists         |
| `VITE_PUSH_FUNCTION_URL`        | Public URL of that server-side sender                       |
| `VITE_FEATURE_LEADERSHIP`       | Leadership Academy placeholder, off by default              |
| `VITE_APP_VERSION`              | Shown on the More screen                                    |

**Never** put a Supabase secret (`service_role`) key, a push provider REST key, or any
other secret in these variables. The app actively refuses to use a Supabase key that
looks privileged and falls back to demo content instead.

---

## Project layout

```
src/
  app/           providers, routes, shared context
  components/    design system (ui/), layout, feedback
  config/        environment + feature flags
  data/          repository interface, demo + Supabase implementations
  domain/        types and pure business logic (schedule, announcements, events, ics)
  features/      one folder per screen area, incl. admin
  lib/           small shared helpers
  native/        the web/iOS/Android boundary for Capacitor
  notifications/ notification provider interface
  pwa/           install and update handling
supabase/        SQL migrations, RLS policies, storage, seed content
.github/         CI and deployment workflows
```

The rule that keeps this maintainable: **screens never talk to a database.** They ask a
`ContentRepository`, and the demo, Supabase and (later) LMAA Dojang OS implementations all
satisfy the same interface. See [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Roadmap beyond this release

- **LMAA Dojang OS** — the internal staff system (attendance, student records, leads,
  trials, retention, reporting). Not part of this app; the repository layer is the
  connection point.
- **Leadership Academy** — missions, badges, scenarios and instructor feedback, delivered
  as a protected module inside this app once accounts exist. A disabled feature flag and
  documented extension point are already in place.
- **Native apps** — iOS and Android via Capacitor, following
  [NATIVE_APP_RELEASE_CHECKLIST.md](NATIVE_APP_RELEASE_CHECKLIST.md).
