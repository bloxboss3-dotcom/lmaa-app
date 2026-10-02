# Launch kit

Everything needed to get the LMAA Family App onto families' phones, in the order to do
it, with honest time estimates. Written for the academy owner, not a developer.

**The app is already live:** <https://bloxboss3-dotcom.github.io/lmaa-app/>

**The door poster is already printable:**
<https://bloxboss3-dotcom.github.io/lmaa-app/launch/poster.html> — open it on any
computer and press Print. Letter size, brand colours, a QR code that opens the app.

---

## The honest state of things

|                                                                      | Works today | Needs the database connected  |
| -------------------------------------------------------------------- | ----------- | ----------------------------- |
| Timetable, programs, FAQs, tenets, belts, contact, Call / Directions | ✅          |                               |
| "My classes" and calendar subscription (saved on the family's phone) | ✅          |                               |
| Add to Home Screen, works offline                                    | ✅          |                               |
| Admin changes that **every family sees**                             |             | ⏳ ~45 min, once              |
| Push notifications                                                   |             | ⏳ +20 min after the database |
| Staff accounts (editor / administrator)                              |             | ⏳ comes with the database    |

Right now the admin area saves to **one browser only**. That is deliberate — it lets
anyone try the tools with zero setup — but it means the single most important job is
Phase 1 below. Until then, treat the app as a read-only timetable for families.

---

## Phase 0 — Today, 15 minutes, no setup

1. Open the link on your own phone. Add it to your Home Screen
   (iPhone: Share → Add to Home Screen; Android: ⋮ → Add to Home screen).
2. Open **Schedule** and check every class against the whiteboard. It was transcribed
   from your website; if the website is stale, the app is stale the same way.
3. Tap the ★ on a class. Go back to Home — it now shows your next class first.
4. In Schedule, tap **Add my classes to calendar**. That is what a parent will do.
5. Print the poster and tape it to the door at eye height, next to the schedule.

If anything in step 2 is wrong, write it down — you fix it in Phase 3, in the app.

## Phase 1 — Make it real: the database (one evening, ~45–60 min)

Follow **[SUPABASE_SETUP.md](SUPABASE_SETUP.md)** start to finish. It is free. In short:

1. Create a Supabase project (free tier).
2. Run the four files in `supabase/migrations/` in the SQL editor, then `supabase/seed.sql`
   so it starts with the same content the app shows today.
3. Create **your** account under Authentication → Users, then give it the `admin` role
   (the guide has the one-line SQL).
4. Add two repository variables on GitHub and re-run the deploy.
5. Sign in at `…/lmaa-app/#/admin`. From this moment, what you change is what families see.

**Do not skip the first-admin step.** There is no public sign-up by design, so the only
way in is the account you create.

## Phase 2 — Notifications (~20 min, after Phase 1)

Follow **[PUSH_NOTIFICATIONS_SETUP.md](PUSH_NOTIFICATIONS_SETUP.md)**. Generate a key
pair, deploy the sender, paste two values into GitHub. Test on your own phone before
telling anyone.

Two things to know before you promise families anything:

- **iPhone only receives notifications from a Home Screen app.** A Safari tab cannot.
  The poster and the app both say so.
- Families choose what they want: _class changes_, _events_, _academy news_. Send the
  cancellation to "class changes" and the potluck to "events" and people will keep them on.

## Phase 3 — Content pass (~30 min, in Admin)

- Fix anything from Phase 0 step 2 under **Class schedule**.
- Add the next **belt testing** date: Events → New event → tap the _Belt testing_
  template → set the date → publish. Do the same for anything else with a date.
- Rewrite or delete the **Welcome** update. A two-line welcome from Master Lee beats
  the app's own.
- Read the **Privacy Policy** page and approve it (it is marked as a draft until you do).
- Work through **[CONTENT_NEEDED.md](CONTENT_NEEDED.md)** — section 0 is a ten-minute
  confirm-what-we-took-from-your-website checklist.

## Phase 4 — Soft launch (one week)

- Instructors first. Everyone who teaches installs it and lives with it for a week.
- Then five families you know will tell you the truth. Ask them one question:
  _"What did you expect to find that wasn't there?"_
- Poster on the door. One Instagram story. Nothing else yet.

## Phase 5 — Launch to everyone

- Email every family (copy below). Mention it at the start of class for a week.
- Keep the old app running for **30 days** with a message pointing here, then turn it off.
- On launch day, send **one** notification: "The LMAA app is live — thanks for joining."

## Then: the weekly habit

- A cancellation or time change goes in **as soon as you know** — Class schedule →
  edit the class → _Cancelled_ or _Time changed_ → tick _also send a notification_.
- Belt testing dates a **month** ahead. Camps **six weeks** ahead.
- At most **one** "academy news" notification a week. People who get too many turn them
  off, and then you cannot reach them on the night it matters.

---

## Copy you can use

### Instagram caption

> Our own app is here 🥋 Class times, cancellations, belt testing and events — in your
> pocket, no account needed.
>
> Open the link in our bio, then add it to your Home Screen (iPhone: Share → Add to Home
> Screen). Turn on notifications and you'll hear about a cancelled class before you leave
> the house.
>
> #LMAA #Wilsonville #Taekwondo

### Email to families

> **Subject:** The LMAA Family App — class times and updates on your phone
>
> Hi everyone,
>
> We've built our own app for LMAA families. It has the weekly schedule, cancellations and
> time changes, belt testing dates, events, and the answers to the questions we get asked
> most. No account, no sign-up, nothing to buy.
>
> **Get it:** open https://bloxboss3-dotcom.github.io/lmaa-app/ on your phone.
>
> - iPhone: tap **Share**, then **Add to Home Screen**.
> - Android: tap the **⋮ menu**, then **Add to Home screen**.
>
> Two things worth doing straight away: tap the **★** on your classes so your next one
> shows first, and tap **Add my classes to calendar** in Schedule to put them in your phone's
> calendar for good.
>
> Then turn on notifications under **More → Notifications** — on iPhone that only works
> once the app is on your Home Screen.
>
> We'll keep the old app running until **[date, 30 days out]**, then switch it off.
>
> See you on the mat,
> Master Lee and the LMAA team

### Front desk, said out loud

> "We've got our own app now — the schedule, cancellations and testing dates all in one
> place. Scan the code on the door, then add it to your Home Screen. If you turn on
> notifications you'll hear about a cancelled class before you leave the house."

### Message in the old app

> We're moving to our own LMAA app. Everything you used here — schedule, updates, events —
> is there, plus notifications for cancellations. Get it at
> https://bloxboss3-dotcom.github.io/lmaa-app/ and add it to your Home Screen. This app
> switches off on **[date]**.

---

## What parents want, and what the app does about it

Research into activity and school apps points at the same short list every time, and
it is not the list the big martial-arts management platforms sell. Those platforms
([Kicksite, Spark, Zen Planner, MyStudio](https://www.bytomic.com/blogs/journal/top-7-membership-management-tools-for-martial-arts))
are built around billing, attendance and belt tracking — the owner's problems. Version
one of this app deliberately holds **no student data at all**, so those are out of scope
on purpose. What the parent actually touches is smaller and sharper:

| What parents say they want                                                                                                                                                                                                                                                                  | What the app does                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| A single source of truth for the schedule, synced to their own calendar ([family calendar apps](https://www.thebraggingmommy.com/10-best-family-calendar-apps-for-busy-parents-in-2026/), [parenting apps 2025](https://tinypal.com/blog/best-parenting-apps-for-tracking-schedules-2025/)) | **Add my classes to calendar** — a weekly repeating subscription, correct across daylight-saving, with one-off cancellations already removed |
| To be told proactively about schedule changes rather than discovering them ([teacher–parent communication apps](https://skoolroom.com/news/item/N0000MJ687XQL/the-ultimate-guide-to-teacher-parent-communication-apps-in-2025))                                                             | Push notifications with a dedicated **class changes** topic, sent from the same screen you cancel the class on                               |
| Only _their_ child's activities, not the whole organisation's                                                                                                                                                                                                                               | **My classes** — tap the star, and Home opens on your next class. Stored on the phone, never sent anywhere                                   |
| Not another account or password                                                                                                                                                                                                                                                             | No account, ever, for families                                                                                                               |
| Easy to pass on to another parent                                                                                                                                                                                                                                                           | **Share** on every update and event; **Invite a friend** sends the free-trial page                                                           |

On getting it installed: the research on PWAs is blunt that
[a QR code or link is a one-tap funnel where an app store is a five-step one](https://devinstance.net/blog/pwa-vs-mobile-app),
that [Safari never prompts to install so iPhone users need a pictured Share → Add guide](https://blog.michaelsam94.com/pwa-install-prompt-ux/),
and that [install banners convert better after a second visit than on the first](https://simicart.com/blog/pwa-add-to-home-screen/).
The poster, the install screen and the home-screen nudge each follow one of those.

---

## Decisions only you can make

- **A custom address** such as `app.leesmartialartsacademy.com` instead of the GitHub
  one. Optional; it looks more trustworthy on a poster. `GITHUB_PAGES_SETUP.md` covers it
  and the poster's QR code would need regenerating (`public/launch/qr.svg`).
- **Who is an administrator and who is an editor.** Editors change content;
  administrators also manage academy info, notifications and staff. One administrator
  besides you means nobody is ever locked out.
- **Whether the "two weeks free" offer belongs in a family app.** It is not in there
  today. If you want it, post it under Updates with an expiry date.
