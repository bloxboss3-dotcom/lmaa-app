# Security and privacy

This app serves families and children, so it is built privacy-first: the safest data is the
data you never collect.

---

## What this app collects: nothing about your family

In this release:

- **No account is required.** Families use the whole app without signing in.
- **No information about students or children** is collected, stored or transmitted —
  no names, ages, belt ranks, attendance, photos, medical or billing information.
- **No advertising and no behavioural tracking.** There are no analytics scripts, no
  advertising SDKs, no tracking pixels and no third-party cookies.
- **No web fonts or external scripts.** Everything the app needs is served from its own
  address, so simply opening the app does not tell any third party anything.

### The only things stored on a device

All of it stays in the browser's local storage on that one device, and none of it leaves
it:

| Stored                                   | Why                                               |
| ---------------------------------------- | ------------------------------------------------- |
| Which announcements you have read        | So the "New" badge is accurate                    |
| Your notification preferences            | Ready for when push notifications are switched on |
| Your schedule filter choice              | So the schedule opens the way you left it         |
| Whether you dismissed the install prompt | So it does not keep asking                        |
| In demo mode only: demo content edits    | So the demo is convincing                         |

Clearing browser data removes all of it. Nothing sensitive is stored, so nothing sensitive
can leak from it.

### What a family's device does contact

- **The app's own address** (GitHub Pages, or the academy's domain) for the app files.
- **The academy's Supabase project**, once connected, to read published content.
- **YouTube or Vimeo**, only if you open a curriculum video, and only through their
  privacy-friendly players (`youtube-nocookie.com`, Vimeo with Do Not Track).
- **Nothing else.**

---

## How content is protected

### Keys

The app is a static site: everything in its JavaScript is public. Exactly two Supabase
values are used, and both are designed to be public:

- the **project URL**
- the **publishable / anon key**

These are safe because the database — not the app — decides what may be read and written.

**Never** put any of these in the app, in a `VITE_` variable, or in the repository:

- the Supabase **secret** / `service_role` key
- the database password
- a push provider REST API key
- any other API secret

**Guard rail:** at start-up the app inspects the configured Supabase key. If it detects a
privileged key (`sb_secret_…`, or a JWT whose role is not `anon`) it **refuses to use it**,
logs a loud developer error, and falls back to demo content so families see a working app
rather than a leak in progress. If this ever triggers, rotate the key in Supabase
immediately — it has already been published.

### Row Level Security

Every table has RLS enabled (`supabase/migrations/0002_policies.sql`):

| Who                     | Can do                                                                                                     |
| ----------------------- | ---------------------------------------------------------------------------------------------------------- |
| Anonymous visitor       | Read **published** content only — and for announcements, only after the publish time and before the expiry |
| Editor                  | Read everything, and create/change/delete content                                                          |
| Administrator           | The same, plus change academy information                                                                  |
| Anyone from the browser | **Never** change roles                                                                                     |

Drafts and scheduled posts are not merely hidden by the interface — the database does not
return them to an anonymous request.

`user_roles` deserves its own note: it has a `select` policy and **no write policy at
all**. Under RLS, an operation with no matching policy is denied, so the client physically
cannot grant itself an administrator role. Roles are granted only from the Supabase
dashboard.

Table-level `GRANT`s are also kept minimal, so both layers have to agree before anything
is written.

### Staff accounts

- **Public sign-up does not exist.** Accounts are created by the academy owner.
- Signing in to Supabase is not enough — without a role, entry to the admin area is refused
  with a clear message.
- Sessions are handled by Supabase Auth with refresh tokens; the app stores no passwords.
- Administrator identities are never shown to families anywhere in the app.

### Content safety

Text written by staff is **never rendered as HTML**. It is displayed as plain text with
paragraphs and bullets, so nothing typed into the admin area — deliberately or by accident
— can inject markup or script into a family's screen. Links out of the app are validated
as `http(s)` (or internal app links) and open with `rel="noopener noreferrer"`.

---

## Permissions this app requests

**None.** No camera, location, contacts, microphone or photo library.

The only permission it will ever ask for is **notifications**, and only when a family taps
the button on the Notifications screen, and only once push is actually connected.

This is a deliberate rule: a permission is only ever requested by a finished feature that
genuinely needs it. Requesting permissions "to look native" is both a privacy problem and
an App Store rejection reason.

---

## Honesty rules the app follows

1. **Never claim a notification was sent.** Until a secure server-side sender exists, the
   "Send push notification" checkbox is disabled and says why. A family who believes they
   will be told about a cancelled class, and is not, is worse off than one who knows to
   check the app.
2. **Never present demo data as real.** Seeded sample content is labelled **Sample** in the
   interface, and the admin area shows a persistent "changes are saved in this browser
   only" banner in demo mode.
3. **Never show a fake value.** A missing phone number is an honestly disabled Call button,
   not a placeholder number someone might dial.
4. **Never claim a save that did not happen.** If the database is unreachable, family
   screens fall back to built-in content and say so — but admin reads and _every_ write
   fail loudly instead.
5. **Never cache live information stale-first.** Announcements and schedule changes are
   fetched network-first so a family does not read yesterday's news; only the app shell and
   static assets are cached aggressively.

---

## What changes if the app grows

Each of these adds a new category of data. **Update the privacy policy before switching any
of them on**, not after.

### Push notifications

