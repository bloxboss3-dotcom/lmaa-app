# Content needed from LMAA

Everything the app is still missing, in one checklist. Each item says **where it goes** so
you can add it as soon as you have it.

The app is deliberately honest about gaps: missing details show as "Not added yet" or a
disabled button rather than a fake value or a broken link. Nothing below has been
invented.

---

## 1. Brand and artwork

- [ ] **Final LMAA logo** — vector (`.svg`, `.ai` or `.eps`) if it exists, otherwise the
      largest PNG available with a transparent background.
      *Replaces* the placeholder chevron mark in `src/components/layout/Logo.tsx`.
- [ ] **Square app-icon source** — one square image, **1024 × 1024 px** minimum, no
      transparency, no text near the edges. The important part of the mark must sit inside
      the middle **80%** (the "safe zone") so Android's circular mask does not crop it.
      *Used to regenerate* `public/icons/` (see `scripts/generate-icons.mjs`).
- [ ] **Official brand colours** — exact hex codes for the academy red and gold.
      *Currently placeholders:* near-black `#0b0b0d`, deep red `#c1121f`, gold `#c9a24d`.
      *Change in* `src/index.css` (the `@theme` block).
- [ ] **A hero photo (optional)** — a wide academy photo, at least **1600 × 900 px**, that
      LMAA owns.

> **Do not supply artwork LMAA does not own.** No stock photos without a licence, no
> images from another academy, no logos containing third-party marks.

---

## 2. Academy details → *Admin → Academy information*

These power the Contact screen, the **Call** and **Directions** buttons and the app footer.
Every one of them is blank today.

- [ ] Phone number (exactly as families should see it)
- [ ] Email address
- [ ] Street address (each line as it should appear)
- [ ] Map link — open the academy in Google Maps, tap **Share**, copy the link
- [ ] Website address
- [ ] Office / front-desk hours
- [ ] Support email (where app problems should be reported — can be the same address)
- [ ] Social links: Facebook, Instagram, YouTube, TikTok
- [ ] Tagline — one short line for the home screen
- [ ] Academy description — one or two paragraphs

---

## 3. Class schedule → *Admin → Class schedule*

**Already in the app** (supplied by LMAA, please confirm it is still correct):

| Class | Ages | Days and times |
| --- | --- | --- |
| Little Tigers | 4–5 | Mon & Wed 4:25–4:55 PM · Tue & Thu 3:40–4:10 PM |
| Children White Belt | 6–12 | Mon & Wed 3:40–4:20 PM · Tue & Thu 5:00–5:40 PM |
| Family & All-Level | All | Mon & Wed 7:15–7:55 PM · Fri 6:40–7:20 PM |
| Teen & Adult | 13+ | Mon–Thu 8:00–8:40 PM |

**Still needed:**

- [ ] Class times for **colour-belt / advanced children's classes** (not supplied — no
      times have been invented)
- [ ] Any **weekend classes**
- [ ] Any **leadership, demo team, sparring or competition team** class times
- [ ] Any **private lesson** or **open mat** slots that should be public
- [ ] A short description for each class (what a family should expect)
- [ ] Eligibility notes where they matter (e.g. "white belts only", "must be enrolled")

---

## 4. Programs → *Admin → Programs*

The four programs above exist with placeholder descriptions.

- [ ] A real description for each program (2–4 sentences)
- [ ] Any programs missing from the list
- [ ] Confirmation of the correct age range for each

---

## 5. Updates → *Admin → Updates*

- [ ] **Delete the sample posts.** Three demo announcements ship with the app and are
      labelled **Sample** in the interface. They exist to show how the feed works.
- [ ] Anything families should already know about (closures, testing dates, deadlines)

---

## 6. Events → *Admin → Events*

- [ ] **Delete the two sample events** (labelled **Sample** in the interface)
- [ ] Real upcoming events: name, date, start and end time, location, description
- [ ] Registration links, where you use them
- [ ] Waiver / permission form links
- [ ] An image for each event, if you have one (about **1200 × 675 px**)
- [ ] Who each event is for ("all students", "green belt and above", "families welcome")

---

## 7. Learning resources → *Admin → Learning resources*

The app ships with **labelled placeholders only**. No curriculum, technique descriptions
or terminology have been written — that has to come from the academy.

- [ ] **The current LMAA binder** as a PDF
- [ ] Terminology sheet, forms list, and any other handouts
- [ ] **Curriculum video links**, per program/level
- [ ] ✅ **Written confirmation that LMAA owns, or has permission to publish, every video
      and document added.** This matters both legally and for the App Store review later.
- [ ] Thumbnail images for videos (optional; about **640 × 360 px**)

> YouTube and Vimeo links play inside the app using their privacy-friendly players. Any
> other link opens in the browser instead.

---

## 8. Questions → *Admin → Questions*

Four placeholder questions ship with the app, each labelled **Sample**, with no real
answers.

- [ ] Real answers to those four:
  - What should my child wear to their first class?
  - How do I know when my child is ready to test?
  - What happens if we miss a class?
  - How do I contact the academy?
- [ ] The other questions your front desk answers every week

---

## 9. Photo gallery → *Admin → Photo gallery*

The gallery is **empty on purpose** — no stock or third-party photos were used.

- [ ] Academy-owned photos (about **1200 px** on the long edge)
- [ ] ✅ **Photo-use permission for every identifiable person, especially every child.**
      Record who gave permission in the "Permission note" field on each photo.
- [ ] A caption for each photo

---

## 10. Information pages → *Admin → Information pages*

- [ ] **About LMAA** — the academy's story, instructors, style taught
- [ ] **Privacy policy** — a placeholder is in place describing what the app actually does
      today (no accounts, no child data, no tracking). **Someone at LMAA must read and
      approve it before launch.** If you add family accounts, analytics or push
      notifications later, it must be updated first — see
      [SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md).
- [ ] **Support** — what a family should do if the app misbehaves, and who replies

---

## 11. Notifications (when you are ready)

- [ ] Decide whether push notifications are wanted at all
- [ ] Choose a provider (OneSignal is documented in [SUPABASE_SETUP.md](SUPABASE_SETUP.md))
- [ ] Decide who is allowed to send them
- [ ] Agree what is worth a notification (closures and cancellations, probably; every post,
      probably not)

Until this is done the app says plainly that notifications are not connected, and the
"Send push notification" checkbox stays disabled.

---

## 12. For the native iPhone / Android release later

Not needed for the web app — collect these before starting the store submissions
(details in [NATIVE_APP_RELEASE_CHECKLIST.md](NATIVE_APP_RELEASE_CHECKLIST.md)).

- [ ] Confirmed permanent app name
- [ ] Confirmed bundle identifier (proposed: `com.leesmartialartsacademy.app`)
- [ ] Legal business name and address exactly as registered
- [ ] **D-U-N-S number** (free from Dun & Bradstreet; can take up to two weeks)
- [ ] An email address on the academy's own domain
- [ ] A public LMAA website that names the business
- [ ] Apple Developer Program organization account (annual fee)
- [ ] Google Play organization developer account (one-time fee)
- [ ] Support URL and privacy-policy URL that will still be live in a year
- [ ] Store screenshots, description and age rating decision
- [ ] Who owns the store accounts, and who else needs access

---

## Quick priority order

1. **Section 2** — contact details. Without them the Call and Directions buttons stay
   disabled.
2. **Section 3** — confirm the schedule and fill the gaps. This is the feature families
   will open most.
3. **Sections 5 and 6** — delete the sample posts and events.
4. **Section 10** — approve the privacy policy.
5. **Section 1** — the real logo and icon.
6. Everything else.
