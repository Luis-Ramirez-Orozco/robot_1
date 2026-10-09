---
name: flashlight-hero-and-booking-calendar
description: Two reusable patterns for small-business static HTML sites built with no build tooling and Tailwind via CDN (the "Website Design Recreation" project style - single-file pages, no npm, no framework). (1) A self-contained, two-file booking-calendar popup (calendar.js + calendar.css) with a date grid (weekday/weekend pricing, past dates disabled), an add-ons step, a phone-number step, and a thank-you confirmation, submitted via a mailto: link so it works with zero backend. Drop it into any page by linking the two files and adding one element with id="book-now-link" - no HTML markup to copy/paste or keep in sync. (2) A WebGL "flashlight reveal" interactive hero: a drifting shader-wall canvas with a cursor-reactive spotlight, and DOM text/photo on top that is masked in lockstep with that same light position so they're "revealed" by it, plus an optional strobe effect and a background-removal workflow for prepping a cutout photo. Use this skill whenever building or extending a static-HTML small-business site (restaurants, event performers, local services, etc.) that needs a booking/contact modal, an interactive cursor-driven hero, or a photo spotlight/reveal effect - reach for the bundled calendar.js/calendar.css first rather than building a booking flow from scratch, and reuse the flashlight-hero technique (with its gotchas below) rather than re-deriving the masking math.
---

# Flashlight hero + booking calendar

Built for `robot_1`, a one-person entertainment business's static site (no
React, no bundler - just HTML files, Tailwind via the CDN `<script>` tag, and
plain `<script>` blocks). Both patterns below assume that same environment:
if the target project already has a real frontend framework and build step,
port the *ideas* (especially the gotchas) rather than copying the files
verbatim.

## Part 1: Booking calendar popup (drop-in, 2 files)

**Files:** `assets/calendar.js`, `assets/calendar.css` - copy both into the
project root (or wherever static assets live) unmodified to start.

**To add it to any page:**
```html
<link rel="stylesheet" href="calendar.css" />
...
<a href="#" id="book-now-link">Book Now</a>
...
<script src="calendar.js"></script>
```
That's the whole integration. `calendar.js` waits for `DOMContentLoaded`,
searches the page for `#book-now-link`, and if found, builds all four modals'
markup into `document.body` itself and wires up every event handler. If the
page has no `#book-now-link`, `calendar.js` does nothing and costs nothing -
so it's safe to include on every page of a multi-page site even if only some
of them have a booking button.

### Why it's built this way

- **No HTML to duplicate.** Early iterations of this had the modal markup
  hand-written in every page's HTML, which meant editing N files every time
  the modal changed. Moving the markup generation into `calendar.js` (template
  strings + `innerHTML`) means every page that links the two files gets
  identical, always-in-sync behavior for free.
- **Four stacked overlays, not one modal with steps.** Calendar -> Add-ons ->
  Phone -> Thank-you are each their own `.calendar-overlay` div, built by
  `buildCalendarModal()` / `buildAddonsModal()` / `buildPhoneModal()` /
  `buildThankYouModal()`. Opening a later step doesn't close the earlier one -
  it stacks on top (z-index 100 -> 110 -> 110 -> 120 in `calendar.css`), so the
  calendar/add-ons stay visibly present (dimmed by the next overlay's own
  backdrop) underneath. This reads as "drilling into" the flow rather than a
  jarring full replace, and it means each step's close button/Escape/backdrop-
  click only ever closes *that* step, revealing what was behind it.
- **One shared "what's on top" check for Escape**, instead of adding/removing
  a keydown listener per overlay (an earlier version did that and had a bug:
  closing the calendar also tore down the listener needed for the *next*
  overlay that was about to open). `onGlobalKeydown` is attached once and
  always checks `thankYouOverlay -> phoneOverlay -> addonsOverlay -> overlay`
  in that order to find whichever is actually open.
