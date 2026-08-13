# Turning on notifications

How to get from "the app exists" to "I can tell every family a class is cancelled".

This is a **one-time setup**, done once by whoever manages the app. It takes about
20 minutes. Everything is free: web push has no per-message cost, no monthly fee, and
no third-party notification company involved.

> **Do this first:** notifications need the academy database. If you have not done
> [SUPABASE_SETUP.md](SUPABASE_SETUP.md) yet, do that first — none of the steps below
> will work without it.

---

## What you will end up with

- Families tap **More → Notifications** and choose what they want to hear about:
  **class changes**, **events**, or **academy news**. Three separate switches, so a
  parent who only wants to know about cancellations gets only that.
- You get an admin screen — **Send a notification** — where you write a title and a
  message, pick who it goes to, see how many devices it will reach, and send.
- When you post an update, add an event, or cancel a class, there is a **"Also send a
  push notification"** tickbox so you do not have to do it twice.

**It never pretends.** Until every step below is done, the Send button stays disabled
and says why. A parent who thinks they will be told about a cancelled class and is not
is worse off than one who knows to check the app.

---

## Step 1 — Run the database migration

In the Supabase dashboard, open **SQL Editor** and run the contents of:

```
supabase/migrations/0004_push_and_staff.sql
```

This adds the columns a device needs, plus two small functions so a phone can register
and unregister itself without being able to touch anyone else's registration.

---

## Step 2 — Generate your signing keys

Web push messages are signed with a **VAPID key pair**. On your computer:

```bash
npx web-push generate-vapid-keys
```

You get two values:

```
Public Key:   BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U
Private Key:  UUxI4O8-FbRouAevSmBQ6o18hgE4nSG3qwvJTfKc-ls
```

- The **public key** is meant to be in the app. Publishing it is fine and expected.
- The **private key** is the one that can send messages as the academy. It goes into
  Supabase in the next step and **nowhere else** — never in the app, never in a
  `VITE_` variable, never committed to the repository.

Keep both somewhere safe (a password manager). If you lose the private key you have to
generate a new pair, and **every family has to turn notifications on again**.

---

## Step 3 — Deploy the sender

Install the [Supabase CLI](https://supabase.com/docs/guides/cli), then from the project
folder:

```bash
supabase login
supabase link --project-ref YOUR-PROJECT-REF

# Give the function the keys. The private key lives only here.
supabase secrets set \
  VAPID_PUBLIC_KEY="paste the public key" \
  VAPID_PRIVATE_KEY="paste the private key" \
  VAPID_SUBJECT="mailto:lmaa.wilsonville@gmail.com"

supabase functions deploy send-notification
```

`VAPID_SUBJECT` must be a real `mailto:` address — push services use it to contact you
if something goes wrong with your messages.

The function URL will be:

```
https://YOUR-PROJECT-REF.supabase.co/functions/v1/send-notification
```

---

## Step 4 — Tell the app about it

On GitHub: **Settings → Secrets and variables → Actions → Variables**, add two
**repository variables** (not secrets — both of these are meant to be public):

| Name                     | Value                          |
| ------------------------ | ------------------------------ |
| `VITE_VAPID_PUBLIC_KEY`  | the **public** key from step 2 |
| `VITE_PUSH_FUNCTION_URL` | the function URL from step 3   |

Then re-run the deploy: **Actions → Build and deploy to GitHub Pages → Run workflow**.

For local development, put the same two values in a `.env.local` file — see
[.env.example](.env.example).

---

## Step 5 — Test it on your own phone

1. Open the app on your phone and add it to your Home Screen.
   **On iPhone this is not optional** — Apple only delivers web push to apps that have
   been added to the Home Screen (Share → Add to Home Screen). In a normal Safari tab
   there is no way to receive notifications at all.
2. Open the app from the Home Screen icon, go to **More → Notifications**, and tap
   **Turn on notifications**. Accept the permission prompt.
3. On a computer, sign in to **/admin → Send a notification**. It should now say it
   reaches **1 device**.
4. Send yourself a test. It should arrive within a few seconds, and tapping it should
   open the app on the right screen.

If the count says 0 after step 2, the device did not register — see Troubleshooting.

---

## What families see, and what you store about them

Turning notifications on stores exactly three things per device:

- the **push address** the browser issues (a long, random, unguessable URL),
- two **encryption keys** the browser generates so only that device can read the message,
- the **topics** they ticked.

There is no name, no email, no phone number, and nothing about a student. The academy
cannot tell who a device belongs to, which is deliberate: see
[SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md). Turning notifications off deletes
the row.

---

## Rules of thumb for sending

- **Send the things people would be annoyed to miss.** A cancelled class, a testing
  date, a snow closure.
- **Do not send what they can find themselves.** "The schedule is on the app" is not a
  notification.
- One a week is plenty. People who get too many turn them off, and then you cannot
  reach them on the night it actually matters.
- A notification **cannot be unsent**. Read it once more before you tap Send.

---

## Troubleshooting

**The Send button is greyed out.**
`VITE_PUSH_FUNCTION_URL` is not set, or the deploy has not re-run since you set it.
Check **Actions** for a green tick after your last run.

**"Turn on notifications" does nothing on iPhone.**
The app has to be opened from the Home Screen icon, not from a Safari tab. If you are
in the EU, Apple removed Home Screen web apps under the Digital Markets Act and push is
not available at all.

**The audience count says 0 but I turned notifications on.**
Look for an error in the browser console. The most common cause is a mistyped public
key — the app checks the shape of the key and will tell you if it is malformed.

**Messages stopped arriving on a device.**
Normal: browsers expire push registrations. The sender deletes any device the push
service reports as gone, and the family can turn it back on. That is why the audience
count sometimes drops.

**I need to change the keys.**
Generate a new pair, update the Supabase secrets and the GitHub variable, and redeploy.
Everyone will need to turn notifications on again — the old registrations are tied to
the old key and the app will clear them automatically.
