# Setup guide for Kevin

This guide assumes you are **not** a software developer. It explains, step by step, how to
put the LMAA Family App online, how to change what families see, and what to do when
something goes wrong.

Take it one section at a time. Nothing here can break the academy — the worst that
happens is a deployment fails and the previous version stays live.

---

## 1. The five-minute version

1. Turn on GitHub Pages (section 3). The app goes live at
   `https://<your-github-username>.github.io/lmaa-app/`.
2. Share that link with families. They can add it to their phone home screen.
3. Right now the app shows **demo content** — the real class schedule plus clearly marked
   sample announcements and placeholders.
4. When you are ready for real, editable content, connect Supabase (section 6).
5. Work through [CONTENT_NEEDED.md](CONTENT_NEEDED.md) to replace every placeholder.

---

## 2. Running the app on your own computer (optional)

You only need this if you want to preview changes before they go live.

**Install Node.js** (version 20 or newer) from <https://nodejs.org> — take the "LTS"
option.

Then open Terminal (Mac) or PowerShell (Windows), go to the project folder, and run:

```bash
npm install
npm run dev
```

The terminal prints a web address such as `http://localhost:5173`. Open it in your
browser. Press `Ctrl + C` in the terminal to stop.

**Before you commit any change**, run:

```bash
npm run verify
```

That runs every check the deployment runs. If it finishes without errors, your change is
safe to publish.

---

## 3. Putting the app online (GitHub Pages)

Do this once:

1. Go to your repository on GitHub.
2. Click **Settings** (top row of tabs).
3. In the left menu, click **Pages**.
4. Under **Build and deployment → Source**, choose **GitHub Actions**.
   *Do not* choose "Deploy from a branch".
5. That is the whole setup. There is nothing to save on that screen.

Now make anything happen on the `main` branch (push a change, or use the manual run in
section 4). Within a couple of minutes the app is live at:

```
https://<your-github-username>.github.io/lmaa-app/
```

Full detail, including custom domains: [GITHUB_PAGES_SETUP.md](GITHUB_PAGES_SETUP.md).

---

## 4. Publishing a change

Any change pushed to the `main` branch publishes automatically.

To publish without changing anything (useful after changing a setting):

1. Go to the **Actions** tab.
2. Click **Build and deploy to GitHub Pages** in the left list.
3. Click **Run workflow** → **Run workflow**.

---

## 5. When a deployment fails

You will get an email from GitHub, and the Actions tab shows a red ✗.

1. Open the **Actions** tab.
2. Click the failed run (the one with the red ✗).
3. Click the **build** job.
4. The failed step is marked with a red ✗ — click it to expand the log.
5. Read the **last few red lines**. They usually name the file and the problem.

What the steps mean:

| Step | If it fails |
| --- | --- |
| **Install dependencies** | Usually a temporary network problem — re-run the workflow. |
| **Lint** | A code-style rule was broken. |
| **Check types** | Something does not match what the code expects. |
| **Run tests** | A change broke behaviour that is protected by a test. Read the test name — it says what broke. |
| **Build the app** | The app could not be assembled. |
| **Deploy** | Almost always means GitHub Pages is not set to "GitHub Actions" (section 3). |

**Important:** a failed deployment never takes the site down. Families keep seeing the
last version that worked.

---

## 6. Connecting Supabase (real, editable content)

Until you do this, the app shows built-in demo content and admin changes are saved only
in the browser you made them in.

Follow [SUPABASE_SETUP.md](SUPABASE_SETUP.md). The short version:

1. Create a free Supabase project.
2. Paste the three SQL files from `supabase/migrations/` into the SQL editor and run them
   in order, then optionally `supabase/seed.sql` for the real class schedule.
3. Copy two values from Supabase: the **Project URL** and the **publishable (anon) key**.
4. In GitHub: **Settings → Secrets and variables → Actions → Variables → New variable**
   and add:
   - `VITE_SUPABASE_URL` → your project URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY` → your publishable/anon key
5. Re-run the deployment (section 4).
6. Create your staff account in Supabase (SUPABASE_SETUP.md section 5) and sign in at
   `https://<your-site>/#/admin`.

---

## 7. What is safe to paste into GitHub, and what is never safe

Everything the app is built with becomes part of the JavaScript that families download.
There is no such thing as a hidden value in a website's own code.

### ✅ Safe (these are meant to be public)