- **No backend, so submission is a `mailto:` link.** `buildMailto()`
  constructs a fully pre-filled `mailto:OWNER_EMAIL?subject=...&body=...` URL
  (date, price, add-ons with prices, total, customer phone) and the Send
  button does `window.location.href = thatUrl`. This opens the *visitor's*
  email client with everything ready to send - they still click send on
  their end. That's a real, worth-stating limitation: there is no way to
  silently auto-send an SMS or email from pure client-side static-site code
  without a backend/third-party service (e.g. Formspree for email, Twilio for
  SMS - both need a secret API key that can't live in client JS). If a future
  project needs guaranteed, visitor-effort-free delivery, that's a different,
  bigger conversation to have with the user - don't silently assume mailto is
  "good enough" for every case.
- **Focus management**: every `openX()` stores `document.activeElement` before
  opening, every `closeX()` restores focus to it. Keeps keyboard/screen-reader
  users from losing their place.

### Making it yours

Three constants at the top of `calendar.js` are the only things a new project
should need to touch:
```js
var OWNER_EMAIL = "contactramirezl@gmail.com";   // mailto destination
var WEEKDAY_PRICE = 450;
var WEEKEND_PRICE = 499;                         // Sat/Sun pricing
var ADDONS = [                                   // id/label/price rows
  { id: "extra-hour", label: "Extra Performer Hour", price: 150 },
  ...
];
```
Never guess a real owner/business email - ask the user, since getting it
wrong means every inquiry silently goes nowhere. Placeholder dollar amounts
and add-on names are lower-stakes and fine to draft and show the user rather
than blocking on asking first.

## Part 2: Flashlight-reveal hero

A dark wall that visitors can only read/see through a cursor-controlled
spotlight (with an idle "wandering" light when the mouse isn't over it). See
`references/flashlight-shader.md` for the full GLSL source - read it before
wiring this up, don't try to rewrite the shader from scratch.

### The three layers, bottom to top

1. **`<canvas>`** - a single fullscreen WebGL1 triangle running the shader.
   The shader *is* the wall: a drifting colorful blob field with grain and a
   built-in brightened "spotlight" circle wherever the cursor uniform says to
   put it (cursor effect mode 4 - see the cheat sheet in the reference doc).
2. **DOM content on top** (headline text, a photo) - each masked with
   `mask-image: radial-gradient(circle Rpx at Xpx Ypx, rgba(0,0,0,A) 0%, ...)`
   recomputed every animation frame in JS to match the *same* light position
   the shader just drew, so the text/photo light up exactly where the shader's
   spotlight is.
3. **Nav / UI chrome** - not masked, always fully visible, `position:
   absolute` with a real `z-index` above the canvas.

### The critical gotcha: mask coordinate space

The light's position is naturally computed in canvas-space (pixels relative
to the canvas's own top-left corner). But `mask-image`'s radial-gradient
position is resolved **relative to the element it's applied to**, not the
canvas or the page. If the masked element (say, the headline `<p>`) sits
anywhere other than exactly at the canvas's top-left corner - which it always
does, since it's centered/offset by flexbox - using the raw canvas-space
coordinates makes the "lit" spot drift away from the actual cursor position by
however far that element is offset from the canvas origin. This is an easy
bug to ship because it often looks *approximately* right in a quick glance
and only becomes obviously wrong once you deliberately hover right over the
text and watch the light miss it.

The fix, from `index.html`'s draw loop:
```js
var canvasRect = canvas.getBoundingClientRect();
var textRect = content.getBoundingClientRect();
var mask = lightMask(
  cx - (textRect.left - canvasRect.left),
  cy - (textRect.top - canvasRect.top),
  radiusPx, presence, s.ghost
);
```
Do this conversion separately for **every** masked element (the text and the
photo each got their own `getBoundingClientRect()` call and their own mask
string) - they're not interchangeable since each has a different offset from
the canvas.

### Idle wandering + the strobe effect

- When the pointer isn't over the canvas, the light doesn't just sit still -
  `wanderAt(t)` returns a slow Lissajous-ish path (`0.62*sin(t*0.37)`,
  `0.5*sin(t*0.53+1.3)`) so the wall stays visually alive.
- The photo additionally has a "strobe": `strobePulse(t)` is a hand-authored
  piecewise-linear function (stops defined as `[phaseFraction, value]` pairs)
  evaluated in JS every frame, *not* a CSS `@keyframes` animation. The reason
  it has to be computed in JS rather than CSS is that the **same number**
  needs to do two things at once: drive a glow div's `opacity` directly, and
  also get passed into that photo's mask-image call as the `ghost` (reveal
  floor) argument. CSS keyframes can't hand a live animated value to a JS
  function on every frame; computing the pulse in the same `draw()` loop that
  already runs every frame means one number cleanly drives both. This is what
  lets a strobe flash "expose" the photo through its own mask independent of
  where the mouse currently is.

### Accessibility: `prefers-reduced-motion`

Checked once at load and on a `matchMedia` change listener. When reduced:
the shader's `time`/`roam` clocks stop advancing, the light eases toward
dead-center instead of continuing to wander, and the strobe pulse is replaced
with a constant mid-value instead of cycling. Don't skip this - it's a few
lines and the alternative is an unstoppable flashing animation for users who
explicitly asked their OS not to show them that.

### Prepping a photo: background removal without a GUI

No image-editing GUI was available, so this used a one-shot Python script
with `rembg` (and its `onnxruntime` dependency), run once in a throwaway venv:
```bash
python3 -m venv /tmp/scratch-venv
source /tmp/scratch-venv/bin/activate
pip install rembg onnxruntime
python3 - <<'EOF'
from rembg import remove
from PIL import Image

with open("source.jpg", "rb") as f:
    out = remove(f.read())
with open("cutout.png", "wb") as f:
    f.write(out)

img = Image.open("cutout.png")
bbox = img.getbbox()          # auto-crop to the actual subject,
if bbox:                      # not the full original canvas size
    img.crop(bbox).save("cutout.png")
EOF
```
`rembg`'s first run downloads a ~170MB model file (`u2net.onnx`) to
`~/.u2net/` - that's normal, not a hang; let it finish once and subsequent
runs are fast. **Never delete a user's original source photo after
processing it** - this project did that once by accident (ran the cutout,
then cleaned up what looked like scratch files but was actually the user's
only copy) and had to apologize; always write the processed output to a new
filename and leave the original alone.

## What NOT to copy as-is

- `OWNER_EMAIL`, the `ADDONS` list, and the weekday/weekend prices in
  `calendar.js` are this specific business's data - always confirm these with
  whoever owns the new project rather than inventing/reusing the sample
  values.
- The shader's color palette, the headline copy, and the photo are this
  project's brand - swap them, don't inherit the pink/dark robot aesthetic
  unless that's actually wanted again.
