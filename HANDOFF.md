# Handoff

Picking this up cold? Read in this order:

1. **This file** — where things stand, how to run it, what's verified, what isn't.
2. **[README.md](README.md)** — architecture, stylesheet order, fonts, nav behaviour.
3. **[DESIGN.md](DESIGN.md)** — the measured spec for capella.edu. Every number in
   it was read off the rendered live page or out of Capella's own stylesheets, not
   guessed. **Match it when adding anything.**

Repo: <https://github.com/camila-go/CU-Homepage-BottomSheetApp> (`origin`, SSH).

---

## ⚠️ Read this before deploying anything

The application sheet reproduces the real Capella application's **date of birth**,
**last-four-SSN** and **password** fields.

- There is **no form action, no endpoint and no storage**. Nothing is submitted or
  persisted. Every input carries `autocomplete="off"`.
- **Do not deploy this publicly, and do not type real personal data into it.**
- If a backend is ever added, revisit steps 3, 4, 5 and 9 *first* — before wiring
  anything else up.

This is flagged in the markup, in `js/sheet.js`, in `DESIGN.md` and in
`tools/review-steps.html`. Keep it flagged.

---

## Status

| Area | State |
| --- | --- |
| Six homepage bands, header, footer, mobile action bar | Built and diffed against the live site |
| Application sheet — all 10 steps | Ported, including the 4 conditional ones |
| Sheet field states + validation | Read out of the live AEM theme, rule-based per field |
| Floating labels | Live's jvFloat pattern, reproduced from measured offsets |
| Apply triggers | All 5 wired and verified |
| Edge cases | 71 automated checks, all passing |
| Accessibility | Hand-written audit run; 3 issues found and fixed, 1 inherited issue outstanding |

Nothing is uncommitted. Everything described here is on `origin/main`.

---

## Running it

**There is no Node on this machine**, so `npm run dev` will not work. The preview
is a flattened copy served by Python, registered as `cu-bottomsheet` on port 4180.

⚠️ The launch config the Browser pane actually reads is the **working-directory**
one at `/Users/camila.gonzalez/Documents/Code/.claude/launch.json`, *not* the
per-project `.claude/launch.json`. Both exist; editing only the project one has no
effect.

To (re)build the preview copy from source:

```bash
D=/tmp/cu-bottomsheet-preview && rm -rf $D && mkdir -p $D && cp -R index.html css js tools $D/ && cp -R public/assets $D/assets
```

⚠️ **Editing source does not update that copy.** Re-copy the files you changed, or
you will spend an hour verifying against a stale build. This has bitten every
session:

```bash
cp css/sheet.css js/sheet.js index.html /tmp/cu-bottomsheet-preview/
```

With Node installed, none of this is needed — `npm install && npm run dev`.

### Cache-busting after an edit

ES modules and CSS cache hard in the pane. Force a refetch, then reload:

```js
await fetch('/css/sheet.css', { cache: 'reload' }); location.replace('/');
```

⚠️ `/index.html` and `/` are cached **separately**. Refetching `/index.html` does
not refresh the page you are looking at — refetch `/` itself, or reload with a
throwaway query string.

---

## Edge cases

**`tools/edge-cases.js`** — 71 checks. Paste the file into the console on the
homepage and call `__edgeCases()`, or load it with a `<script>` tag:

```js
const x = new XMLHttpRequest(); x.open('GET', '/tools/edge-cases.js', false); x.send(null); (0, eval)(x.responseText); __edgeCases();
```

Returns `{ total, failing, failures, all }`. Last run: **71 total, 0 failing.**

Covered, grouped:

| Group | Examples |
| --- | --- |
| Required fields | whitespace-only input rejected; a failed step does not advance |
| Date of birth | leap day accepted; `02/29/2023`, `02/31/1990`, month 13, future dates, unpadded and ISO forms rejected |
| SSN last four | `0000` accepted as legitimate; too short, too long, non-digits rejected |
| No-SSN alternative | ticking satisfies the step and disables the field; **unticking restores the requirement** |
| Email | `a@b.co` accepted; single-char TLD, interior space, double `@`, no `@` rejected |
| Password | exact 8 and 15 char boundaries accepted, 7 and 16 rejected; each missing character class rejected; the message names the unmet rules |
| Error lifecycle | errors clear on input, not on blur |
| Value echo | greeting echoes and re-echoes after an edit; empty name falls back to "there" |
| Untrusted input | `<img src=x onerror=...>` in a name is inserted as text, not parsed |
| Overflow | a 100-char name neither widens the sheet nor scrolls the page sideways |
| Reopening | returns to step 1; floated labels re-sync (values persist across a close) |
| Review hooks | `__sheetGoTo` refuses `99`, `0`, `"abc"`, `2.5`; accepts `"7"` |
| Dismissal | Escape, scrim click; a click inside does not close; body scroll locked and released |
| Focus trap | Tab wraps last→first, Shift+Tab wraps first→last |
| Apply triggers | all 5 marked, none unwired, each opens at step 1 |
| Hero finder | progressive reveal; **switching area clears a stale specialisation**; switching degree level clears both; exactly one chip selected |
| Select overflow | ellipsis not clip; text area stops at or before the chevron |

