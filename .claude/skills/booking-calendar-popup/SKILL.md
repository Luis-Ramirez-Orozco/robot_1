---
name: booking-calendar-popup
description: A self-contained, two-file booking-calendar popup (calendar.js + calendar.css) for static HTML sites with no build tooling (plain Tailwind-via-CDN pages, no npm/framework). Gives visitors a "Book Now" flow entirely in the browser - a date-picker modal (weekday/weekend pricing, past dates disabled), an image-card Add-ons picker with a live running total, a phone-number step, and a thank-you confirmation - then hands the whole booking off as a pre-filled mailto: link, so it needs zero backend or server code. Use this skill whenever a static small-business site (event performers, rentals, local services, photographers, etc.) needs a booking, reservation, or "contact us about a date" flow, or any popup/modal system that stacks multiple steps on top of each other. Reach for the bundled calendar.js/calendar.css first rather than hand-building a booking modal or a date picker from scratch - drop the two files in and add one element with id="book-now-link" and it works immediately.
---

# Booking calendar popup

A drop-in booking flow for a static HTML site: no React, no bundler, just two
files and one hook element. Built for an LED-robot entertainment business's
site (`robot_1`), but nothing about it is specific to that business beyond
the three config values called out below.

## Using it in a new project

1. Copy `assets/calendar.js` and `assets/calendar.css` into the project (next
   to the other static assets - wherever `index.html` etc. live).
2. On any page that should have a "Book Now" trigger:
   ```html
   <link rel="stylesheet" href="calendar.css" />
   ...
   <a href="#" id="book-now-link">Book Now</a>
   ...
   <script src="calendar.js"></script>
   ```
3. That's the whole integration. On `DOMContentLoaded`, the script looks for
   `#book-now-link`; if it's not on the page, `init()` returns immediately and
   nothing else happens — so the same two files can be linked on every page of
   a multi-page site (nav, footer, etc.) even if only some pages show the
   button, with no wasted work on the rest.

No HTML for the modals themselves needs to be written anywhere — `calendar.js`
builds all four steps' markup into `document.body` at runtime via template
strings. This was a deliberate choice after an earlier version had the modal
markup hand-copied into every page: changing anything about the flow meant
editing N files. Now there's exactly one place to change it.

## The four-step flow

Each step is its own `.calendar-overlay` div, built by its own
`buildXModal()` function, stacked on top of the previous one instead of
replacing it:

| Step | Overlay id | z-index | What it does |
|---|---|---|---|
| Calendar | `#calendar-overlay` | 100 | Month grid, weekday ($`WEEKDAY_PRICE`) vs weekend ($`WEEKEND_PRICE`) pricing shown per day, past dates disabled, "Add-ons" + "Inquire" buttons |
| Add-ons | `#addons-overlay` | 110 | Image cards (not a plain checklist) - see below - with a live running total |
| Phone | `#phone-overlay` | 110 | A single validated phone-number field |
| Thank-you | `#thankyou-overlay` | 120 | Confirmation message, then resets all state |

Stacking (rather than swapping one modal's contents) means opening Add-ons
doesn't tear down the Calendar step underneath it — closing Add-ons (via its
own close button, Escape, or clicking its own backdrop) just reveals the
Calendar step again, still showing whatever date was selected. This reads as
"drilling into" the flow instead of a jarring full replace.

**Escape handling** is one shared `onGlobalKeydown`, not a listener added and
removed per step. `topOpenOverlay()` checks `thankYou -> phone -> addons ->
calendar` in that order and closes whichever is actually open. (An earlier
version attached/detached a listener per `openX()`/`closeX()` call and had a
real bug: closing the Calendar step also tore down the listener the *next*
step needed.) Add a fifth step the same way other steps are checked first, in
front of the ones it can stack on top of.

**Focus management**: every `openX()` stores `document.activeElement` first;
every `closeX()` restores it. Don't skip this when adding a step - it's what
keeps keyboard and screen-reader users from losing their place when a step
closes.

