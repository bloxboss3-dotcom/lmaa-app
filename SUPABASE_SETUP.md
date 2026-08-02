# Supabase setup

Connecting the app to a Supabase project turns the demo into a real content system: staff
sign in with real accounts and every change reaches every family.

You can skip this entirely at first — the app is fully usable in demo mode.

**Time needed:** about 30 minutes.

---

## 1. Create the project

1. Go to <https://supabase.com> and create a free account.
2. **New project**. Give it a name (e.g. `lmaa-family-app`), choose a region close to the
   academy, and set a database password.
3. **Save the database password in a password manager.** It is never used by this app and
   must never be committed anywhere.

---

## 2. Create the tables

1. In Supabase, open **SQL Editor** → **New query**.
2. Paste the contents of each file **in this order**, running each one before the next:

   | Order | File | What it does |
   | --- | --- | --- |
   | 1 | `supabase/migrations/0001_schema.sql` | Tables, indexes, timestamp triggers |
   | 2 | `supabase/migrations/0002_policies.sql` | Row Level Security — who can read and write |
   | 3 | `supabase/migrations/0003_storage.sql` | Buckets for images and documents |
   | 4 *(optional)* | `supabase/seed.sql` | The academy's real class schedule and programs |

3. Each run should end with **Success**. If step 2 or 3 fails, re-run step 1 first — they
   depend on it.

> Prefer the CLI? `supabase link --project-ref <ref>` then `supabase db push` applies the
> same files.

### What the tables are

| Table | Holds |
| --- | --- |
| `announcements` | Updates families see, with publish and expiry times |
| `events` | Events, registration and waiver links |
| `schedule_entries` | Weekly classes, plus cancellation / time-change notices |
| `programs` | Program list |
| `learning_resources` | Curriculum videos, binder documents, student resources |
| `faqs` | Questions and answers |
| `pages` | About, privacy policy, support |
| `gallery_items` | Photos, each with a permission note |
| `app_settings` | Phone, email, address, map link, social links (one row) |
| `staff_profiles` | Staff names and emails |
| `user_roles` | Who is an admin, who is an editor |
| `notification_subscriptions` | Device push registrations — no personal information |

Every content table carries `id`, `created_at`, `updated_at`, `published`, and where it
helps, a publish time, a sort order and `created_by` / `updated_by`.

---

## 3. Copy the two browser-safe values

**Project Settings → API** (or **API Keys**):

| Copy this | Into this variable |
| --- | --- |
| **Project URL** | `VITE_SUPABASE_URL` |
| **Publishable key** (older projects: **anon public**) | `VITE_SUPABASE_PUBLISHABLE_KEY` |

### ⚠️ The one thing that must never happen

On the same screen there is a **secret** key (older projects: `service_role`). It bypasses
every security rule in the database.

- ❌ Never put it in `.env`, in GitHub, in the code, or in any `VITE_` variable.
- ✅ It belongs only in server-side environments, such as a Supabase Edge Function secret.

Everything in a `VITE_` variable is downloaded by every family. The app guards against
this: if the configured key looks privileged, it refuses to use it and falls back to demo
content. **If you ever paste one by mistake, rotate it in Supabase immediately.**

---

## 4. Tell the deployment about it

In GitHub: **Settings → Secrets and variables → Actions → Variables tab → New repository
variable**, twice:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Use **Variables**, not Secrets. These values are public by design, and Secrets are hidden
from the build log in ways that make problems harder to diagnose.

Then re-run the deployment (**Actions → Build and deploy to GitHub Pages → Run workflow**).

For local development, put the same two lines in `.env.local`.

---

## 5. Create staff accounts

There is **no public sign-up** — that is deliberate. The academy owner creates each
account.

1. Supabase → **Authentication** → **Users** → **Add user** → **Create new user**.
2. Enter the staff member's email and a temporary password. Tick **Auto Confirm User**.
3. Copy the new user's **UID**.
4. Open **SQL Editor** and run, replacing the UID and email:

   ```sql
   -- Give the account a profile
   insert into public.staff_profiles (id, email, display_name)
   values ('PASTE-UID-HERE', 'kevin@example.com', 'Kevin')
   on conflict (id) do update set display_name = excluded.display_name;

   -- Grant the role: 'admin' (everything) or 'editor' (content only)
   insert into public.user_roles (user_id, role)
   values ('PASTE-UID-HERE', 'admin')
   on conflict (user_id) do update set role = excluded.role;
   ```