- **New data**: a device push token, plus the topics chosen on that device.
- The `notification_subscriptions` table holds an opaque token and nothing else — no name,
  no email, no student information — and is not readable from the browser.
- **Disclose**: that the app registers a device identifier for notifications, who sends
  them, and how to turn them off.
- **Store forms**: Apple's App Privacy and Google's Data safety must both be updated.

### Family or student accounts (needed for Leadership Academy)

This is the biggest change and needs proper thought before any code is written:

- **New data**: names, email addresses, and a link between a parent and a child.
- **Children's privacy law applies** — COPPA in the US, and equivalents elsewhere.
  Collecting information from or about a child under 13 generally requires **verifiable
  parental consent**.
- Practical guidance: have **parents** hold the account, not children; collect the minimum
  (a first name and an initial is usually enough); never make a child's information public
  or visible to other families; write a retention policy and a deletion route.
- Both app stores have separate, stricter review tracks for apps aimed at children.
- Take legal advice before launching this.

### Analytics

- If analytics are ever added, use a privacy-respecting, cookie-free option (Plausible,
  Fathom or similar), keep it optional, and disclose it.
- **Do not** add Google Analytics or any advertising SDK to an app used by children.

### Leadership Academy progress data

- **New data**: a student's missions, badges and instructor feedback.
- This is information _about a child_ and must be private to that family and to authorised
  instructors, enforced by RLS, not by the interface.
- Instructor-side management belongs in the **LMAA Dojang OS**, not here.

### Connecting the Dojang OS

- The Dojang OS holds attendance, student records, leads and billing. **None of that may
  flow into this public app.**
- If both share a Supabase project, expose only public fields to this app through
  RLS-protected views, and never widen a policy "just for now".

---

## Practical rules for the academy

- Only publish photos LMAA owns, and only with permission from every identifiable person —
  especially children. Record who gave permission in the photo's "Permission note" field.
- Do not put a student's name, age or belt rank into an announcement or event description.
  The app is public; anyone with the address can read it.
- Keep the number of staff accounts small, give **editor** rather than **admin** unless
  someone truly needs it, and remove accounts when people leave.
- Never share a staff password. If someone leaves, change it in Supabase the same day.
- Keep the privacy policy in the app truthful about what the app does _today_.

---

## If something goes wrong

**A key was committed or published**

1. Rotate it immediately in Supabase (or the provider's dashboard).
2. Replace the value in the GitHub repository variables and re-deploy.
3. Assume the old key is public forever — removing it from the code is not enough, because
   it stays in the git history and in browsers' caches.

**A staff account is compromised**

1. Change the password in Supabase → Authentication → Users.
2. Remove the row from `user_roles` if the account should no longer have access.
3. Review recent changes: `created_by` and `updated_by` record who touched each row.

**Something private was published by accident**

1. Delete or unpublish it in the admin area immediately.
2. Remember it may already be cached in a family's browser or by a search engine — treat it
   as public and tell whoever is affected.

---

## Notifications: what a device registration contains

Turning on notifications stores exactly three things per device, and nothing else:

- the **push address** the browser issues — a long, random, unguessable URL;
- two **encryption keys** the browser generates, so only that device can decrypt
  the message;
- the **topics** the family ticked (class changes, events, academy news).

There is no name, no email, no phone number, and nothing identifying a student. The
academy cannot tell whose device a registration belongs to. Turning notifications off
deletes the row.

Three rules are enforced by the database rather than by the app, and are checked by
`supabase/tests/security.sql`:

- A browser can register and deregister **only its own** device, through two functions.
  It has no insert or delete rights on the subscription table itself, so no visitor can
  read, alter or wipe the list.
- The **device list is never readable from a browser**. Only the server-side sender
  (which runs with the service role) can pull it; an ordinary signed-in user is refused
  even the count.
- The **VAPID private key**, which is what authorises a message as coming from the
  academy, exists only as a Supabase Edge Function secret. It is never in the app
  bundle, never in a `VITE_` variable, and never in the repository.

## Messages from families

The Message screen is the one place a family types something that leaves their device.
What it collects is exactly what a reply needs — a name, one way to reach them, which topic,
and the message — and nothing else. No account, no child's details asked for, nothing
kept on the phone.

- **Without a backend** the app cannot send anything itself, so it opens the family's own
  mail app with the message written out. The family presses Send. The app never claims
  to have delivered it.
- **With Supabase connected** the message is stored in `contact_messages`. Row Level
  Security lets anyone insert a _new_ message and lets only academy staff read or update
  one; the sender cannot read it back, and an administrator alone may delete. Sizes are
  bounded by database constraints as well as by the app.
- **Email forwarding** is optional and server-side only (`forward-message`), triggered by a
  database webhook that must carry a shared secret header. The email provider's key exists
  only as an Edge Function secret.
- Staff should delete handled messages the academy no longer needs; the privacy policy says
  the academy can delete them at any time.

## Staff access

Roles are managed in-app by an administrator, with two limits enforced by Row Level
Security:

- **Nobody can promote themselves.** Changing a role requires already being an
  administrator, so an editor cannot grant themselves anything.
- **An administrator cannot change or remove their own row.** That prevents accidental
  self-demotion and makes it impossible for the academy to lock itself out entirely.

There is still no public sign-up. Accounts are created by the owner in Supabase, then
given a role from the Staff access screen.
