# Architecture

How the LMAA Family App is put together, and why. Written for whoever maintains or extends
it next.

---

## The one rule

**Screens never talk to a database.**

Every screen asks a `ContentRepository` for content. Three implementations satisfy that
one interface:

```
                    ┌──────────────────────────┐
   Screens  ───────▶│    ContentRepository     │  (src/data/repository.ts)
                    └────────────┬─────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        ▼                        ▼                        ▼
  DemoRepository        SupabaseRepository       LMAA Dojang OS API
  (seed + local          (Postgres + RLS)        (a future adapter —
   storage)                                       nothing else changes)
```

That is what makes the app useful before a backend exists, resilient when the backend is
down, and connectable to the future Dojang OS without rewriting a single screen.

---

## Layers

| Layer | Folder | Responsibility | Depends on |
| --- | --- | --- | --- |
| Domain | `src/domain` | Types and pure logic: schedule ordering, announcement visibility, event partitioning, `.ics` generation, formatting | nothing |
| Data | `src/data` | Repository interface, demo implementation, Supabase implementation, resilience wrapper, staff auth | domain |
| Config | `src/config` | Environment reading, feature flags | nothing |
| Notifications | `src/notifications` | Provider interface + honest "not configured" provider | domain |
| Native | `src/native` | The web / iOS / Android boundary (share, open, save file) | nothing |
| Components | `src/components` | Presentation only — no data fetching | domain (formatting) |
| Features | `src/features` | Screens, one folder per area | everything above |
| App | `src/app` | Providers, context, route table | everything |

Dependencies point **downwards only**. A domain function never imports a component; a
component never imports Supabase.

---

## Domain logic worth knowing

All pure, all unit-tested (`src/domain/*.test.ts`):

- **`announcements.ts`** — an announcement is visible when it is published, its publish
  time has passed, and it has not expired. That single rule powers the feed, the home
  screen headline, the unread badge and the admin "Live / Scheduled / Expired" labels.
- **`schedule.ts`** — ISO weekdays (Monday = 1), `HH:MM` times compared as minutes,
  ordering by day then start time, and `effectiveTimes()` which returns the replacement
  times when a class has been temporarily moved.
- **`events.ts`** — an event is "upcoming" until it *ends*, not until it starts, so an
  event running right now stays at the top of the list. All-day events run to the end of
  their day.
- **`calendar.ts`** — RFC 5545 `.ics` generation with correct CRLF endings, 75-octet line
  folding and text escaping, built entirely in the browser.

---

## Data flow

```
AppProviders
 ├── RepositoryProvider   creates exactly ONE repository, tracks "degraded"
 ├── AuthProvider         staff session (demo or Supabase)
 ├── NotificationProvider provider interface instance
 ├── ToastProvider        success/error feedback
 └── ContentProvider      loads the public content bundle once, exposes refresh()
```

- Family screens read `useContent()` — a single bundle fetched once, so navigating between
  tabs never refetches or flickers.
- The admin area has its own provider that loads the same content **including drafts and
  scheduled items** (`includeUnpublished: true`). After a save it refreshes both, so the
  family view is immediately correct.
- There is deliberately only one repository instance: the demo repository caches content,
  so a second instance would serve stale data after a save.

### Resilience, honestly

`ResilientRepository` wraps the live repository:

- **Family reads** that fail fall back to the built-in content, and the app says
  "We are having trouble reaching the academy's content right now."
- **Admin reads** never fall back — an editor must see the real failure.
- **Writes never fall back.** An administrator must never believe something was saved to
  the academy's database when it was not.

---

## Rendering and routing

- **HashRouter**, via `createHashRouter`. GitHub Pages serves static files only, so a hard
  refresh on `/schedule` would ask GitHub for a file that does not exist and return 404.
  Hash routes (`/#/schedule`) are never sent to the server, so every screen survives a
  refresh, a bookmark and a shared link — under a repository sub-path and under a custom
  domain alike. This is also what the future Capacitor build wants, since it loads from
  the file system.
- **Code splitting**: the admin area and the Supabase client load on demand. A parent
  opening the app downloads ~124 kB gzipped and never fetches the content-management
  tools or the database client.
- **Text is never rendered as HTML.** Admin-written copy goes through `RichText`, which
  turns blank lines into paragraphs and `- ` into bullets. Nothing an administrator types
  can inject markup into a family's screen.

---

## Design system

Tailwind CSS v4 with tokens defined in `src/index.css` under `@theme`:

- **Ink** (near-black) for chrome and text, **crimson** for action, **restrained gold** for
  honour and accent, generous white space, one radius scale.
- Dark chrome (header, bottom navigation, home hero) against a light content canvas —
  confident and martial without being heavy to read in daylight.