5. The staff member signs in at `https://<your-site>/#/admin` and changes their password
   in Supabase.

**Roles**

| Role | Can do |
| --- | --- |
| `admin` | All content, plus academy information |
| `editor` | All content; cannot change academy information or roles |

An account with no row in `user_roles` can sign in to Supabase but is refused entry to the
admin area with a clear message. That is the intended behaviour.

### Why the client can never promote itself

`user_roles` has a `select` policy and **no insert, update or delete policy**. Under Row
Level Security, an operation with no matching policy is denied. Roles can therefore only
be changed from the Supabase dashboard by someone with real access.

---

## 6. Uploading images and documents

`0003_storage.sql` creates two public buckets:

| Bucket | For | Limit |
| --- | --- | --- |
| `academy-media` | Photos and images (JPEG, PNG, WebP, AVIF, SVG) | 10 MB |
| `academy-documents` | PDFs (binder, handouts, waivers) | 25 MB |

Anyone can read them — they are published inside a public app. Only signed-in staff can
upload, replace or delete.

To add an image:

1. Supabase → **Storage** → `academy-media` → **Upload file**.
2. Click the file → **Get URL** → copy it.
3. Paste it into the "Image address" field in the admin screen.

> Only upload material LMAA owns or has written permission to use, and never upload a
> photo of a child without a signed photo release. Record the permission in the
> "Permission note" field on each gallery photo.

---

## 7. Push notifications (later, and only done properly)

The app ships with a working notification **preference** screen and a provider interface,
but no provider — and it never claims a notification was sent. To make it real:

### The rule

A push provider's REST API key can send messages to every family. It must live **only on a
server**. Putting it in this app would publish it to everyone.

### The shape

```
Admin ticks "Send push notification"
        │
        ▼
Supabase Edge Function  ← holds the provider secret (server-side only)
        │
        ▼
OneSignal / Web Push  ──▶  families' devices
```

### Steps

1. Create a OneSignal app (or equivalent) and note the **App ID** (public) and **REST API
   key** (secret).
2. Create a Supabase Edge Function, e.g. `send-push`, that:
   - verifies the caller is signed in **and** has an `admin` or `editor` role,
   - reads the provider secret from an environment variable,
   - sends the notification,
   - returns success or a real error.
3. Store the secret with the Supabase CLI — never in this repository:
   ```bash
   supabase secrets set ONESIGNAL_REST_API_KEY=...
   supabase functions deploy send-push
   ```
4. Add two **public** repository variables in GitHub:
   - `VITE_PUSH_FUNCTION_URL` = `https://<project>.supabase.co/functions/v1/send-push`
   - `VITE_PUSH_ENABLED` = `true`
5. Re-run the deployment. The "Send push notification" checkbox becomes usable, and the
   app reports honestly whether each send succeeded.

Add the device-registration SDK at the same time so `notification_subscriptions` fills up;
until then there is nobody to send to.

**Before switching this on**, update the privacy policy: push tokens are a new category of
data. See [SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md).

---

## 8. Checking it worked

1. Open the site. The **More** screen footer should no longer say "Demo content".
2. Go to `/#/admin` — you should see a real email and password form, not the demo buttons.
3. Sign in, post a draft update, and confirm it does **not** appear in the family feed.
4. Publish it and confirm it does.
5. Set "Post at" to five minutes in the future on another post; it should stay hidden until
   then.

---

## 9. Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| Still shows demo content | Variables missing/misspelled, or the deployment has not re-run. Both `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` must be set. |
| Console error about a secret key | A privileged key was configured. Replace it with the publishable key **and rotate the leaked one in Supabase**. |
| "This account is not set up for the LMAA admin area" | The user has no row in `user_roles`. Section 5. |
| Saving fails with a permissions error | The signed-in account is an `editor` trying to change academy information — that is admin-only. |
| Families see nothing but staff see everything | Working as intended: items are drafts, or their publish time is in the future. |
| Everything is empty after connecting | The database is genuinely empty. Run `supabase/seed.sql`, or add content in the admin area. |