## Add-ons are image cards, not a checklist

`ADDONS` entries each carry an `img` field, and `buildAddonsModal()` renders
a 2-column grid of `<label class="addon-card">` cards: photo on top, label +
price below, with the actual `<input type="checkbox">` tucked into the
card's corner. Clicking anywhere on the card toggles it (the `<label>` wraps
the checkbox, so this needs no extra JS). The selected-state highlight (a
bright border) is pure CSS:
```css
.addon-card:has(.addons-checkbox:checked) {
  border-color: #ececec;
}
```
`:has()` is well-supported in current Chrome/Safari/Firefox; if a target
browser matrix needs to go further back than that, fall back to a `change`
listener on each checkbox toggling a class on its parent `.addon-card`
instead, and keep everything else about this flow the same.

If the real add-on photos aren't ready yet, ask before inventing permanent
answers for `OWNER_EMAIL`/prices (below) - but it's fine to pull real,
free-to-use stock photos as a starting point for the images themselves
(Pexels/Pixabay doesn't need attribution; Wikimedia Commons file pages have
a stable direct-download URL at `Special:FilePath/<filename>`). Two things
to get right when doing that:
- Avoid photos of identifiable real strangers in candid (non-stock) shots —
  a Wikimedia Commons photo of an actual wedding, for instance, raises
  personality-rights concerns beyond copyright when it's reused to advertise
  an unrelated business. Stock sites with model releases (Pexels, Pixabay)
  don't have this problem.
- Resize large photos before using them (see below) - a phone photo straight
  off a camera is massively oversized for a small card thumbnail.

## Submission is a mailto: link - know what that does and doesn't do

There's no backend, so `buildMailto()` constructs a fully pre-filled
`mailto:OWNER_EMAIL?subject=...&body=...` URL (date, date price, each add-on
with its price, add-ons total, grand total, and the customer's phone number)
and the Send button does `window.location.href = thatUrl`. This opens the
**visitor's** email client with everything ready to go - they still have to
click send on their end.

This is a real, worth-stating limitation, not a detail to gloss over: there
is no way to silently auto-send an SMS or email from pure client-side static
code. A true zero-effort-for-the-visitor send needs a backend or third-party
service (Formspree for email, Twilio for SMS), and those need a secret API
key that can't live in client-side JS. If a project needs guaranteed,
no-visitor-action delivery, that's a bigger, separate conversation to have
with whoever owns the site - don't quietly assume mailto is "good enough."

## Config: the only three things to change per project

```js
var OWNER_EMAIL = "contactramirezl@gmail.com";   // mailto destination
var WEEKDAY_PRICE = 450;
var WEEKEND_PRICE = 499;
var ADDONS = [                                   // id / label / price / img
  { id: "co2-cannon", label: "CO2 Cannon", price: 100, img: "images/addons/web/co2-cannon.jpg" },
  ...
];
```
**Never guess a real business's owner email.** Getting it wrong means every
inquiry silently vanishes with no error anywhere - always ask. Placeholder
add-on names/prices are lower-stakes and fine to draft and show for
feedback rather than blocking on asking first.

## Keep large images out of calendar.js's direct reach

Add-on and gallery photos pulled from a phone or a stock site are routinely
multi-megabyte at full camera/stock resolution - much too large for a card
thumbnail shown at a couple hundred pixels wide. The pattern used throughout
this project: resize into a sibling `web/` folder and point `img`/`src` at
the resized copy, leaving the original untouched:
```bash
mkdir -p images/addons/web
sips -Z 700 images/addons/some-photo.jpg --out images/addons/web/some-photo.jpg
```
(`sips` is a macOS built-in; use any equivalent resizer on other platforms.)
**Never resize/overwrite a user-provided original in place**, and never
delete what looks like a leftover/duplicate file without asking first - this
project did exactly that once by mistake (cleaned up what looked like a
scratch file but was the user's only copy of a source photo) and had to
apologize for it.
