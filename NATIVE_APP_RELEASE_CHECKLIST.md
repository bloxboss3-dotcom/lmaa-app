# Native app release checklist (iPhone and Android)

The web app is the product today. This document is the complete route to also shipping it
as a real iPhone and Android app using **Capacitor**, which wraps this exact web code in a
native shell.

Nothing here has been done yet, and none of it is needed for the web app to work.

**Realistic timeline:** 4–8 weeks, mostly waiting on Apple and Google account
verification. Start steps 3–10 early; they are paperwork, not programming.

**Realistic cost:** about **$99/year** (Apple) plus a **one-off $25** (Google), before any
developer time.

---

## Before you write any code

### 1. Confirm the permanent application name

The name under the icon and in the stores. Proposed: **Lee's Martial Arts Academy**
(short name **LMAA**). Check nothing similar already exists in either store.

Set in `capacitor.config.ts` → `appName`.

### 2. Confirm the permanent bundle identifier

Proposed: **`com.leesmartialartsacademy.app`**

⚠️ **This can never be changed once the app is published**, on either store. Changing it
means a brand-new app listing and losing every existing install. Decide it now.

Set in `capacitor.config.ts` → `appId`.

### 3. Confirm LMAA legally controls everything in the app

Both stores reject apps that use material the publisher does not own. Confirm in writing
that the academy owns or is licensed to use:

- the name "Lee's Martial Arts Academy" and the logo,
- the domain used for the website and support links,
- every photo, especially any showing children (signed photo releases),
- every curriculum video and document,
- any music in videos.

If a third party made the logo or filmed the videos, get written confirmation of the
academy's right to publish them.

### 4. Create an Apple Developer **organization** account

<https://developer.apple.com/programs/enroll/>

Choose **Organization**, not Individual. Individual accounts publish under a person's own
name, which looks wrong for an academy and is painful to transfer later.

### 5. Get the academy's D-U-N-S number

Apple requires one for organization accounts. It is **free** from Dun & Bradstreet and can
take up to **two weeks**, so start here.

Check whether the academy already has one: <https://developer.apple.com/enroll/duns-lookup/>

The legal entity name and address must match your business registration **exactly**.

### 6. Use an organization email and a public website

Apple verifies both. You need:

- an email address on the academy's own domain (not Gmail),
- a public website that names the business and matches the D-U-N-S record.

Apple may telephone the number listed for the business.

### 7. Pay the Apple Developer Program fee

**$99 USD per year.** The account stops working — and published apps are removed — if it
lapses. Put a calendar reminder a month before renewal.

### 8. Create a Google Play **organization** developer account

<https://play.google.com/console/signup> — choose the organization option.

### 9. Complete Google's organization and identity verification

Google requires a D-U-N-S number for organizations too, plus verification of the business
address and a contact person. Personal accounts must publish their address publicly;
another reason to register as an organization.

### 10. Pay the Google Play registration fee

**$25 USD, one time.**

---

## Setting up the development machine

### 11. Get access to a Mac with the required Xcode

Building and uploading an iOS app **requires macOS**. Options:

- a Mac (Apple Silicon, 16 GB RAM comfortable) with the current Xcode from the Mac App
  Store — Apple regularly raises the minimum Xcode/SDK version for submissions, so this
  must stay updated;
- a Mac cloud service (MacStadium, MacinCloud) rented by the month;
- a CI service that provides macOS runners (Codemagic, Bitrise, Ionic Appflow, GitHub
  Actions `macos-latest`) — document whichever route is chosen so the next release does
  not start from scratch.

Android can be built from macOS, Windows or Linux.

### 12. Install Android Studio and the Android SDK

<https://developer.android.com/studio> — during setup install the SDK Platform, the SDK
Build-Tools and an emulator image. Also install a **JDK 21** if Android Studio does not
bring one.

---

## Adding the native projects

The Capacitor packages are **already in this repository** (`@capacitor/core` and
`@capacitor/cli` 7.6.x) and `capacitor.config.ts` is written. The commands below are for
the versions installed here.

### 13. Confirm the Capacitor packages

```bash
npm install                       # already listed in package.json
npx cap --version                 # expect 7.6.x
```

If they ever need re-adding:

```bash
npm install @capacitor/core
npm install --save-dev @capacitor/cli
```

Initialisation has already been done (that is what `capacitor.config.ts` is). If you ever
need to redo it:

```bash
npx cap init "Lee's Martial Arts Academy" com.leesmartialartsacademy.app --web-dir=dist
```

### 14. Add the iOS and Android platforms

```bash
npm install @capacitor/ios @capacitor/android
npx cap add ios
npx cap add android
```

This creates `ios/` and `android/` folders. They are **git-ignored on purpose** in this
phase: they are large, generated, and would add noise to a web-only repository. When the
native release becomes real work, remove those two lines from `.gitignore` and commit the
folders — signing settings and native tweaks live there and must be version-controlled.

### 15. Build the web app and copy it into the native projects

```bash
npm run build      # IMPORTANT: with VITE_BASE_PATH unset, so base is "/"
npx cap sync       # copies dist/ and updates native dependencies
```

Or in one step:

```bash
npm run cap:sync
```

> The native shell loads files from the device, so the build **must** use base `/`. A build
> made for GitHub Pages (`/lmaa-app/`) will show a blank screen inside the app. Check
> `.env.local` before building for native.

Then open the native IDEs:

```bash
npx cap open ios        # opens Xcode      (npm run cap:open:ios)
npx cap open android    # opens Android Studio (npm run cap:open:android)
```

Repeat `npm run cap:sync` after **every** web change.

### 16. Configure signing, identifiers, capabilities and versions

**iOS (Xcode)**
- Signing & Capabilities → select the academy's team, enable automatic signing.
- Confirm the bundle identifier matches `capacitor.config.ts`.
- Add the **Push Notifications** capability (and Background Modes → Remote notifications)
  only if push is actually being shipped.
- Set Version (e.g. `1.0.0`) and Build (increment on every upload).
- Set the deployment target to the minimum iOS your families realistically use.

**Android (Android Studio)**
- `applicationId` in `android/app/build.gradle` must match the bundle identifier.
- Create an **upload keystore** and store it, plus its passwords, in a password manager.
  **Losing it means you can never update the app again.**
- Set `versionCode` (an integer that must increase on every upload) and `versionName`.
- Enable Play App Signing when prompted.

### 17. Replace every placeholder icon and splash screen

The icons in `public/icons/` are placeholders drawn for this project. Before release,
generate final assets from the real LMAA logo:

```bash
npm install --save-dev @capacitor/assets
# put a 1024x1024 icon.png and 2732x2732 splash.png in an "assets" folder
npx capacitor-assets generate --iconBackgroundColor '#0b0b0d' --splashBackgroundColor '#0b0b0d'
```

Keep the important part of the mark inside the middle 80% so Android's circular mask does
not crop it. Also update `public/icons/` for the web app — see CONTENT_NEEDED.md §1.

### 18. Configure native push notifications

Only if push is genuinely being shipped:

```bash
npm install @capacitor/push-notifications
npx cap sync
```

- **iOS**: create an APNs key in the Apple Developer portal and upload it to your push
  provider. Push does not work in the iOS Simulator — test on a real device.
- **Android**: create a Firebase project, download `google-services.json`, and place it in
  `android/app/`.
- The provider's REST secret stays on the **server** (the Supabase Edge Function in
  SUPABASE_SETUP.md). It must never be in the app bundle.
- Register the native token into `notification_subscriptions` and implement the deep
  links in step 22.

### 19. Test on real iPhones and Android devices

Emulators miss too much. Test on at least one real iPhone and one real Android phone:

- [ ] Every screen, including with a slow connection and in aeroplane mode
- [ ] Safe areas: notch, Dynamic Island, home indicator, Android gesture bar
- [ ] Android hardware back button behaves sensibly on every screen
- [ ] Add-to-calendar opens the real calendar app
- [ ] External links (registration, waiver, maps) open correctly
- [ ] Dark and light system settings
- [ ] Large text / accessibility text sizes
- [ ] Rotation, if you allow it
- [ ] Push notifications arrive and open the right screen

### 20. Run an internal beta with families and staff

- **iOS**: TestFlight — up to 100 internal testers without review; external testing needs a
  short review.
- **Android**: Play Console → Internal testing — a link you can send to staff.

Run it for at least a week with real parents. Ask specifically whether anything is
confusing, not just whether it is broken.

---

## Store submission

### 21. Prepare the store listings

For both stores:

- App name and subtitle/short description
- Full description (what it does for LMAA families)
- Keywords (Apple only)
- **Screenshots** — Apple requires 6.7" iPhone sizes; Google requires phone screenshots
  plus a 1024 × 500 feature graphic
- App icon (1024 × 1024, no transparency, no rounded corners — the stores add those)
- **Support URL** — a real page that will still exist in a year
- **Privacy policy URL** — must be publicly reachable *outside* the app; the app's own
  privacy screen is not sufficient
- Category (Education, or Health & Fitness)
- Age rating questionnaire
- Review notes: explain that the app is the official app of a specific martial arts
  academy, that the content is the academy's own, and how a reviewer can see everything
  (no login is required for families)

### 22. ⚠️ Make sure it is not "just a website"

**This is the most likely reason for rejection.** Apple's App Review Guideline 4.2
("Minimum Functionality") rejects apps that only repackage a website.

Before submitting, the native build should add things a browser cannot do as well:

- [ ] **Native push notifications** — the single strongest justification, and genuinely
      useful for a cancelled class
- [ ] **Reliable offline access** to the schedule and saved resources, not just cached
      pages
- [ ] **Deep links** so tapping a notification opens that exact event or announcement
- [ ] **Native add-to-calendar** rather than downloading an `.ics` file
- [ ] **Native sharing** through the system share sheet
- [ ] **Downloadable/saved learning resources** kept on the device
- [ ] Later, once family accounts exist: personalised content per family

Do **not** add permissions the app does not need. Every requested permission (camera,
location, contacts, microphone, photo library) must be justified by a finished feature or
it becomes a rejection reason of its own. This app currently needs **none** of them.

### 23. Complete the privacy disclosures

- **Apple**: App Privacy questionnaire in App Store Connect. If the app collects nothing,
  say so — but if push tokens or analytics are added, they must be declared. Apps aimed at
  children have extra rules; be careful about the "Kids" category, which brings strict
  requirements.
- **Google**: the Data safety form, plus a declaration about whether the app targets
  children (Families policy).

Both stores treat an inaccurate disclosure as a serious violation. Re-read
[SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md) and answer from what the app actually
does at that moment.

### 24. Build and upload the iOS archive

In Xcode: **Product → Archive** → **Distribute App** → **App Store Connect** → **Upload**.

The build appears in App Store Connect after processing (a few minutes to an hour).

### 25. Build and upload the signed Android App Bundle

In Android Studio: **Build → Generate Signed Bundle / APK → Android App Bundle**, signed
with the upload keystore from step 16. Upload the resulting `.aab` in the Play Console.

### 26. Test through TestFlight and Play internal testing

Install the exact build you are about to submit, from the store's own testing channel, and
walk through the app once more. Builds behave differently from debug builds.

### 27. Submit for review

- **Apple**: typically 24–48 hours. Rejections come with a message; read it literally, fix,
  and reply in the Resolution Center.
- **Google**: from a few hours to several days; first submissions from a new account take
  longer.

Have the academy ready to announce it only once the app is actually live.

---

## 28. Updating the app afterwards

Every future release:

1. Make the change and merge it to `main` — the **web app deploys automatically**.
2. `npm run build` with base `/`, then `npx cap sync`.
3. Bump the versions: Xcode Version/Build; Android `versionCode` (must increase) and
   `versionName`.
4. Archive and upload (iOS); generate a signed bundle and upload (Android).
5. Test through TestFlight / internal testing.
6. Submit for review, with release notes.

Keep in mind:

- The web app can be fixed in minutes; the native apps take days. Ship content and layout
  changes to the web first.
- Apple periodically requires builds to be made with a newer SDK — keep Xcode current.
- Keep the Apple subscription paid and the Android keystore backed up. Losing either is the
  most expensive mistake available.

---

## Quick command reference

```bash
# One-time platform setup
npm install @capacitor/ios @capacitor/android
npx cap add ios
npx cap add android

# Every build
npm run build          # base must be "/" — unset VITE_BASE_PATH
npx cap sync           # or: npm run cap:sync

# Open the native IDEs
npx cap open ios       # npm run cap:open:ios
npx cap open android   # npm run cap:open:android

# Icons and splash screens from final artwork
npm install --save-dev @capacitor/assets
npx capacitor-assets generate --iconBackgroundColor '#0b0b0d' --splashBackgroundColor '#0b0b0d'
```