### ⚠️ The suite is deliberately synchronous

No `await`, no `setTimeout`, no `requestAnimationFrame`. The Browser pane degrades
over a long session — synthetic clicks stop being delivered, then rAF stops firing,
then timers do. A suite built on any of those *hangs* instead of failing, which is
worse than useless. Everything drives the app with `dispatchEvent` and reads state
back in the same tick, so it runs even in a stalled pane.

The price: it disables transitions and force-opens the sheet, so it cannot assert
on anything animated. **Not covered — do these by hand on a healthy browser:**

- The slide in/out animations, and that `transitionend` fires so the sheet ends up
  `hidden`.
- Real pointer input. The suite dispatches events, so it cannot catch a control
  that is covered by something else and unclickable in practice.
- `:hover` and `:focus-visible` appearance. `:focus` does not even *match* while
  the pane is not the active window, so focus rings must be eyeballed.
- Resizing across 768px **while the sheet is open**, where the transform swaps
  from `translateY` to `translateX`.
- Screen-reader announcement order (see below).

---

## Accessibility

### ⚠️ What kind of scan this was

A **hand-written audit**, not axe-core, Lighthouse or WAVE. There is no Node here
to run them, and the pane's CSP/network state made injecting a scanner from a CDN
unreliable. So this checked a specific list — it is not a substitute for a real
scanner plus a screen-reader pass, and it cannot claim WCAG conformance.

Checked: `lang`, `title`, zoomable viewport, duplicate ids, `alt` on every image,
accessible name on every interactive element, heading levels and order, landmarks,
bypass block, positive `tabindex`, dialog semantics, focusable-but-invisible
elements, inert `aria-label`s, `aria-expanded`/`aria-controls` integrity,
reduced-motion support, text contrast, and non-text (component boundary) contrast.

### Clean

- `lang="en"`, a page title, and a viewport that permits zoom (no `maximum-scale`).
- **No duplicate ids** across 62 files' worth of markup.
- **All 37 images have `alt`**; 17 are correctly `alt=""` decorative.
- **Every interactive element has an accessible name** — 0 unnamed.
- One `h1`, 35 headings, **no skipped levels**.
- **No positive `tabindex`** anywhere.
- Dialog semantics correct: `role="dialog"`, `aria-modal="true"`,
  `aria-labelledby` pointing at a real element, `hidden` when closed. The
  per-step title stays in the DOM visually hidden precisely so the dialog keeps
  announcing which step you are on — the Capella logo alone would announce nothing.
- **No focusable-but-invisible elements** (0). Nothing hidden by `opacity: 0` or
  `visibility: hidden` sits in the tab order — the classic keyboard trap.
- All 5 `aria-expanded` disclosures resolve their `aria-controls` to a real id.
- **4 of our own `prefers-reduced-motion` blocks** (`nav.css` ×2, `footer.css`,
  `sheet.css`); the sheet skips its transition entirely. A 5th shows up at runtime
  from Font Awesome's injected stylesheet — not ours. ⚠️ `main.css` declares none,
  so the six bands and the hero finder have not been audited for motion.
- **Text contrast: 0 failures.** Tightest passing pairs are the red error text and
  red invalid-field text at **4.85:1** (needs 4.5), then `#696f74` fine print at
  **5.09:1**. The `#666` placeholder and floating label are 5.74:1.
- The duplicate `<header>`/`<footer>` are scoped inside `<section class="sheet">`,
  so they are *not* competing banner/contentinfo landmarks.

### Fixed this pass

1. **No bypass block** (WCAG 2.4.1, level A). The header has four megamenu
   triggers and the rendered page has 152 links, so a keyboard user tabbed the
   whole nav before reaching content. Added a skip link — now first in tab order, pointing
   at `<main id="main-content">`. ⚠️ It is positioned off-canvas by `transform`,
   **not** `display: none` or `visibility: hidden`, either of which would make it
   unfocusable and defeat the point.
2. **`.action-bar__btn` had no focus style at all** (WCAG 2.4.7) — the only
   interactive component on the page missing one. Added an *inset* ring: the bar is
   flush to the viewport edges, so an outset ring gets clipped on three sides.
