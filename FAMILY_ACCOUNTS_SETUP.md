# Family accounts

How a parent signs in to the app and sees their own child's belt, stripes and class count,
and how the academy keeps that information.

Family accounts are **built, and switched off**. Nothing in this guide happens, and nothing
about any child is stored, until the academy does the steps in "Switching it on".

> **Do this first:** family accounts need the academy database. If you have not done
> [SUPABASE_SETUP.md](SUPABASE_SETUP.md) yet, do that first.

---

## What a parent sees

1. In the app, **My family** (on Home and under More).
2. They type their email. The academy emails them a **sign-in code**. There is no password.
3. They type the code, and see a card for each of their children:
   - first name and last initial, the belt, and where it sits on the ladder;
   - stripes on the belt (0 to 3), and **Ready to test** once all 3 are on;
   - the next belt, classes attended, the membership plan, and the next test date when the
     academy has posted one under Events;
   - a link to "Getting ready for a belt test". A new white belt or Little Tiger also gets
     "New to LMAA? Start here".

A parent who signs in with an email the academy has not linked to a student sees an empty
screen that tells them to ask at the front desk. Signing in opens nothing by itself.

## What the academy stores about a child

Only this, and the database refuses anything else:

| Stored                         | Example            |
| ------------------------------ | ------------------ |
| First name                     | Riley              |
| Last initial (one letter)      | S                  |
| Belt                           | White belt         |
| Stripes on the belt, 0 to 3    | 2                  |
| Classes attended (optional)    | 14                 |
| Membership plan (optional)     | 1-year plan        |
| The parent emails that may see | parent@example.com |

No surname, birthday, address, photo, medical note or payment detail. This is not the
academy's student file and must not be used as one.

## Who can see it

Enforced by the database (`supabase/migrations/0006_family_accounts.sql`) and checked by
`supabase/tests/security.sql`:

- A visitor who is not signed in can read **nothing**.
- A signed-in parent can read **only the students their own confirmed email is linked to**,
  and cannot change anything. They cannot see another family's child or email.
- Only academy staff can add or change a student or link a parent. Only an administrator
  can delete one.
- A student marked "not training" disappears from their parents' view and is kept for staff.

---

## Switching it on

Do these in order. Steps 1 to 4 are in the Supabase dashboard.

### 1. Run the migration

If you set the database up with `supabase/setup.sql`, this is already done. Otherwise:
**SQL Editor → New query**, paste the contents of
`supabase/migrations/0006_family_accounts.sql`, then `0007_explicit_grants.sql`, and run
them. Each ends with **Success**.

### 2. Put the code in the sign-in email

Supabase's standard email contains a link. A link opens in the phone's browser instead of
the installed app, so the app uses a code instead, and the email has to show it.

**Authentication → Emails → Templates.** Change **both** "Magic Link" and "Confirm signup"
to:

- Subject: `Your LMAA sign-in code`
- Body:

  ```html
  <h2>Your LMAA sign-in code</h2>
  <p>Enter this code in the LMAA app:</p>
  <p style="font-size:28px;letter-spacing:4px"><strong>{{ .Token }}</strong></p>
  <p>
    It works once and stops working after an hour. If you did not ask for it, ignore this email.
  </p>
  ```

### 3. Check the sign-in settings

**Authentication → Sign In / Providers → Email:**

- **Allow new users to sign up**: on. (An account alone shows nothing; see above.)
- **Confirm email**: on. This is what proves a parent owns the address. Never turn it off.
- **Email OTP length**: 6.

### 4. Send the emails through your own mail service

