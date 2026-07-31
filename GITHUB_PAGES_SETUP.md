# GitHub Pages setup

How the app gets from this repository to a web address families can open.

---

## 1. Turn on GitHub Pages (once)

1. Open the repository on GitHub.
2. Click **Settings** (the top row of tabs, not your account settings).
3. In the left menu, click **Pages**.
4. Under **Build and deployment**, set **Source** to **GitHub Actions**.
   - ❌ Do **not** choose "Deploy from a branch" — the workflow publishes the built app,
     not the source files.
5. There is no Save button; the choice applies immediately.

Then push to `main`, or run the workflow manually (**Actions → Build and deploy to GitHub
Pages → Run workflow**).

Two to three minutes later the app is live at:

```
https://<your-github-username>.github.io/<repository-name>/
```

For this repository that is:

```
https://bloxboss3-dotcom.github.io/lmaa-app/
```

The address also appears at the top of the **Pages** settings screen and on each
successful deployment in the Actions tab.

---

## 2. What the workflow does

`.github/workflows/deploy.yml` runs on every push to `main` and on demand:

1. Checks out the code
2. Installs Node.js 22 with npm caching
3. `npm ci` — installs exactly what the lockfile specifies
4. `npm run lint`
5. `npm run typecheck`
6. `npm test`
7. `npm run build`
8. Adds `.nojekyll` so GitHub serves every built file untouched
9. Uploads `dist/` with `actions/upload-pages-artifact`
10. Publishes with `actions/deploy-pages` into the `github-pages` environment

Permissions are exactly what the Pages actions require (`contents: read`, `pages: write`,
`id-token: write`) and no more. A `concurrency` group means deployments queue rather than
overlap, so a half-published site never goes live.

If any check fails, **nothing is deployed** and the previous version stays up.

Pull requests run the same checks through `.github/workflows/ci.yml` without deploying.

---

## 3. Why the app works on a sub-path

Two pieces make this reliable:

**Vite's `base`.** On a project site, files live under `/lmaa-app/`, not `/`. The workflow
sets `VITE_BASE_PATH` to `/<repository-name>/` automatically, so every script, stylesheet
and icon resolves correctly.

**HashRouter.** Addresses look like `/#/schedule`. GitHub Pages only serves files that
exist; a refresh on a real path like `/schedule` would return **404**. Everything after
the `#` never reaches the server, so the app handles it itself. That means a family can:

- refresh on any screen,
- bookmark a specific event,
- share a link to an announcement,

and it always loads. It is also the right choice for the future Capacitor app, which loads
files from the device rather than a web server.

---

## 4. Using a custom domain (e.g. app.leesmartialartsacademy.com)

1. **Settings → Pages → Custom domain**, enter the domain, click **Save**.
2. At your DNS provider add:
   - a `CNAME` record for the subdomain (e.g. `app`) pointing at
     `<your-github-username>.github.io`, **or**
   - for an apex domain, the four `A` records GitHub lists on that screen.
3. Wait for the DNS check to pass, then tick **Enforce HTTPS**.
4. Tell the build the app is now at the root:
   **Settings → Secrets and variables → Actions → Variables → New repository variable**
   - Name: `VITE_BASE_PATH`
   - Value: `/`
5. Re-run the deployment.

GitHub keeps the domain in the Pages settings; the workflow does not delete it.

To go back to the project-site address, delete the `VITE_BASE_PATH` variable and re-run —
the workflow returns to `/<repository-name>/` on its own.

---

## 5. Checking a deployment

1. **Actions** tab → open the newest run.
2. A green ✓ on both **build** and **deploy** means it published.
3. The **deploy** job shows the live URL.
4. Open it on a phone, add it to the home screen, and check a few screens.

Worth checking after the first deployment:

- [ ] The home screen loads with the LMAA branding
- [ ] The bottom navigation moves between all five sections
- [ ] **Refresh while on the Schedule screen** — it must stay on Schedule
- [ ] The Schedule shows the real class times
- [ ] `/#/admin` shows the sign-in screen
- [ ] The browser offers to install the app (Chrome/Edge/Android), or Share → Add to Home
      Screen works (iPhone)

---

## 6. If it goes wrong

| Symptom | Fix |
| --- | --- |
| "404 — There isn't a GitHub Pages site here" | Source is not set to **GitHub Actions** (section 1), or no successful deployment has run yet. |
| Page loads but is unstyled, console shows 404s for `/assets/...` | The base path is wrong. Delete the `VITE_BASE_PATH` variable so the workflow computes it, and re-run. |
| Deploy step fails with a permissions error | The workflow's `permissions` block was edited. It needs `pages: write` and `id-token: write`. |
| Deployment succeeds but the site looks old | The service worker is holding the previous version. Reload once; the app also shows an "A new version is ready" prompt. |
| Custom domain shows a certificate warning | DNS has not finished propagating. Wait, then tick **Enforce HTTPS**. |
| Workflow never starts | It only runs on `main`. Check which branch you pushed to. |

---

## 7. Costs and limits

GitHub Pages is free for public repositories, with a soft limit of 100 GB of bandwidth and
10 builds per hour — far beyond what a martial arts academy's family app will use.

The site is public. Anything published in the app is readable by anyone with the address —
which is why this app deliberately holds no information about students or children.