3. **`aria-label="Quick actions"` sat on a bare `<div>`**, where it is inert —
   the bar had a label nothing could announce. Added `role="group"`.

### Outstanding — inherited from the live design

**Input and checkbox borders are `#b4b4b4` on white = 2.07:1**, against the 3:1
that WCAG 1.4.11 requires for the boundary of a UI component. This affects every
field in the application sheet.

It is **not** left in by oversight: `#b4b4b4` is the live application's own value,
and this build's whole premise is matching the live site. Changing it unilaterally
would put the prototype out of step with the thing it exists to mirror.

If the call is to fix it, **`#949494` is the lightest grey that clears 3:1**
(3.03:1) — a small enough shift to keep the fields looking the same. That is a
design decision for Capella, not a code change to make quietly.

*(A `#d9d9d6` divider at 1.41:1 also turned up, but dividers are decorative, not
component boundaries — 1.4.11 does not apply. Noting it so nobody re-reports it.)*

### Still needs a human

- **A real screen reader.** The aria wiring is asserted structurally; only VoiceOver
  or NVDA shows what someone actually hears — particularly the step transitions and
  whether the `role="alert"` error messages fire at a useful moment.
- **Text over the hero photograph.** The contrast scan resolves a background from
  computed styles, which cannot judge text sitting on an image. Needs an eyedropper
  against the actual pixels, at both the desktop `background-image` crop and the
  mobile `<img>`.
- **Focus visibility, eyeballed.** See the suite's limitation above.
- **Zoom to 400%** and a 320px-wide viewport (WCAG 1.4.10 reflow) — untested.

---

## Known gaps and next steps

- **Links go nowhere.** 148 of the 152 rendered links are `href="#"`. Only layout
  and nav behaviour are real.
- **The step titles are mine, not Capella's.** `STEP_TITLE` in `js/sheet.js`
  ("Your name", "Verify birthdate", …) is invented copy, announced to assistive
  tech only. It has never been reviewed by anyone at Capella. Worth replacing with
  approved wording.
- **The error messages are also mine**, deliberately — the live AEM
  `mandatoryMessage` strings are presence-only ("Please enter date of birth!", and
  literally "Please enter Enter last 4 digits of SSN." with the doubled "Enter")
  and cannot explain *why* a malformed value was rejected. Documented in DESIGN.md.
- **The drag handle is decorative.** It looks like the sheet can be dragged; it
  cannot. Either implement the drag or reconsider the affordance.
- **No build has ever been run.** `package.json` declares Vite but it has never
  been installed here, so `npm run build` is unproven. The paths assume Vite's
  runtime behaviour of serving `public/assets` at `/assets`.
- **`css/nav.css` is ~1000 lines of the old dark prototype skin**, re-painted by
  `nav-live.css` rather than rewritten. Intentional (see README), but it is dead
  weight if the prototype look is never needed again.

---

## Environment traps

Every one of these cost real time. They look like application bugs and are not.

- **The Browser pane degrades over a long session.** Synthetic clicks stop being
  delivered (`left_click` times out having dispatched nothing — in a fresh tab
  too), then `requestAnimationFrame` stops firing, then `setTimeout`. Reload or
  restart the pane; do not debug the app.
- **A hidden pane freezes CSS transitions at their start value**, so
  `getComputedStyle` never reports the target and `transitionend` never fires. To
  measure a transitioned property, inject
  `* { transition: none !important }` first, then read.
- **`CSSStyleRule` exposes a truthy but empty `cssRules`**, so
  `if (r.cssRules) { recurse; continue }` silently skips every style rule when
  walking a stylesheet. Check `r.selectorText` first.
- **ES modules and CSS cache hard**; `/` and `/index.html` cache separately.
- **`focus()` is a silent no-op** on an element that is `visibility: hidden` or
  inside a closed menu — *even when it still reports an `offsetParent`*. Never
  assume focus took; check `document.activeElement` after.
- **`:focus` does not match while the pane is not the active window**, so focus
  styling cannot be verified by scripting focus. Read the cascade, or click for
  real.
- **`display: inline-flex` beats the UA's `[hidden] { display: none }`.** Bit us
  twice — `.sheet__action` and `.hero__field` both needed an explicit
  `[hidden] { display: none }`.
- **Sampling live capella.edu:** it ships duplicate desktop/mobile copies of
  several controls. The hidden one reports different values. Sample the element
  with a non-zero bounding box, or use `elementFromPoint`.
- **Page-level inline `<style>` blocks override linked CSS with `!important`** on
  capella.edu. Reading only the linked stylesheets got the Make-your-move tiles
  wrong. Check inline blocks too.