- `VITE_SUPABASE_URL` — your project address
- `VITE_SUPABASE_PUBLISHABLE_KEY` — the key labelled **publishable** or **anon**
- `VITE_BASE_PATH`, `VITE_APP_VERSION`, `VITE_FEATURE_LEADERSHIP`
- `VITE_PUSH_APP_ID`, `VITE_PUSH_FUNCTION_URL`

These are safe because the database itself decides what an anonymous visitor may read
(published content only) and who may change anything (staff accounts only).

### ❌ Never, under any circumstances

- The Supabase **secret** / **service_role** key (labelled "secret" and "never share")
- Your Supabase **database password**
- A **OneSignal REST API key** or any other push provider secret
- Any password, private key, or API secret of any kind

If one of these is ever pasted into the project or into a `VITE_` variable, treat it as
public: go to Supabase (or the provider) and **rotate/regenerate the key immediately**.

As a safety net, the app inspects the Supabase key at start-up. If it detects a
privileged key, it refuses to use it, logs a loud error for developers, and quietly falls
back to demo content so families never see a broken screen.

---

## 8. Editing content

Go to `https://<your-site>/#/admin`, or scroll to the bottom of the **More** screen and
tap **Staff sign in**.

- **Before Supabase**: choose "Explore as Administrator". This is a demonstration — there
  is no security and changes stay in that one browser. The screen says so.
- **After Supabase**: sign in with the email and password created for you.

Inside, you can manage:

| Section | Use it for |
| --- | --- |
| **Updates** | Announcements. Schedule a post for later, pin it, set importance, add a button, or set a date it disappears. |
| **Events** | Testing dates, tournaments, camps, celebrations. Add a registration or waiver link. |
| **Class schedule** | Add or change class times. Mark a class **Cancelled** or **Time changed** and families see a notice on that class. |
| **Learning resources** | Curriculum videos, binder documents, student resources. |
| **Programs** | Program names, ages and descriptions. |
| **Questions** | The FAQ list. |
| **Information pages** | About, privacy policy, support. |
| **Photo gallery** | Academy photos (see the permission note in CONTENT_NEEDED.md). |
| **Academy information** | Phone, email, address, map link, website, social links. This is what makes the **Call** and **Directions** buttons work. |

Useful habits:

- **Save as draft** while you are still writing. Families never see drafts.
- **Post at** a future date/time schedules the post; it appears on its own.
- **Preview** shows what a family will see.
- Deleting always asks first, and cannot be undone.

### About "Send push notification"

The checkbox on an update is **disabled until push notifications are actually connected**.
The app will never tell you a notification was sent when it was not. Until then, families
see updates when they open the app.

---

## 9. Common problems

| What you see | What to do |
| --- | --- |
| The site shows "404 — File not found" | GitHub Pages is not set to **GitHub Actions**. Redo section 3. |
| The site loads but looks unstyled | The `VITE_BASE_PATH` variable is wrong. Delete the repository variable so the workflow works it out automatically. |
| A screen shows "Demo content" after connecting Supabase | The two Supabase variables are missing, misspelled, or the deployment has not re-run. Check section 6, then re-run the workflow. |
| Sign-in says "not set up for the LMAA admin area" | The account exists but has no role. See SUPABASE_SETUP.md section 5. |
| Families see an old version | They need to reload once. The app also shows an "A new version is ready" prompt automatically. |
| Nothing appears after saving | Check the item is not still a **draft**, and that "Post at" is not in the future. |
| The Call or Directions button is greyed out | The phone number or map link has not been added in **Academy information**. |

---

## 10. What to gather before launch

Work through **[CONTENT_NEEDED.md](CONTENT_NEEDED.md)**. The short list of things that
block a good launch:

1. The final LMAA logo (vector if possible) and a square icon image.
2. Phone number, email, street address, map link and website.
3. A short paragraph about the academy.
4. Confirmation that the class schedule in the app is correct and complete.
5. Program descriptions and real FAQ answers.
6. The current LMAA binder and any curriculum video links you own the rights to.
7. Gallery photos, with permission from the families in them.
8. A privacy policy you are happy to publish.

---

## 11. Getting help

If you hand this project to a developer, point them at
[ARCHITECTURE.md](ARCHITECTURE.md) — it explains how the app is put together and where to
add things. [SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md) explains the rules the app
follows about family and child information; please make sure anyone changing the app
reads it.