Supabase's built-in email is for testing and sends only a few messages an hour. For real
families, connect a mail service: **Authentication → Emails → SMTP Settings**. Resend
([resend.com](https://resend.com)) has a free tier and is the same service the app can use to
forward messages (SUPABASE_SETUP.md §7b).

### 5. Approve the privacy policy

The app's privacy policy says no information about children is collected. That stops being
true the moment you add the first student, so **update and approve the policy first**
(_Admin → Information pages → Privacy Policy_). Wording you can start from:

> **Family accounts.** If you sign in to "My family", the academy stores your email address
> so you can sign in, and for each of your children a first name, the first letter of their
> last name, their belt, the stripes on it, how many classes they have attended and their
> membership plan. Only you and academy staff can see this. It is never shown to other
> families, never used for advertising and never sold. Ask the academy at any time to
> correct it or delete it.

This is information about children. Have it reviewed by someone qualified before you
publish it, and add family accounts to the App Store and Google Play privacy forms if the
app is in the stores.

### 6. Turn the feature on

On GitHub: **Settings → Secrets and variables → Actions → Variables**, add

| Name                           | Value  |
| ------------------------------ | ------ |
| `VITE_FEATURE_FAMILY_ACCOUNTS` | `true` |

then re-run the deploy (**Actions → Build and deploy to GitHub Pages → Run workflow**).
"My family" appears in the app, and "Students & families" appears in Admin.

### 7. Test it with your own email

1. **Admin → Students & families → Add a student.** Use a made-up name, and put your own
   email under "Parent emails".
2. Open the app, **My family**, and sign in with that email. You should see that one student.
3. Sign in with a different email. You should see no students.
4. Remove the made-up student.

---

## Day to day

Everything is in **Admin → Students & families**.

- **A new student:** Add a student, choose the belt, type the parent emails (one per line).
- **A stripe:** tap **+ Stripe** next to the student. "Undo stripe" takes it back.
- **After a test:** a student with 3 stripes shows **Passed: move to …**. It moves them up
  one belt and clears the stripes. A Little Tiger with a black stripe is never moved to the
  main white belt automatically; edit the student and choose the belt when the instructors
  decide.
- **A parent changes email, or a second parent wants access:** edit the student and change
  the list of parent emails.
- **A student leaves:** edit them and untick "Currently training".

---

## Connecting Dojang OS (optional, later)

Dojang OS can send belts, stripes and class counts to the app, so nobody types them twice.
It is one way only: Dojang OS stays the record, the app shows it.

### One-time setup

```bash
supabase secrets set STUDENT_SYNC_SECRET="<a long random value, e.g. from: openssl rand -hex 32>"
supabase functions deploy sync-students --no-verify-jwt
```

Keep the secret in a password manager. It goes into Dojang OS's settings on the academy's
computer and **nowhere else**: never in this repository, never in a `VITE_` variable.

### What Dojang OS sends

```
POST https://YOUR-PROJECT-REF.supabase.co/functions/v1/sync-students
x-sync-secret: <the secret>
content-type: application/json
```

```json
{
  "students": [
    {
      "external_id": "the student's id in Dojang OS",
      "first_name": "Riley",
      "last_initial": "S",
      "rank": "white",
      "stripes": 2,
      "classes_attended": 14,
      "plan": "one_year",
      "active": true,
      "guardian_emails": ["parent@example.com"]
    }
  ]
}
```

- `rank` is one of: `tiger_white`, `tiger_yellow`, `tiger_green`, `tiger_blue`, `tiger_red`,
  `tiger_black`, `white`, `yellow`, `orange`, `senior_orange`, `green`, `senior_green`,
  `blue`, `senior_blue`, `brown`, `senior_brown`, `red`, `senior_red`, `black`.
- `plan` is `one_year` or `black_belt_club`. `classes_attended`, `plan`, `active` and
  `guardian_emails` may be left out.
- Students are matched on `external_id`: new ones are added, known ones are updated. A
  student left out of a call is not touched. Send `"active": false` when one leaves.
- `guardian_emails`, when sent, **replaces** that student's parent links.
- Anything else on a student (a surname, a birthday) is ignored and never stored.
- At most 500 students per call. The reply lists any student that was turned away, and why:
  `{ "saved": 12, "problems": [{ "index": 3, "external_id": "…", "problem": "…" }] }`.

What Dojang OS sends overwrites what staff typed in the app for the same student, so once
it is connected, record stripes in Dojang OS.

### For the Dojang OS session

Paste this to the Claude Code session that works on Dojang OS:

> The LMAA Family App can now show each parent their own child's belt, stripes and class
> count. Add a one-way push from Dojang OS to the app's `sync-students` function, described
> in `FAMILY_ACCOUNTS_SETUP.md` in the `bloxboss3-dotcom/lmaa-app` repository ("What Dojang
> OS sends"). Send only: the student's Dojang OS id, first name, last initial, rank, stripes,
> class count if we track it, plan, whether they are active, and the parents' emails.
> Nothing else leaves Dojang OS. Read the URL and the secret from Dojang OS's own settings;
> never commit them. Push when a stripe, a test result, a plan or a parent email changes,
> and offer a "Send everyone now" button. Test only with invented students.
