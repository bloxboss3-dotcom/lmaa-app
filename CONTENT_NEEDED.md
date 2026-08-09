# Content needed from LMAA

Everything the app is still missing, in one checklist. Each item says **where it goes** so
you can add it as soon as you have it.

The app is deliberately honest about gaps: missing details show as "Not added yet" or a
disabled button rather than a fake value or a broken link. Nothing below has been invented.

> **Most of this list is now done.** The app was populated from the academy's own website,
> **leesmartialartsacademy.com** — see [§0](#0-please-confirm-what-was-taken-from-your-website)
> first, because that content needs a quick check rather than a rewrite.

---

## 0. Please confirm what was taken from your website

All of the following came straight off LMAA's public website and is now live in the app.
None of it was invented, but a website can go stale — please confirm each line is still
right, then tick it off. Anything wrong can be fixed in **Admin** in under a minute.

- [ ] **Logo** — `src/assets/brand/lmaa-logo.png`, taken from
      `leesmartialartsacademy.com/images/logo.png`. Used for the app icon, the staff
      sign-in screen and the home-screen icon. The "LMAA" lettering was cropped from the
      same file for the app header.
      *If you have the original vector or a larger PNG, send it — see [§1](#1-brand-artwork-still-wanted).*
- [ ] **Contact details** — (503) 682-2318 · lmaa.wilsonville@gmail.com ·
      8263 SW Wilsonville Rd, Ste A, Wilsonville, OR 97070 · Mon–Fri 1:00–8:40 PM ·
      Instagram @lmaa\_\_wilsonville
- [ ] **The full weekly class schedule** — all 34 classes, Monday to Friday, exactly as
      published on the website's Schedule section. **This is the single most important
      thing to check**, because families will plan their week around it.
- [ ] **The four programs** — Little Tigers, Kids Taekwondo, Teen & Adult Taekwondo,
      Family Class, with the descriptions from the website.
- [ ] **14 FAQ answers** — the "Questions every parent asks" section.
- [ ] **About the academy** — the founding story, Master Lee's quote, the 6th Dan / Kukkiwon
      / World Taekwondo credentials, and the four named instructors.
- [ ] **Tenets & the LMAA Pledge** — the five tenets with their Korean names, and the
      five-line pledge.
- [ ] **The belt journey** — thirteen belts, white through black, with the quarterly
      testing months.
- [ ] **Beyond class** — camps, birthday parties, tournaments, Mom & Me / Dad & Me,
      Parents Night Out, the Halloween party and the holiday potluck.

Two deliberate omissions you may want to revisit:

- The **"2 weeks free + first month free" summer offer** was **not** added. It is a
  new-student offer with an end date, and the app is for families who have already joined.
  Post it yourself in **Admin → Updates** if you want it there — updates support an expiry
  date, so it can remove itself automatically.
- **Black-belt classes** ("All Black Belt", "Black Belt Club") are not filed under any one
  program, because they take black belts of every age and filing them under the children's
  or the adults' program would mislead a parent using the program filter. They are found by
  level instead. Change this in **Admin → Class schedule** if you would rather group them.

---

## 1. Brand artwork still wanted

- [ ] **Vector logo** (`.svg`, `.ai` or `.eps`) if one exists. The app currently uses the
      588 × 570 px PNG from the website, which is sharp enough everywhere it is shown but
      would be sharper still from vector.
- [ ] **Square app-icon source** — one square image, **1024 × 1024 px** minimum, with the
      mark inside the middle **80%** (the "safe zone") so Android's circular mask does not
      crop it. The current icons are generated from the website logo on the brand paper
      background; a purpose-made square version would read better at home-screen size.
      *Regenerate with* `npm run icons`.
- [ ] **A hero photo (optional)** — a wide academy photo, at least **1600 × 900 px**, that
      LMAA owns.

> **Do not supply artwork LMAA does not own.** No stock photos without a licence, no images
> from another academy, no logos containing third-party marks.

---

## 2. Class schedule → *Admin → Class schedule*

The full published timetable is in the app. Still worth adding:

- [ ] Any **weekend classes**, private lessons or open-mat slots that should be public
- [ ] A short description for each class (what a family should expect)
- [ ] Eligibility notes where they matter (e.g. "must be enrolled", "gear required")
- [ ] Tell us whenever the timetable changes — or edit it yourself in Admin

Temporary changes (a cancelled class, a one-off time change) are handled in Admin without
touching the timetable itself: set the class to **Cancelled** or **Time changed**, add a
plain-language note, and families see a badge on that class.

---

## 3. Events → *Admin → Events*

**The Events screen is empty on purpose.** The website describes camps, parties and
tournaments but publishes no dates, and inventing a belt-test date is exactly the kind of
thing a parent would plan around. Nothing goes in until you add it.

- [ ] **Belt testing dates** — testing is quarterly (March, June, September, December);
      the app needs the actual dates and times
- [ ] **Summer camp dates** and how to book
- [ ] **Tournament and demo team dates**
- [ ] **Mom & Me / Dad & Me** Saturdays
- [ ] **Parents Night Out**, the Halloween party, the holiday potluck
- [ ] For each: location, who it is for, and a registration or waiver link if there is one

Every event gets an **Add to calendar** button and a **Directions** button automatically.

---

## 4. Learning resources → *Admin → Learning resources*

The **Curriculum videos** and **Binder & documents** sections are empty. They will stay
empty until LMAA supplies real material — no martial arts instruction has been written by
the app.

- [ ] **Curriculum videos** — YouTube or Vimeo links, one per form/technique, tagged with
      the program and belt level. **LMAA must own the video or have permission to use it.**
- [ ] **The student binder** (PDF) and any terminology sheets or printable handouts
- [ ] Any parent guides or at-home practice sheets

---

## 5. Photo gallery → *Admin → Photo gallery*

**Empty on purpose.** Photographs of students are the one thing the app will never source
for you.

- [ ] Photos LMAA owns, with **written confirmation** that everyone shown (or their parent
      or guardian, for anyone under 18) has agreed to the photo being used in the app
- [ ] A caption and photo credit for each

---

## 6. Privacy policy → *Admin → Information pages → Privacy Policy*

- [ ] **The privacy policy is a draft and is marked as such in the app.** It must be read
      and approved by LMAA before launch. It currently states, accurately, that the app
      collects no student or child information, requires no account, and stores read marks
      only on the family's own device. If that changes — especially if push notifications
      are switched on — the policy must be updated **before** the feature goes live.

---

## 7. Nice to have

- [ ] A short welcome message from Master Lee to replace the app's own welcome update
- [ ] Facebook / YouTube / TikTok links, if the academy uses them (Instagram is already in)
- [ ] Confirmation of which staff should have **Administrator** access and which should be
      **Editors** (see `SUPABASE_SETUP.md` — accounts are created by the owner, there is no
      public sign-up)