- Every interactive control is at least 44 px tall. One focus style everywhere.
- Motion is subtle and fully disabled under `prefers-reduced-motion`.
- No web fonts are loaded: the system font stack keeps first paint fast **and** avoids a
  third-party request from every family's device.

---

## The admin area

The admin screens are **definition-driven**. `src/features/admin/collections.ts` describes
each content type once — its fields, defaults, validation, list labels and save/delete
calls — and three generic screens render all eight content types:

- `AdminCollectionScreen` — the list, with search, publish toggle and delete confirmation
- `AdminEditorScreen` — the form, validation, preview, drafts and the push checkbox
- `AdminSettingsScreen` — academy information (admin-only)

Adding a field is one line in `collections.ts`. Adding a whole content type is one new
definition plus the repository methods.

Roles: **admin** (everything, including academy information) and **editor** (content
only). The UI enforces this for usability; the database enforces it for real.

---

## Security boundaries

- The browser only ever holds the Supabase **publishable** key. What an anonymous visitor
  can read, and who can write, is decided by Row Level Security in Postgres
  (`supabase/migrations/0002_policies.sql`), never by client code.
- `user_roles` has a `select` policy and **no write policy at all**, so RLS denies every
  write: the client physically cannot grant itself an admin role.
- `src/config/env.ts` inspects the configured Supabase key at start-up and refuses to use
  one that looks privileged (`sb_secret_…` or a non-`anon` JWT), falling back to demo
  content.

See [SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md).

---

## Extension points

### 1. LMAA Dojang OS (the internal staff system)

The Dojang OS — attendance, student records, leads, trials, marketing, retention,
reporting — is a **separate product** and is not built here.

When it arrives, connect it by writing one new class that implements `ContentRepository`
(and, if needed, `AuthService`) and returning it from `createRepository()` in
`src/data/index.ts`. No screen changes. If the two systems share a Supabase project, the
family app can simply read the Dojang OS tables through RLS-protected views that expose
only public fields.

**Do not** let student records, attendance or billing leak into this app's tables. This
app is public-facing and stores nothing about children by design.

### 2. Leadership Academy

Planned as a **protected module inside this app** (missions, progress, badges, scenarios,
instructor feedback), with instructors managing assignments and promotion readiness from
the Dojang OS side. It is not built.

What exists today:

- `features.leadership` in `src/config/features.ts`, **off by default**, set with
  `VITE_FEATURE_LEADERSHIP`.
- When on, the Learn hub shows a "Coming later" card and nothing else.

When it is built it will need family/student accounts, which changes the privacy posture
of the whole app — read [SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md) first.

### 3. Push notifications

`NotificationProvider` (`src/notifications/provider.ts`) is the seam.
`UnconfiguredNotificationProvider` answers honestly and never claims a send;
`ServerFunctionNotificationProvider` posts to a server-side endpoint that holds the
provider secret. Wiring instructions are in [SUPABASE_SETUP.md](SUPABASE_SETUP.md).

### 4. Native apps

`src/native/platform.ts` is the only place that knows about sharing, opening links and
saving files. The Capacitor build registers a native implementation there; nothing else
changes. See [NATIVE_APP_RELEASE_CHECKLIST.md](NATIVE_APP_RELEASE_CHECKLIST.md).

---

## Testing

| File | Covers |
| --- | --- |
| `src/domain/schedule.test.ts` | Filtering, sorting, weekday handling, temporary changes |
| `src/domain/announcements.test.ts` | Publication, scheduling, expiry, ordering, unread counts |
| `src/domain/events.test.ts` | Upcoming/past logic, featured selection, relative labels |
| `src/domain/calendar.test.ts` | `.ics` structure, escaping, folding, all-day events |
| `src/data/repository.test.ts` | Demo persistence, draft visibility, fallback behaviour, "writes never fall back" |
| `src/features/admin/validation.test.ts` | Form rules and every collection definition |
| `src/features/admin/admin.test.tsx` | Sign-in, validation, publish-to-family flow, delete confirmation, editor permissions |
| `src/app/navigation.test.tsx` | Primary navigation, deep links, empty states, not-found |

Run everything with `npm run verify`.

---

## Deliberate choices

| Choice | Why |
| --- | --- |
| HashRouter | Static hosting cannot rewrite unknown paths; hash routes always survive a refresh |
| No UI component library | Eight small components, full control of the LMAA look, nothing to keep upgrading |
| Hand-drawn icon set | Same reason, and it keeps the bundle small |
| No web fonts | Faster first paint and no third-party request from a family's device |
| Single content bundle | One fetch, no per-screen loading spinners, trivial to cache |
| Definition-driven admin | Eight content types, three screens |
| Sample content is labelled | A parent must never mistake demo data for real academy information |
| Push is disabled, not faked | A missed cancellation notice is worse than no notifications |
